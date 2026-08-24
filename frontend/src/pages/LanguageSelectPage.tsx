import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { setAppLanguage } from '../i18n';

const LANGUAGES = [
  { code: 'fa', label: 'فارسی' },
  { code: 'en', label: 'English' },
  { code: 'ru', label: 'Русский' },
  { code: 'ar', label: 'العربية' },
  { code: 'tr', label: 'Türkçe' },
  { code: 'es', label: 'Español' },
];

export default function LanguageSelectPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  function choose(code: string) {
    setAppLanguage(code);
    navigate('/profile-setup');
  }

  return (
    <div className="min-h-screen p-6">
      <h1 className="text-xl font-bold mb-6">{t('language.select_title')}</h1>
      <div className="grid grid-cols-2 gap-3">
        {LANGUAGES.map((lang) => (
          <button
            key={lang.code}
            onClick={() => choose(lang.code)}
            className="py-4 rounded-card border border-black/10 dark:border-white/10 font-medium hover:border-brand"
          >
            {lang.label}
          </button>
        ))}
      </div>
    </div>
  );
}
