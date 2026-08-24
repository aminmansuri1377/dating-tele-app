import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ReportReason } from '@prisma/client';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async fileReport(reporterId: string, reportedId: string, reason: ReportReason, description?: string) {
    const report = await this.prisma.report.create({
      data: { reporterId, reportedId, reason, description },
    });

    // Auto-flag: if a user accumulates 5+ open reports, hide their profile pending review
    const openCount = await this.prisma.report.count({
      where: { reportedId, status: 'OPEN' },
    });
    if (openCount >= 5) {
      await this.prisma.profile.updateMany({ where: { userId: reportedId }, data: { isVisible: false } });
    }

    return report;
  }

  async getMyReports(reporterId: string) {
    return this.prisma.report.findMany({ where: { reporterId }, orderBy: { createdAt: 'desc' } });
  }
}
