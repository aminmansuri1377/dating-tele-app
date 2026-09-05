import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';

const FREE_DAILY_SWIPES_MALE = 20;
const MAX_DISCOVERY_LIMIT = 50;

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
    if (isPremium || profile?.gender === 'FEMALE') return null;

    const usage = await this.prisma.dailyUsage.findUnique({
      where: { userId_date: { userId, date: this.todayUtc() } },
    });
    return Math.max(0, FREE_DAILY_SWIPES_MALE - (usage?.swipeCount ?? 0));
  }

  async getCandidates(userId: string, requestedLimit = 20) {
    if (!Number.isInteger(requestedLimit) || requestedLimit < 1 || requestedLimit > MAX_DISCOVERY_LIMIT) {
      throw new BadRequestException(`limit must be an integer between 1 and ${MAX_DISCOVERY_LIMIT}`);
    }

    const remaining = await this.getRemainingSwipes(userId);
    if (remaining === 0) {
      throw new ForbiddenException('Daily swipe limit reached. Upgrade to Premium for unlimited swipes.');
    }

    const myProfile = await this.prisma.profile.findUnique({ where: { userId } });
    if (!myProfile?.isComplete) throw new ForbiddenException('Complete your profile first');

    const genderFilter =
      myProfile.genderPref === 'EVERYONE' ? undefined : { gender: myProfile.genderPref as any };

    const candidatePreferenceFilter = {
      genderPref: { in: ['EVERYONE', myProfile.gender] as any[] },
    };

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
        isComplete: true,
        age: { gte: myProfile.minAgePref, lte: myProfile.maxAgePref },
        ...genderFilter,
        ...candidatePreferenceFilter,
        user: { status: 'ACTIVE' },
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            languageCode: true,
            photos: {
              where: { isApproved: true },
              orderBy: { position: 'asc' },
              take: 6,
              select: { id: true, url: true, position: true },
            },
          },
        },
      },
      orderBy: [{ isPriority: 'desc' }, { updatedAt: 'desc' }],
      take: requestedLimit * 3,
    });

    const scored = candidates
      .filter((candidate) => {
        if (
          myProfile.latitude == null ||
          myProfile.longitude == null ||
          candidate.latitude == null ||
          candidate.longitude == null
        ) {
          return true;
        }
        return (
          haversineKm(
            myProfile.latitude,
            myProfile.longitude,
            candidate.latitude,
            candidate.longitude,
          ) <= myProfile.maxDistanceKm
        );
      })
      .map((candidate) => {
        const sharedInterests = candidate.interests.filter((interest) => myProfile.interests.includes(interest)).length;
        const sharedLanguages = candidate.spokenLanguages.filter((language) =>
          myProfile.spokenLanguages.includes(language),
        ).length;
        return { profile: candidate, score: sharedInterests * 2 + sharedLanguages };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, requestedLimit)
      .map((entry) => entry.profile);

    return { candidates: scored, remainingSwipes: remaining };
  }
}
