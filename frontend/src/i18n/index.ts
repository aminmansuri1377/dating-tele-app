import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import fa from './locales/fa.json';
import ru from './locales/ru.json';
import ar from './locales/ar.json';
import tr from './locales/tr.json';
import es from './locales/es.json';

export const RTL_LANGUAGES = ['fa', 'ar'];

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    fa: { translation: fa },
    ru: { translation: ru },
    ar: { translation: ar },
    tr: { translation: tr },
    es: { translation: es },
  },
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export function setAppLanguage(code: string) {
  i18n.changeLanguage(code);
  document.documentElement.dir = RTL_LANGUAGES.includes(code) ? 'rtl' : 'ltr';
  document.documentElement.lang = code;
}

export default i18n;
