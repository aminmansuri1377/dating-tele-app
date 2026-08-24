import { SubscriptionPlan } from '@prisma/client';

/** Prices in TON, and duration — adjustable without a schema change. */
export const PLAN_CONFIG: Record<SubscriptionPlan, { days: number; priceTon: number }> = {
  BASIC: { days: 7, priceTon: 1.5 },
  PREMIUM: { days: 30, priceTon: 4.5 },
  VIP: { days: 90, priceTon: 10 },
};
