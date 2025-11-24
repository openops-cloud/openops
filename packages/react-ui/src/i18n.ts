import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import Backend from 'i18next-http-backend';
import ICU from 'i18next-icu';
import { initReactI18next } from 'react-i18next';

const translationOverrides: Record<string, string> = {};

fetch('/locales/en/translation-override.json')
  .then((response) => (response.ok ? response.json() : {}))
  .then((overrides) => {
    Object.assign(translationOverrides, overrides);
  })
  .catch(() => {})
  .finally(() => {
    i18n
      .use(ICU)
      .use(Backend)
      .use(LanguageDetector)
      .use(initReactI18next)
      .init({
        fallbackLng: 'en',
        debug: false,

        interpolation: {
          escapeValue: false, // not needed for react as it escapes by default
        },
        returnEmptyString: false,
        returnNull: false,
        backend: {
          parse: (data: string) => {
            try {
              const parsedData = JSON.parse(data);
              return { ...parsedData, ...translationOverrides };
            } catch (error) {
              console.error('Error parsing translation data', error);
              return {};
            }
          },
        },
      });
  });

export default i18n;
