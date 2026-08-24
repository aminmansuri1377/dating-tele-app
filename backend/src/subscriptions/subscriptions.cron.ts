import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SubscriptionsService } from './subscriptions.service';

@Injectable()
export class SubscriptionsCron {
  constructor(private subscriptionsService: SubscriptionsService) {}

  @Cron(CronExpression.EVERY_HOUR)
  async handleExpiry() {
    await this.subscriptionsService.expireOutdated();
  }
}
