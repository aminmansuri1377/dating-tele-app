import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { DiscoveryService } from './discovery.service';
import { JwtPayload } from '../auth/jwt.strategy';

@UseGuards(JwtAuthGuard)
@Controller('discovery')
export class DiscoveryController {
  constructor(private discoveryService: DiscoveryService) {}

  @Get('candidates')
  getCandidates(@CurrentUser() user: JwtPayload, @Query('limit') limit?: string) {
    return this.discoveryService.getCandidates(user.sub, limit ? Number(limit) : undefined);
  }
}
