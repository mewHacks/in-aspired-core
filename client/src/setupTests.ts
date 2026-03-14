// setupTests.ts
// Configures the test environment for Vitest 
// Imports jest-dom to add custom matchers like 'toBeInTheDocument'
import '@testing-library/jest-dom';
import { vi } from 'vitest';
import enTranslations from './locales/en/translation.json';

// Global mock for react-i18next
vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (keyPath: string, defaultValue?: string) => {
            const keys = keyPath.split('.');
            let value: any = enTranslations;
            for (const key of keys) {
                value = value?.[key];
            }
            return value || defaultValue || keyPath;
        },
        i18n: {
            changeLanguage: () => Promise.resolve(),
            language: 'en',
        },
    }),
    initReactI18next: {
        type: '3rdParty',
        init: () => { },
    },
}));
