import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { TonVerificationService } from './ton-verification.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { PLAN_CONFIG } from '../subscriptions/plans.config';
import { SubscriptionPlan } from '@prisma/client';

@Injectable()
export class PaymentsService {
  constructor(
    private prisma: PrismaService,
    private tonVerification: TonVerificationService,
    private subscriptionsService: SubscriptionsService,
  ) {}

  /** Step 1: frontend calls this to get the exact amount + a unique order comment before opening TonConnect */
  async createOrder(userId: string, plan: SubscriptionPlan) {
    const config = PLAN_CONFIG[plan];
    const orderComment = `sub-${randomUUID()}`;
    return { plan, amountTon: config.priceTon, orderComment, merchantAddress: process.env.TON_MERCHANT_WALLET_ADDRESS };
  }

  /** Step 2: after TonConnect confirms the send, frontend reports the tx hash for verification */
  async confirmPayment(
    userId: string,
    dto: { txHash: string; plan: SubscriptionPlan; senderAddress: string; orderComment: string },
  ) {
    const existing = await this.prisma.transaction.findUnique({ where: { tonTxHash: dto.txHash } });
    if (existing) throw new ConflictException('This transaction has already been processed');

    const { verified, amountTon } = await this.tonVerification.verifyPayment(
      dto.txHash,
      dto.plan,
      dto.senderAddress,
      dto.orderComment,
    );

    if (!verified) {
      throw new BadRequestException('Payment could not be verified on-chain');
    }

    const transaction = await this.prisma.transaction.create({
      data: {
        userId,
        tonTxHash: dto.txHash,
        tonAmount: amountTon,
        walletAddress: dto.senderAddress,
        plan: dto.plan,
        status: 'CONFIRMED',
        verifiedAt: new Date(),
      },
    });

    const subscription = await this.subscriptionsService.activate(userId, dto.plan, transaction.id);

    return { transaction, subscription };
  }

  async getMyTransactions(userId: string) {
    return this.prisma.transaction.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
  }
}
