import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id, status: 'ACTIVE' },
      select: {
        id: true,
        firstName: true,
        languageCode: true,
        lastActiveAt: true,
        profile: true,
        photos: {
          where: { isApproved: true },
          orderBy: { position: 'asc' },
          select: { id: true, url: true, position: true },
        },
      },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async blockUser(blockerId: string, blockedId: string) {
    if (blockerId === blockedId) throw new BadRequestException('Cannot block yourself');

    const target = await this.prisma.user.findUnique({
      where: { id: blockedId },
      select: { id: true },
    });
    if (!target) throw new NotFoundException('User not found');

    await this.prisma.$transaction([
      this.prisma.blockedUser.upsert({
        where: { blockerId_blockedId: { blockerId, blockedId } },
        create: { blockerId, blockedId },
        update: {},
      }),
      this.prisma.match.updateMany({
        where: {
          OR: [
            { userAId: blockerId, userBId: blockedId },
            { userAId: blockedId, userBId: blockerId },
          ],
        },
        data: { isActive: false },
      }),
    ]);

    return { blocked: true };
  }

  async isBlocked(userAId: string, userBId: string): Promise<boolean> {
    const record = await this.prisma.blockedUser.findFirst({
      where: {
        OR: [
          { blockerId: userAId, blockedId: userBId },
          { blockerId: userBId, blockedId: userAId },
        ],
      },
      select: { id: true },
    });
    return Boolean(record);
  }

  async hasActivePremium(userId: string): Promise<boolean> {
    const sub = await this.prisma.subscription.findFirst({
      where: { userId, status: 'ACTIVE', expiresAt: { gt: new Date() } },
      select: { id: true },
    });
    return Boolean(sub);
  }
}
