import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ProfilesService } from './profiles.service';
import { UpsertProfileDto } from './dto/upsert-profile.dto';
import { JwtPayload } from '../auth/jwt.strategy';

@UseGuards(JwtAuthGuard)
@Controller('profiles')
export class ProfilesController {
  constructor(private profilesService: ProfilesService) {}

  @Get('me')
  getMyProfile(@CurrentUser() user: JwtPayload) {
    return this.profilesService.getMyProfile(user.sub);
  }

  @Put('me')
  upsertMyProfile(@CurrentUser() user: JwtPayload, @Body() dto: UpsertProfileDto) {
    return this.profilesService.upsert(user.sub, dto);
  }
}
