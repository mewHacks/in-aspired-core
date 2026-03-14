import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cookie, X, Shield, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

// Cookie consent preferences
export interface CookiePreferences {
    necessary: boolean; // Always true, cannot be disabled
    analytics: boolean;
    marketing: boolean;
}

const COOKIE_CONSENT_KEY = 'cookie-consent';
const COOKIE_PREFERENCES_KEY = 'cookie-preferences';

// Get saved preferences from localStorage
export const getCookiePreferences = (): CookiePreferences | null => {
    const saved = localStorage.getItem(COOKIE_PREFERENCES_KEY);
    if (saved) {
        try {
            return JSON.parse(saved);
        } catch {
            return null;
        }
    }
    return null;
};

// Check if consent has been given
export const hasConsentBeenGiven = (): boolean => {
    return localStorage.getItem(COOKIE_CONSENT_KEY) === 'true';
};

const CookieConsent: React.FC = () => {
    const { t } = useTranslation();
    const [isVisible, setIsVisible] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [preferences, setPreferences] = useState<CookiePreferences>({
        necessary: true,
        analytics: true,
        marketing: false,
    });

    useEffect(() => {
        // Check if user has already made a choice
        const hasConsented = hasConsentBeenGiven();
        if (!hasConsented) {
            // Delay showing the banner slightly for better UX
            const timer = setTimeout(() => setIsVisible(true), 1500);
            return () => clearTimeout(timer);
        }
    }, []);

    // Save user consent
    const saveConsent = (prefs: CookiePreferences) => {
        localStorage.setItem(COOKIE_CONSENT_KEY, 'true');
        localStorage.setItem(COOKIE_PREFERENCES_KEY, JSON.stringify(prefs));
        setIsVisible(false);
    };

    // Accept all cookies
    const handleAcceptAll = () => {
        saveConsent({
            necessary: true,
            analytics: true,
            marketing: true,
        });
    };

    // Reject all cookies
    const handleRejectAll = () => {
        saveConsent({
            necessary: true,
            analytics: false,
            marketing: false,
        });
    };

    // Accept only necessary cookies
    const handleAcceptNecessary = () => {
        saveConsent({
            necessary: true,
            analytics: false,
            marketing: false,
        });
    };

    // Save custom preferences
    const handleSavePreferences = () => {
        saveConsent(preferences);
    };

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 100, opacity: 0 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    className="fixed bottom-0 left-0 right-0 z-[100] p-4 md:p-6"
                >
                    <div className="max-w-4xl mx-auto">
                        <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
                            {/* Main Banner */}
                            <div className="p-6">
                                <div className="flex items-start gap-4">
                                    {/* Cookie Icon */}
                                    <div className="hidden sm:flex items-center justify-center w-12 h-12 bg-gradient-to-br from-amber-100 to-orange-100 rounded-xl flex-shrink-0">
                                        <Cookie className="w-6 h-6 text-amber-600" />
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Cookie className="w-5 h-5 text-amber-600 sm:hidden" />
                                            <h3 className="text-lg font-semibold text-gray-900">
                                                {t('common.cookieConsent.title')}
                                            </h3>
                                        </div>
                                        <p className="text-gray-600 text-sm leading-relaxed mb-4">
                                            {t('common.cookieConsent.description')}
                                            {' '}{t('common.cookieConsent.learnMore')}{' '}
                                            <Link
                                                to="/privacy"
                                                className="text-indigo-600 hover:text-indigo-700 underline font-medium"
                                            >
                                                {t('common.cookieConsent.privacyPolicy')}
                                            </Link>.
                                        </p>

                                        {/* Buttons */}
                                        <div className="flex flex-wrap items-center gap-3">
                                            <button
                                                onClick={handleAcceptAll}
                                                className="px-5 py-2.5 bg-indigo-600 text-white rounded-full text-sm font-medium hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
                                            >
                                                {t('common.cookieConsent.acceptAll')}
                                            </button>
                                            <button
                                                onClick={handleAcceptNecessary}
                                                className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-full text-sm font-medium hover:bg-gray-200 transition-colors"
                                            >
                                                {t('common.cookieConsent.necessaryOnly')}
                                            </button>
                                            <button
                                                onClick={handleRejectAll}
                                                className="px-5 py-2.5 text-gray-500 hover:text-gray-700 text-sm font-medium transition-colors"
                                            >
                                                {t('common.cookieConsent.rejectAll')}
                                            </button>
                                            <button
                                                onClick={() => setShowSettings(!showSettings)}
                                                className="flex items-center gap-1.5 px-4 py-2.5 text-gray-600 hover:text-gray-800 text-sm font-medium transition-colors ml-auto"
                                            >
                                                <Settings className="w-4 h-4" />
                                                {t('common.cookieConsent.customize')}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Close Button */}
                                    <button
                                        onClick={handleAcceptNecessary}
                                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
                                        aria-label={t('common.close')}
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            {/* Settings Panel */}
                            <AnimatePresence>
                                {showSettings && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.3 }}
                                        className="overflow-hidden"
                                    >
                                        <div className="border-t border-gray-100 bg-gray-50 p-6">
                                            <div className="space-y-4">
                                                {/* Necessary Cookies */}
                                                <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-100">
                                                    <div className="flex items-center gap-3">
                                                        <div className="p-2 bg-green-100 rounded-lg">
                                                            <Shield className="w-4 h-4 text-green-600" />
                                                        </div>
                                                        <div>
                                                            <h4 className="font-medium text-gray-900">{t('common.cookieConsent.necessary.title')}</h4>
                                                            <p className="text-xs text-gray-500">{t('common.cookieConsent.necessary.desc')}</p>
                                                        </div>
                                                    </div>
                                                    <div className="relative">
                                                        <input
                                                            type="checkbox"
                                                            checked={true}
                                                            disabled
                                                            className="sr-only peer"
                                                        />
                                                        <div className="w-11 h-6 bg-green-500 rounded-full cursor-not-allowed opacity-70"></div>
                                                        <div className="absolute left-[22px] top-0.5 w-5 h-5 bg-white rounded-full shadow-sm"></div>
                                                    </div>
                                                </div>

                                                {/* Analytics Cookies */}
                                                <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-100">
                                                    <div className="flex items-center gap-3">
                                                        <div className="p-2 bg-blue-100 rounded-lg">
                                                            <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                                            </svg>
                                                        </div>
                                                        <div>
                                                            <h4 className="font-medium text-gray-900">{t('common.cookieConsent.analytics.title')}</h4>
                                                            <p className="text-xs text-gray-500">{t('common.cookieConsent.analytics.desc')}</p>
                                                        </div>
                                                    </div>
                                                    <label className="relative inline-flex cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={preferences.analytics}
                                                            onChange={(e) => setPreferences({ ...preferences, analytics: e.target.checked })}
                                                            className="sr-only peer"
                                                        />
                                                        <div className="w-11 h-6 bg-gray-200 peer-focus:ring-4 peer-focus:ring-indigo-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                                                    </label>
                                                </div>

                                                {/* Marketing Cookies */}
                                                <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-100">
                                                    <div className="flex items-center gap-3">
                                                        <div className="p-2 bg-purple-100 rounded-lg">
                                                            <svg className="w-4 h-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                                                            </svg>
                                                        </div>
                                                        <div>
                                                            <h4 className="font-medium text-gray-900">{t('common.cookieConsent.marketing.title')}</h4>
                                                            <p className="text-xs text-gray-500">{t('common.cookieConsent.marketing.desc')}</p>
                                                        </div>
                                                    </div>
                                                    <label className="relative inline-flex cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={preferences.marketing}
                                                            onChange={(e) => setPreferences({ ...preferences, marketing: e.target.checked })}
                                                            className="sr-only peer"
                                                        />
                                                        <div className="w-11 h-6 bg-gray-200 peer-focus:ring-4 peer-focus:ring-indigo-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                                                    </label>
                                                </div>

                                                {/* Save Button */}
                                                <div className="flex justify-end pt-2">
                                                    <button
                                                        onClick={handleSavePreferences}
                                                        className="px-6 py-2.5 bg-indigo-600 text-white rounded-full text-sm font-medium hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
                                                    >
                                                        {t('common.cookieConsent.save')}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default CookieConsent;
