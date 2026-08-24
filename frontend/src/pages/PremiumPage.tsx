import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { TonConnectButton } from '@tonconnect/ui-react';
import { useTonPayment } from '../ton/useTonPayment';

const PLANS = [
  { id: 'BASIC', key: 'premium.plan_basic', price: 1.5 },
  { id: 'PREMIUM', key: 'premium.plan_premium', price: 4.5 },
  { id: 'VIP', key: 'premium.plan_vip', price: 10 },
] as const;

export default function PremiumPage() {
  const { t } = useTranslation();
  const { purchasePlan } = useTonPayment();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  async function handlePurchase(plan: (typeof PLANS)[number]['id']) {
    setLoadingPlan(plan);
    setStatus(null);
    try {
      await purchasePlan(plan);
      setStatus('✅ Subscription activated');
    } catch (err: any) {
      setStatus(err.message ?? t('common.error'));
    } finally {
      setLoadingPlan(null);
    }
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">{t('premium.title')}</h1>
      <p className="text-gray-500 mb-4">{t('premium.subtitle')}</p>

      <div className="mb-4">
        <TonConnectButton />
      </div>

      <ul className="space-y-2 mb-6 text-sm">
        <li>✓ {t('premium.feature_unlimited_swipes')}</li>
        <li>✓ {t('premium.feature_see_likes')}</li>
        <li>✓ {t('premium.feature_unlimited_messages')}</li>
        <li>✓ {t('premium.feature_priority')}</li>
      </ul>

      <div className="space-y-3">
        {PLANS.map((plan) => (
          <button
            key={plan.id}
            disabled={loadingPlan === plan.id}
            onClick={() => handlePurchase(plan.id)}
            className="w-full flex justify-between items-center p-4 rounded-card border border-black/10 dark:border-white/10 disabled:opacity-50"
          >
            <span className="font-semibold">{t(plan.key)}</span>
            <span className="text-brand font-bold">{plan.price} TON</span>
          </button>
        ))}
      </div>

      {status && <p className="mt-4 text-sm text-center">{status}</p>}
    </div>
  );
}
