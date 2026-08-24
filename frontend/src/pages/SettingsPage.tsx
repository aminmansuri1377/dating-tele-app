import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { setAppLanguage } from '../i18n';
import { useAuthStore } from '../store/authStore';

const LANGUAGES = [
  { code: 'fa', label: 'فارسی' },
  { code: 'en', label: 'English' },
  { code: 'ru', label: 'Русский' },
  { code: 'ar', label: 'العربية' },
  { code: 'tr', label: 'Türkçe' },
  { code: 'es', label: 'Español' },
];

export default function SettingsPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-bold">{t('settings.title')}</h1>

      <button
        onClick={() => navigate('/profile/edit')}
        className="w-full text-left p-4 rounded-card border border-black/10 dark:border-white/10"
      >
        {t('settings.edit_profile')}
      </button>

      <div className="p-4 rounded-card border border-black/10 dark:border-white/10">
        <p className="text-sm text-gray-500 mb-2">{t('settings.language')}</p>
        <div className="flex flex-wrap gap-2">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => setAppLanguage(lang.code)}
              className={`px-3 py-1.5 rounded-full text-sm border ${
                i18n.language === lang.code ? 'bg-brand text-white border-brand' : 'border-black/10 dark:border-white/10'
              }`}
            >
              {lang.label}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={() => navigate('/premium')}
        className="w-full text-left p-4 rounded-card border border-black/10 dark:border-white/10"
      >
        {t('settings.subscription')}
      </button>

      <button onClick={logout} className="w-full text-left p-4 rounded-card text-red-500 border border-red-200">
        {t('settings.logout')}
      </button>
    </div>
  );
}
