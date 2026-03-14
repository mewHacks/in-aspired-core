// Site-wide footer with navigation links and social media icons
import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const Footer: React.FC = () => {
    const { t } = useTranslation();
    return (
        <footer className="bg-dark-900 text-white py-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex flex-col md:flex-row justify-between items-center">
                    <div className="flex items-center gap-2 mb-6 md:mb-0">
                        <img src="/assets/icons/logo_dark.svg" alt="Logo" className="h-8 w-8" />
                        <div className="font-serif text-xl font-bold tracking-tight">In-Aspired</div>
                    </div>
                    <div className="flex gap-8 text-gray-400 text-sm">
                        <Link to="/privacy" className="hover:text-white transition-colors">{t('footer.privacy')}</Link>
                        <Link to="/terms" className="hover:text-white transition-colors">{t('footer.terms')}</Link>
                        <Link to="/help" className="hover:text-white transition-colors">{t('footer.help')}</Link>
                        <Link to="/contact" className="hover:text-white transition-colors">{t('footer.contact')}</Link>
                    </div>
                </div>
                <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-500 text-sm">
                    © {new Date().getFullYear()} In-Aspired. {t('footer.rights')}
                </div>
            </div>
        </footer>
    );
};

export default Footer;
