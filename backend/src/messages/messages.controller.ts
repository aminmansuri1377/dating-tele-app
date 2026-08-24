import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { MessageType } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { MessagesService } from './messages.service';
import { JwtPayload } from '../auth/jwt.strategy';

class SendMessageDto {
  @IsEnum(MessageType)
  type: MessageType;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;
}

@UseGuards(JwtAuthGuard)
@Controller('matches/:matchId/messages')
export class MessagesController {
  constructor(private messagesService: MessagesService) {}

  @Get()
  getMessages(
    @CurrentUser() user: JwtPayload,
    @Param('matchId') matchId: string,
    @Query('cursor') cursor?: string,
  ) {
    return this.messagesService.getMessages(user.sub, matchId, cursor);
  }

  @Post()
  send(@CurrentUser() user: JwtPayload, @Param('matchId') matchId: string, @Body() dto: SendMessageDto) {
    return this.messagesService.sendMessage(user.sub, matchId, dto);
  }

  @Post('read')
  markRead(@CurrentUser() user: JwtPayload, @Param('matchId') matchId: string) {
    return this.messagesService.markRead(user.sub, matchId);
  }
}
