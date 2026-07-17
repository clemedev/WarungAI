import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import ms from './locales/ms.json';
import en from './locales/en.json';
import zh from './locales/zh.json';

const SUPPORTED_LANGS = ['ms', 'en', 'zh'];
const DEFAULT_LANG = 'ms';
const LANG_KEY = 'warungai.lang';

function getSavedLang() {
  try {
    const saved = localStorage.getItem(LANG_KEY);
    return SUPPORTED_LANGS.includes(saved) ? saved : DEFAULT_LANG;
  } catch {
    return DEFAULT_LANG;
  }
}

const resources = {
  ms: { translation: ms },
  en: { translation: en },
  zh: { translation: zh },
};

i18n.use(initReactI18next).init({
  resources,
  lng: getSavedLang(),
  fallbackLng: DEFAULT_LANG,
  interpolation: {
    escapeValue: false,
  },
});

export function changeLanguage(lang) {
  if (SUPPORTED_LANGS.includes(lang)) {
    i18n.changeLanguage(lang);
    try {
      localStorage.setItem(LANG_KEY, lang);
    } catch {
      // storage unavailable
    }
  }
}

export function getCurrentLanguage() {
  return i18n.language;
}

export const LANGUAGES = [
  { code: 'ms', name: 'Bahasa Melayu' },
  { code: 'en', name: 'English' },
  { code: 'zh', name: '中文' },
];

export default i18n;
