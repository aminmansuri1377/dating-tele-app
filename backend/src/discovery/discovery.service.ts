import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';

const FREE_DAILY_SWIPES_MALE = 20; // free-tier male swipe cap; females unlimited (see below)

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

@Injectable()
export class DiscoveryService {
  constructor(private prisma: PrismaService, private usersService: UsersService) {}

  private todayUtc(): Date {
    const d = new Date();
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  }

  async getRemainingSwipes(userId: string): Promise<number | null> {
    const profile = await this.prisma.profile.findUnique({ where: { userId } });
    const isPremium = await this.usersService.hasActivePremium(userId);
    // Females and premium users: unlimited swipes (business model — see PRD)
    if (isPremium || profile?.gender === 'FEMALE') return null;

    const usage = await this.prisma.dailyUsage.findUnique({
      where: { userId_date: { userId, date: this.todayUtc() } },
    });
    return Math.max(0, FREE_DAILY_SWIPES_MALE - (usage?.swipeCount ?? 0));
  }

  /** Returns a batch of candidate profiles matching the user's discovery filters. */
  async getCandidates(userId: string, limit = 20) {
    const remaining = await this.getRemainingSwipes(userId);
    if (remaining === 0) {
      throw new ForbiddenException('Daily swipe limit reached. Upgrade to Premium for unlimited swipes.');
    }

    const myProfile = await this.prisma.profile.findUnique({ where: { userId } });
    if (!myProfile) throw new ForbiddenException('Complete your profile first');

    const genderFilter =
      myProfile.genderPref === 'EVERYONE' ? undefined : { gender: myProfile.genderPref as any };

    // Exclude: self, already-swiped, blocked (either direction)
    const [alreadySwiped, blockedByMe, blockedMe] = await Promise.all([
      this.prisma.like.findMany({ where: { fromUserId: userId }, select: { toUserId: true } }),
      this.prisma.blockedUser.findMany({ where: { blockerId: userId }, select: { blockedId: true } }),
      this.prisma.blockedUser.findMany({ where: { blockedId: userId }, select: { blockerId: true } }),
    ]);
    const excludeIds = new Set<string>([
      userId,
      ...alreadySwiped.map((l) => l.toUserId),
      ...blockedByMe.map((b) => b.blockedId),
      ...blockedMe.map((b) => b.blockerId),
    ]);

    const candidates = await this.prisma.profile.findMany({
      where: {
        userId: { notIn: Array.from(excludeIds) },
        isVisible: true,
        age: { gte: myProfile.minAgePref, lte: myProfile.maxAgePref },
        ...genderFilter,
        user: { status: 'ACTIVE' },
      },
      include: { user: { include: { photos: { orderBy: { position: 'asc' }, take: 6 } } } },
      // Premium "priority" profiles surface first
      orderBy: [{ isPriority: 'desc' }, { updatedAt: 'desc' }],
      take: limit * 3, // over-fetch, then filter by distance/interests in-memory
    });

    const scored = candidates
      .filter((c) => {
        if (myProfile.latitude == null || c.latitude == null) return true;
        const dist = haversineKm(myProfile.latitude, myProfile.longitude!, c.latitude, c.longitude!);
        return dist <= myProfile.maxDistanceKm;
      })
      .map((c) => {
        const sharedInterests = c.interests.filter((i) => myProfile.interests.includes(i)).length;
        const sharedLanguages = c.spokenLanguages.filter((l) => myProfile.spokenLanguages.includes(l)).length;
        return { profile: c, score: sharedInterests * 2 + sharedLanguages };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((s) => s.profile);

    return { candidates: scored, remainingSwipes: remaining };
  }
}
