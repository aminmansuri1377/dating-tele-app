import { useTonConnectUI, useTonAddress } from '@tonconnect/ui-react';
import { api } from '../api/client';

/** Encapsulates the two-step TON payment flow: create order -> send via TonConnect -> confirm on backend. */
export function useTonPayment() {
  const [tonConnectUI] = useTonConnectUI();
  const senderAddress = useTonAddress();

  async function purchasePlan(plan: 'BASIC' | 'PREMIUM' | 'VIP') {
    if (!senderAddress) {
      await tonConnectUI.openModal();
      throw new Error('Connect a TON wallet first');
    }

    const { data: order } = await api.post('/payments/order', { plan });

    const result = await tonConnectUI.sendTransaction({
      validUntil: Math.floor(Date.now() / 1000) + 300,
      messages: [
        {
          address: order.merchantAddress,
          amount: String(Math.floor(order.amountTon * 1e9)), // nanoTON
          payload: undefined, // TonConnect UI builds the comment payload; see backend comment matching
        },
      ],
    });

    const txHash = result.boc; // in production, resolve the actual tx hash via the returned BOC + wallet API

    const { data: confirmation } = await api.post('/payments/confirm', {
      txHash,
      plan,
      senderAddress,
      orderComment: order.orderComment,
    });

    return confirmation;
  }

  return { purchasePlan, senderAddress };
}
