import { Module } from '@nestjs/common';
import { MatchesController } from './matches.controller';
import { MatchesService } from './matches.service';
import { TelegramNotifierService } from './telegram-notifier.service';

@Module({
  controllers: [MatchesController],
  providers: [MatchesService, TelegramNotifierService],
  exports: [MatchesService, TelegramNotifierService],
})
export class MatchesModule {}
