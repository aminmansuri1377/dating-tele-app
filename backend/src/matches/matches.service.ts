import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TelegramNotifierService } from './telegram-notifier.service';

@Injectable()
export class MatchesService {
  constructor(private prisma: PrismaService, private notifier: TelegramNotifierService) {}

  /** userAId is always stored as the lexicographically-smaller id to keep the unique constraint stable */
  private orderIds(a: string, b: string): [string, string] {
    return a < b ? [a, b] : [b, a];
  }

  async createMatch(userId1: string, userId2: string) {
    const [userAId, userBId] = this.orderIds(userId1, userId2);

    const match = await this.prisma.match.upsert({
      where: { userAId_userBId: { userAId, userBId } },
      create: { userAId, userBId },
      update: { isActive: true },
      include: {
        userA: { include: { profile: true } },
        userB: { include: { profile: true } },
      },
    });

    // Fire-and-forget Telegram push notifications to both users
    this.notifier.notifyMatch(match.userA, match.userB).catch(() => undefined);

    return match;
  }

  async getMyMatches(userId: string) {
    return this.prisma.match.findMany({
      where: { OR: [{ userAId: userId }, { userBId: userId }], isActive: true },
      include: {
        userA: { include: { profile: true, photos: { take: 1, orderBy: { position: 'asc' } } } },
        userB: { include: { profile: true, photos: { take: 1, orderBy: { position: 'asc' } } } },
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async unmatch(userId: string, matchId: string) {
    const match = await this.prisma.match.findFirst({
      where: { id: matchId, OR: [{ userAId: userId }, { userBId: userId }] },
    });
    if (!match) return { unmatched: false };
    await this.prisma.match.update({ where: { id: matchId }, data: { isActive: false } });
    return { unmatched: true };
  }
}
