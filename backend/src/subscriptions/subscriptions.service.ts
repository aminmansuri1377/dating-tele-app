import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PLAN_CONFIG } from './plans.config';
import { SubscriptionPlan } from '@prisma/client';

@Injectable()
export class SubscriptionsService {
  constructor(private prisma: PrismaService) {}

  async getMyStatus(userId: string) {
    const active = await this.prisma.subscription.findFirst({
      where: { userId, status: 'ACTIVE', expiresAt: { gt: new Date() } },
      orderBy: { expiresAt: 'desc' },
    });
    return { isPremium: Boolean(active), subscription: active, plans: PLAN_CONFIG };
  }

  /** Called by PaymentsService once a TON transaction is verified on-chain. */
  async activate(userId: string, plan: SubscriptionPlan, transactionId: string) {
    const config = PLAN_CONFIG[plan];

    // Extend from the current expiry if the user still has active time left, otherwise from now
    const current = await this.prisma.subscription.findFirst({
      where: { userId, status: 'ACTIVE', expiresAt: { gt: new Date() } },
      orderBy: { expiresAt: 'desc' },
    });
    const base = current?.expiresAt && current.expiresAt > new Date() ? current.expiresAt : new Date();
    const expiresAt = new Date(base.getTime() + config.days * 24 * 60 * 60 * 1000);

    return this.prisma.subscription.create({
      data: { userId, plan, status: 'ACTIVE', expiresAt, transactionId },
    });
  }

  /** Scheduled job target: flip expired ACTIVE rows to EXPIRED (see subscriptions.cron.ts) */
  async expireOutdated() {
    return this.prisma.subscription.updateMany({
      where: { status: 'ACTIVE', expiresAt: { lte: new Date() } },
      data: { status: 'EXPIRED' },
    });
  }
}
