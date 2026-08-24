import { useTranslation } from 'react-i18next';

export default function WelcomePage() {
  const { t } = useTranslation();
  return (
    <div className="h-screen flex flex-col items-center justify-center px-8 text-center bg-gradient-to-b from-brand/10 to-transparent">
      <div className="text-6xl mb-6">💘</div>
      <h1 className="text-2xl font-bold mb-2">{t('welcome.title')}</h1>
      <p className="text-gray-500 mb-10">{t('welcome.subtitle')}</p>
      {/* Auth happens automatically via Telegram initData in App.tsx; this is shown only if it fails/is loading */}
      <div className="w-full py-3 rounded-full bg-brand text-white font-semibold">{t('welcome.continue')}</div>
    </div>
  );
}
