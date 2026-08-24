import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../common/guards/jwt-auth.guard';
import { AdminService } from './admin.service';

@UseGuards(AdminGuard)
@Controller('admin')
export class AdminController {
  constructor(private adminService: AdminService) {}

  @Get('users')
  listUsers(@Query('page') page?: string, @Query('search') search?: string) {
    return this.adminService.listUsers(page ? Number(page) : undefined, undefined, search);
  }

  @Post('users/:id/ban')
  banUser(@Param('id') id: string) {
    return this.adminService.banUser(id);
  }

  @Post('users/:id/unban')
  unbanUser(@Param('id') id: string) {
    return this.adminService.unbanUser(id);
  }

  @Post('users/:id/delete')
  deleteUser(@Param('id') id: string) {
    return this.adminService.deleteUser(id);
  }

  @Get('reports')
  listReports(@Query('status') status?: string) {
    return this.adminService.listReports(status);
  }

  @Patch('reports/:id')
  resolveReport(@Param('id') id: string, @Body('status') status: 'REVIEWED' | 'ACTION_TAKEN' | 'DISMISSED') {
    return this.adminService.resolveReport(id, status);
  }

  @Get('transactions')
  listTransactions(@Query('page') page?: string) {
    return this.adminService.listTransactions(page ? Number(page) : undefined);
  }

  @Get('languages')
  listLanguages() {
    return this.adminService.listLanguages();
  }

  @Post('languages')
  upsertLanguage(@Body() body: { code: string; name: string; isActive: boolean; isRtl: boolean }) {
    return this.adminService.upsertLanguage(body.code, body.name, body.isActive, body.isRtl);
  }

  @Get('stats')
  getDashboardStats() {
    return this.adminService.getDashboardStats();
  }
}
