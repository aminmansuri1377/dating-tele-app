import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { TonVerificationService } from './ton-verification.service';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';

@Module({
  imports: [SubscriptionsModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, TonVerificationService],
})
export class PaymentsModule {}
