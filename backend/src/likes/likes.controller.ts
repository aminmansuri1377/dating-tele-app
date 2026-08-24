import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { IsEnum, IsString } from 'class-validator';
import { SwipeAction } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { LikesService } from './likes.service';
import { JwtPayload } from '../auth/jwt.strategy';

class SwipeDto {
  @IsString()
  toUserId: string;

  @IsEnum(SwipeAction)
  action: SwipeAction;
}

@UseGuards(JwtAuthGuard)
@Controller('likes')
export class LikesController {
  constructor(private likesService: LikesService) {}

  @Post('swipe')
  swipe(@CurrentUser() user: JwtPayload, @Body() dto: SwipeDto) {
    return this.likesService.swipe(user.sub, dto.toUserId, dto.action);
  }

  @Get('who-liked-me')
  whoLikedMe(@CurrentUser() user: JwtPayload) {
    return this.likesService.getWhoLikedMe(user.sub);
  }
}
