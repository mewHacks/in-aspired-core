// i18next initialization — configures language detection and translation resources
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translations
import enTranslations from './locales/en/translation.json';
import zhTranslations from './locales/zh/translation.json';
import msTranslations from './locales/ms/translation.json';
import taTranslations from './locales/ta/translation.json';

const resources = {
    english: {
        translation: enTranslations
    },
    chinese: {
        translation: zhTranslations
    },
    malay: {
        translation: msTranslations
    },
    tamil: {
        translation: taTranslations
    }
};

i18n
    // Detects user language from browser (optional fallback)
    .use(LanguageDetector)

    // Passes i18n down to react-i18next
    .use(initReactI18next)

    .init({
        resources,
        // Default fallback if a language or specific translation key is missing
        fallbackLng: 'english',

        // Use strings from SettingsPage: 'english', 'chinese', 'malay', 'tamil' and map

        interpolation: {
            escapeValue: false // React already escapes values to prevent XSS
        }
    });

export default i18n;
