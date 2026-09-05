import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ReportReason } from '@prisma/client';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async fileReport(reporterId: string, reportedId: string, reason: ReportReason, description?: string) {
    if (reporterId === reportedId) throw new BadRequestException('Cannot report yourself');

    const [target, existingOpen] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: reportedId }, select: { id: true } }),
      this.prisma.report.findFirst({
        where: { reporterId, reportedId, status: 'OPEN' },
        select: { id: true },
      }),
    ]);

    if (!target) throw new NotFoundException('User not found');
    if (existingOpen) throw new ConflictException('You already have an open report for this user');

    return this.prisma.$transaction(async (tx) => {
      const report = await tx.report.create({
        data: { reporterId, reportedId, reason, description },
      });

      const distinctReporters = await tx.report.findMany({
        where: { reportedId, status: 'OPEN' },
        distinct: ['reporterId'],
        select: { reporterId: true },
      });

      if (distinctReporters.length >= 5) {
        await tx.profile.updateMany({ where: { userId: reportedId }, data: { isVisible: false } });
      }

      return report;
    });
  }

  async getMyReports(reporterId: string) {
    return this.prisma.report.findMany({ where: { reporterId }, orderBy: { createdAt: 'desc' } });
  }
}
