import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpsertProfileDto } from './dto/upsert-profile.dto';

@Injectable()
export class ProfilesService {
  constructor(private prisma: PrismaService) {}

  async getMyProfile(userId: string) {
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            languageCode: true,
            photos: {
              where: { isApproved: true },
              orderBy: { position: 'asc' },
              select: { id: true, url: true, position: true },
            },
          },
        },
      },
    });
    if (!profile) throw new NotFoundException('Profile not found');
    return profile;
  }

  async upsert(userId: string, dto: UpsertProfileDto) {
    const minAgePref = dto.minAgePref ?? 18;
    const maxAgePref = dto.maxAgePref ?? 99;
    if (minAgePref > maxAgePref) {
      throw new BadRequestException('Minimum preferred age cannot exceed maximum preferred age');
    }

    const isComplete = Boolean(dto.displayName?.trim() && dto.age && dto.gender && dto.datingGoal);

    return this.prisma.profile.upsert({
      where: { userId },
      create: { userId, ...dto, displayName: dto.displayName.trim(), isComplete },
      update: { ...dto, displayName: dto.displayName.trim(), isComplete },
    });
  }
}
