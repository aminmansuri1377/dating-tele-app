import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ReportReason } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ReportsService } from './reports.service';
import { JwtPayload } from '../auth/jwt.strategy';
import { Module } from '@nestjs/common';

class FileReportDto {
  @IsString()
  reportedId: string;

  @IsEnum(ReportReason)
  reason: ReportReason;

  @IsOptional()
  @IsString()
  description?: string;
}

@UseGuards(JwtAuthGuard)
@Controller('reports')
export class ReportsController {
  constructor(private reportsService: ReportsService) {}

  @Post()
  fileReport(@CurrentUser() user: JwtPayload, @Body() dto: FileReportDto) {
    return this.reportsService.fileReport(user.sub, dto.reportedId, dto.reason, dto.description);
  }

  @Get('mine')
  getMyReports(@CurrentUser() user: JwtPayload) {
    return this.reportsService.getMyReports(user.sub);
  }
}

@Module({
  controllers: [ReportsController],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}
