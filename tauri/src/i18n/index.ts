import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import yaml from 'js-yaml';

import enYml from './locales/en.yml?raw';
import zhYml from './locales/zh.yml?raw';

const en = yaml.load(enYml) as Record<string, unknown>;
const zh = yaml.load(zhYml) as Record<string, unknown>;

export const resources = {
  en: { translation: en },
  zh: { translation: zh },
};

export const supportedLanguages = [
  { code: 'en', name: 'English' },
  { code: 'zh', name: '中文' },
] as const;

export type SupportedLanguage = (typeof supportedLanguages)[number]["code"];

export const supportedLanguageCodes = supportedLanguages.map(
  (language) => language.code
);

export function isSupportedLanguage(
  language: string | null | undefined
): language is SupportedLanguage {
  return supportedLanguageCodes.includes((language ?? "") as SupportedLanguage);
}

export function normalizeLanguage(
  language: string | null | undefined
): SupportedLanguage {
  return isSupportedLanguage(language) ? language : "en";
}

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;

export function changeLanguage(lang: string) {
  i18n.changeLanguage(lang);
}
