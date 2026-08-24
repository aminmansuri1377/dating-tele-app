import { Controller, Delete, Get, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { MatchesService } from './matches.service';
import { JwtPayload } from '../auth/jwt.strategy';

@UseGuards(JwtAuthGuard)
@Controller('matches')
export class MatchesController {
  constructor(private matchesService: MatchesService) {}

  @Get()
  getMyMatches(@CurrentUser() user: JwtPayload) {
    return this.matchesService.getMyMatches(user.sub);
  }

  @Delete(':id')
  unmatch(@CurrentUser() user: JwtPayload, @Param('id') matchId: string) {
    return this.matchesService.unmatch(user.sub, matchId);
  }
}
