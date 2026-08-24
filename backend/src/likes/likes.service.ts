import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { MatchesService } from '../matches/matches.service';
import { SwipeAction } from '@prisma/client';

const FREE_DAILY_SWIPES_MALE = 20;

@Injectable()
export class LikesService {
  constructor(
    private prisma: PrismaService,
    private usersService: UsersService,
    private matchesService: MatchesService,
  ) {}

  private todayUtc(): Date {
    const d = new Date();
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  }

  async swipe(fromUserId: string, toUserId: string, action: SwipeAction) {
    if (fromUserId === toUserId) throw new ForbiddenException('Cannot swipe on yourself');

    const [profile, isPremium] = await Promise.all([
      this.prisma.profile.findUnique({ where: { userId: fromUserId } }),
      this.usersService.hasActivePremium(fromUserId),
    ]);

    const isFreeMale = profile?.gender === 'MALE' && !isPremium;

    if (isFreeMale) {
      const usage = await this.prisma.dailyUsage.upsert({
        where: { userId_date: { userId: fromUserId, date: this.todayUtc() } },
        create: { userId: fromUserId, date: this.todayUtc(), swipeCount: 0 },
        update: {},
      });
      if (usage.swipeCount >= FREE_DAILY_SWIPES_MALE) {
        throw new ForbiddenException('Daily swipe limit reached. Upgrade to Premium for unlimited swipes.');
      }
      await this.prisma.dailyUsage.update({
        where: { userId_date: { userId: fromUserId, date: this.todayUtc() } },
        data: { swipeCount: { increment: 1 } },
      });
    }

    const like = await this.prisma.like.upsert({
      where: { fromUserId_toUserId: { fromUserId, toUserId } },
      create: { fromUserId, toUserId, action },
      update: { action },
    });

    let match = null;
    if (action === 'LIKE' || action === 'SUPER_LIKE') {
      const reciprocal = await this.prisma.like.findUnique({
        where: { fromUserId_toUserId: { fromUserId: toUserId, toUserId: fromUserId } },
      });
      if (reciprocal && (reciprocal.action === 'LIKE' || reciprocal.action === 'SUPER_LIKE')) {
        match = await this.matchesService.createMatch(fromUserId, toUserId);
      }
    }

    return { like, match };
  }

  /** Who liked me — gated behind Premium for free-tier male users (core monetization hook) */
  async getWhoLikedMe(userId: string) {
    const [profile, isPremium] = await Promise.all([
      this.prisma.profile.findUnique({ where: { userId } }),
      this.usersService.hasActivePremium(userId),
    ]);

    if (profile?.gender === 'MALE' && !isPremium) {
      throw new ForbiddenException('Upgrade to Premium to see who liked you.');
    }

    const likes = await this.prisma.like.findMany({
      where: { toUserId: userId, action: { in: ['LIKE', 'SUPER_LIKE'] } },
      include: { fromUser: { include: { profile: true, photos: { orderBy: { position: 'asc' }, take: 1 } } } },
      orderBy: { createdAt: 'desc' },
    });
    return likes;
  }
}
