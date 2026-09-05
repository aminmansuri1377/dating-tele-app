import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DeleteObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

const MAX_PHOTOS_PER_USER = 6;
const MAX_PHOTO_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

@Injectable()
export class PhotosService {
  private s3: S3Client;
  private bucket: string;
  private publicBaseUrl: string;

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
  ) {
    this.s3 = new S3Client({
      forcePathStyle: true,
      region: this.config.get<string>('S3_REGION') ?? 'eu-central-1',
      endpoint: this.config.get<string>('S3_ENDPOINT'),
      credentials: {
        accessKeyId: this.config.get<string>('S3_ACCESS_KEY_ID')!,
        secretAccessKey: this.config.get<string>('S3_SECRET_ACCESS_KEY')!,
      },
    });

    this.bucket = this.config.get<string>('S3_BUCKET')!;
    this.publicBaseUrl = this.config.get<string>('S3_PUBLIC_BASE_URL')!.replace(/\/$/, '');
  }

  async createUploadUrl(userId: string, contentType: string) {
    if (!ALLOWED_TYPES.includes(contentType)) {
      throw new BadRequestException('Unsupported image type');
    }

    const existingCount = await this.prisma.photo.count({ where: { userId } });
    if (existingCount >= MAX_PHOTOS_PER_USER) {
      throw new BadRequestException(`Maximum ${MAX_PHOTOS_PER_USER} photos allowed`);
    }

    const key = `profiles/${userId}/${randomUUID()}`;
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(this.s3, command, { expiresIn: 300 });

    return {
      uploadUrl,
      storageKey: key,
      publicUrl: `${this.publicBaseUrl}/${key}`,
      maxBytes: MAX_PHOTO_BYTES,
    };
  }

  async confirmUpload(userId: string, storageKey: string) {
    const expectedPrefix = `profiles/${userId}/`;
    if (!storageKey.startsWith(expectedPrefix) || storageKey.includes('..')) {
      throw new BadRequestException('Invalid storage key');
    }

    const [count, duplicate] = await Promise.all([
      this.prisma.photo.count({ where: { userId } }),
      this.prisma.photo.findFirst({ where: { userId, storageKey }, select: { id: true } }),
    ]);

    if (count >= MAX_PHOTOS_PER_USER) {
      throw new BadRequestException(`Maximum ${MAX_PHOTOS_PER_USER} photos allowed`);
    }
    if (duplicate) throw new BadRequestException('Photo already confirmed');

    let metadata;
    try {
      metadata = await this.s3.send(new HeadObjectCommand({ Bucket: this.bucket, Key: storageKey }));
    } catch {
      throw new BadRequestException('Uploaded file not found');
    }

    const contentType = metadata.ContentType ?? '';
    const contentLength = metadata.ContentLength ?? 0;
    if (!ALLOWED_TYPES.includes(contentType) || contentLength <= 0 || contentLength > MAX_PHOTO_BYTES) {
      await this.s3.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: storageKey })).catch(() => undefined);
      throw new BadRequestException('Invalid image file');
    }

    return this.prisma.photo.create({
      data: {
        userId,
        url: `${this.publicBaseUrl}/${storageKey}`,
        storageKey,
        position: count,
        isApproved: true,
      },
    });
  }

  async deletePhoto(userId: string, photoId: string) {
    const photo = await this.prisma.photo.findFirst({ where: { id: photoId, userId } });
    if (!photo) throw new BadRequestException('Photo not found');

    const expectedPrefix = `profiles/${userId}/`;
    if (!photo.storageKey.startsWith(expectedPrefix)) {
      throw new BadRequestException('Invalid photo ownership');
    }

    await this.s3.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: photo.storageKey }));
    await this.prisma.photo.delete({ where: { id: photoId } });

    return { deleted: true };
  }
}
