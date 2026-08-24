import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  // ---- Users ----
  async listUsers(page = 1, pageSize = 25, search?: string) {
    const where = search
      ? {
          OR: [
            { username: { contains: search, mode: 'insensitive' as const } },
            { firstName: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};
    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        include: { profile: true },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.user.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }

  async banUser(userId: string) {
    const user = await this.prisma.user.update({ where: { id: userId }, data: { status: 'BANNED' } });
    return user;
  }

  async unbanUser(userId: string) {
    return this.prisma.user.update({ where: { id: userId }, data: { status: 'ACTIVE' } });
  }

  async deleteUser(userId: string) {
    // Cascades remove profile/photos/likes/matches/messages/etc per schema onDelete rules
    await this.prisma.user.delete({ where: { id: userId } });
    return { deleted: true };
  }

  // ---- Reports ----
  async listReports(status?: string) {
    return this.prisma.report.findMany({
      where: status ? { status: status as any } : {},
      include: {
        reporter: { include: { profile: true } },
        reported: { include: { profile: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async resolveReport(reportId: string, status: 'REVIEWED' | 'ACTION_TAKEN' | 'DISMISSED') {
    const report = await this.prisma.report.update({
      where: { id: reportId },
      data: { status, reviewedAt: new Date() },
    });
    if (!report) throw new NotFoundException('Report not found');
    return report;
  }

  // ---- Subscriptions / Payments ----
  async listTransactions(page = 1, pageSize = 25) {
    const [items, total] = await Promise.all([
      this.prisma.transaction.findMany({
        include: { user: { include: { profile: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.transaction.count(),
    ]);
    return { items, total, page, pageSize };
  }

  // ---- Languages / content ----
  async listLanguages() {
    return this.prisma.language.findMany({ orderBy: { name: 'asc' } });
  }

  async upsertLanguage(code: string, name: string, isActive: boolean, isRtl: boolean) {
    return this.prisma.language.upsert({
      where: { code },
      create: { code, name, isActive, isRtl },
      update: { name, isActive, isRtl },
    });
  }

  // ---- Analytics ----
  async getDashboardStats() {
    const now = new Date();
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [totalUsers, dau, mau, totalMatches, totalRevenue, activeSubs, openReports] = await Promise.all([
      this.prisma.user.count({ where: { status: 'ACTIVE' } }),
      this.prisma.user.count({ where: { lastActiveAt: { gte: dayAgo } } }),
      this.prisma.user.count({ where: { lastActiveAt: { gte: monthAgo } } }),
      this.prisma.match.count(),
      this.prisma.transaction.aggregate({ where: { status: 'CONFIRMED' }, _sum: { tonAmount: true } }),
      this.prisma.subscription.count({ where: { status: 'ACTIVE', expiresAt: { gt: now } } }),
      this.prisma.report.count({ where: { status: 'OPEN' } }),
    ]);

    return {
      totalUsers,
      dailyActiveUsers: dau,
      monthlyActiveUsers: mau,
      totalMatches,
      totalRevenueTon: totalRevenue._sum.tonAmount ?? 0,
      activeSubscriptions: activeSubs,
      openReports,
    };
  }
}
