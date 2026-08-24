import { Module } from '@nestjs/common';
import { LikesController } from './likes.controller';
import { LikesService } from './likes.service';
import { UsersModule } from '../users/users.module';
import { MatchesModule } from '../matches/matches.module';

@Module({
  imports: [UsersModule, MatchesModule],
  controllers: [LikesController],
  providers: [LikesService],
})
export class LikesModule {}
