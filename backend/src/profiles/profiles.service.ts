import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpsertProfileDto } from './dto/upsert-profile.dto';

@Injectable()
export class ProfilesService {
  constructor(private prisma: PrismaService) {}

  async getMyProfile(userId: string) {
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
      include: { user: { include: { photos: { orderBy: { position: 'asc' } } } } },
    });
    if (!profile) throw new NotFoundException('Profile not found');
    return profile;
  }

  async upsert(userId: string, dto: UpsertProfileDto) {
    const isComplete = Boolean(dto.displayName && dto.age && dto.gender && dto.datingGoal);

    return this.prisma.profile.upsert({
      where: { userId },
      create: { userId, ...dto, isComplete },
      update: { ...dto, isComplete },
    });
  }
}
