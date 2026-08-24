import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { profile: true, photos: { orderBy: { position: 'asc' } } },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async blockUser(blockerId: string, blockedId: string) {
    await this.prisma.blockedUser.upsert({
      where: { blockerId_blockedId: { blockerId, blockedId } },
      create: { blockerId, blockedId },
      update: {},
    });
    // Deactivate any existing match between the two so chat closes immediately
    await this.prisma.match.updateMany({
      where: {
        OR: [
          { userAId: blockerId, userBId: blockedId },
          { userAId: blockedId, userBId: blockerId },
        ],
      },
      data: { isActive: false },
    });
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
    });
    return Boolean(record);
  }

  async hasActivePremium(userId: string): Promise<boolean> {
    const sub = await this.prisma.subscription.findFirst({
      where: { userId, status: 'ACTIVE', expiresAt: { gt: new Date() } },
    });
    return Boolean(sub);
  }
}
