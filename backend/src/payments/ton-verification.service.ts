import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TonClient, Address } from '@ton/ton';
import { PLAN_CONFIG } from '../subscriptions/plans.config';
import { SubscriptionPlan } from '@prisma/client';

/**
 * Verifies TON payments against the chain directly — NEVER trust the amount
 * or "success" flag the frontend reports. We re-derive the expected amount
 * from PLAN_CONFIG server-side and check the actual transaction on-chain.
 */
@Injectable()
export class TonVerificationService {
  private readonly logger = new Logger(TonVerificationService.name);
  private client: TonClient;
  private merchantAddress: string;

  constructor(private config: ConfigService) {
    this.client = new TonClient({
      endpoint: this.config.get<string>('TON_RPC_ENDPOINT') ?? 'https://toncenter.com/api/v2/jsonRPC',
      apiKey: this.config.get<string>('TON_API_KEY'),
    });
    this.merchantAddress = this.config.get<string>('TON_MERCHANT_WALLET_ADDRESS')!;
  }

  /**
   * @param txHash the transaction hash returned by TonConnect after send
   * @param expectedPlan plan the user claims to have purchased
   * @param senderAddress the wallet address that sent the payment
   * @param orderComment the unique order/memo string embedded in the tx, used to
   *   prevent replay (re-using the same tx hash to activate multiple subscriptions)
   */
  async verifyPayment(
    txHash: string,
    expectedPlan: SubscriptionPlan,
    senderAddress: string,
    orderComment: string,
  ): Promise<{ verified: boolean; amountTon: number }> {
    const expectedAmount = PLAN_CONFIG[expectedPlan].priceTon;

    try {
      const merchant = Address.parse(this.merchantAddress);
      const transactions = await this.client.getTransactions(merchant, { limit: 20, hash: txHash as any });

      const tx = transactions.find((t) => {
        const inMsg = t.inMessage;
        if (!inMsg || inMsg.info.type !== 'internal') return false;
        const comment = this.extractComment(inMsg);
        return comment === orderComment;
      });

      if (!tx || !tx.inMessage || tx.inMessage.info.type !== 'internal') {
        return { verified: false, amountTon: 0 };
      }

      const amountNano = tx.inMessage.info.value.coins;
      const amountTon = Number(amountNano) / 1e9;
      const sourceOk = tx.inMessage.info.src?.toString() === Address.parse(senderAddress).toString();

      // Allow tiny float tolerance for gas/rounding
      const amountOk = amountTon >= expectedAmount - 0.001;

      return { verified: Boolean(sourceOk && amountOk), amountTon };
    } catch (err) {
      this.logger.error(`TON verification failed: ${err}`);
      throw new BadRequestException('Unable to verify transaction on-chain');
    }
  }

  private extractComment(inMsg: any): string | null {
    try {
      const body = inMsg.body?.beginParse();
      if (!body) return null;
      body.loadUint(32); // skip op code (0 = simple text comment)
      return body.loadStringTail();
    } catch {
      return null;
    }
  }
}
