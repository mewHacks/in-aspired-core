// Terms of service page with expandable legal sections
import React from 'react';
import { useTranslation } from 'react-i18next';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import ScrollRevelation from '../components/ui/ScrollRevelation';
import { FileText, Scale, AlertTriangle, Ban, RefreshCw, Gavel, Globe, Mail, LucideIcon } from 'lucide-react';

// Type definitions for terms content
interface ContentItem {
    subtitle?: string;
    text?: string;
    list?: string[];
}

interface TermsSection {
    id: string;
    icon: LucideIcon;
    title: string;
    navLabel: string;
    content: ContentItem[];
}

const TermsOfServicePage: React.FC = () => {
    const { t } = useTranslation();

    // Last updated date
    const lastUpdated = import.meta.env.VITE_LAST_UPDATED || "December 14, 2025";

    // Terms sections data
    const sections: TermsSection[] = [
        {
            id: "acceptance",
            icon: FileText,
            title: t('terms.sections.acceptance.title'),
            navLabel: t('terms.sections.acceptance.navLabel'),
            content: [
                {
                    text: t('terms.sections.acceptance.content.text1')
                },
                {
                    subtitle: t('terms.sections.acceptance.content.sub1'),
                    text: t('terms.sections.acceptance.content.text2')
                },
                {
                    subtitle: t('terms.sections.acceptance.content.sub2'),
                    text: t('terms.sections.acceptance.content.text3')
                }
            ]
        },
        {
            id: "eligibility",
            icon: Scale,
            title: t('terms.sections.eligibility.title'),
            navLabel: t('terms.sections.eligibility.navLabel'),
            content: [
                {
                    subtitle: t('terms.sections.eligibility.content.sub1'),
                    text: t('terms.sections.eligibility.content.text1')
                },
                {
                    subtitle: t('terms.sections.eligibility.content.sub2'),
                    text: t('terms.sections.eligibility.content.text2')
                }
            ]
        },
        {
            id: "services",
            icon: Globe,
            title: t('terms.sections.services.title'),
            navLabel: t('terms.sections.services.navLabel'),
            content: [
                {
                    subtitle: t('terms.sections.services.content.sub1'),
                    text: t('terms.sections.services.content.text1')
                },
                {
                    subtitle: t('terms.sections.services.content.sub2'),
                    text: t('terms.sections.services.content.text2')
                },
                {
                    subtitle: t('terms.sections.services.content.sub3'),
                    text: t('terms.sections.services.content.text3')
                }
            ]
        },
        {
            id: "conduct",
            icon: Ban,
            title: t('terms.sections.conduct.title'),
            navLabel: t('terms.sections.conduct.navLabel'),
            content: [
                {
                    text: t('terms.sections.conduct.content.text1')
                },
                {
                    list: t('terms.sections.conduct.content.list', { returnObjects: true }) as string[]
                }
            ]
        },
        {
            id: "intellectual",
            icon: Gavel,
            title: t('terms.sections.intellectual.title'),
            navLabel: t('terms.sections.intellectual.navLabel'),
            content: [
                {
                    subtitle: t('terms.sections.intellectual.content.sub1'),
                    text: t('terms.sections.intellectual.content.text1')
                },
                {
                    subtitle: t('terms.sections.intellectual.content.sub2'),
                    text: t('terms.sections.intellectual.content.text2')
                },
                {
                    subtitle: t('terms.sections.intellectual.content.sub3'),
                    text: t('terms.sections.intellectual.content.text3')
                }
            ]
        },
        {
            id: "disclaimers",
            icon: AlertTriangle,
            title: t('terms.sections.disclaimers.title'),
            navLabel: t('terms.sections.disclaimers.navLabel'),
            content: [
                {
                    subtitle: t('terms.sections.disclaimers.content.sub1'),
                    text: t('terms.sections.disclaimers.content.text1')
                },
                {
                    subtitle: t('terms.sections.disclaimers.content.sub2'),
                    text: t('terms.sections.disclaimers.content.text2')
                },
                {
                    subtitle: t('terms.sections.disclaimers.content.sub3'),
                    text: t('terms.sections.disclaimers.content.text3')
                },
                {
                    subtitle: t('terms.sections.disclaimers.content.sub4'),
                    text: t('terms.sections.disclaimers.content.text4')
                }
            ]
        },
        {
            id: "termination",
            icon: RefreshCw,
            title: t('terms.sections.termination.title'),
            navLabel: t('terms.sections.termination.navLabel'),
            content: [
                {
                    text: t('terms.sections.termination.content.text1')
                },
                {
                    text: t('terms.sections.termination.content.text2')
                }
            ]
        }
    ];

    return (
        <div className="min-h-screen bg-white dark:bg-gray-950">
            <Navbar />

            {/* Hero Section */}
            <section className="pt-32 pb-16 px-4 bg-gradient-to-b from-amber-50/50 to-white dark:from-amber-950/20 dark:to-gray-950 relative overflow-hidden">
                {/* Background decoration */}
                <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-amber-100/30 dark:bg-amber-900/20 rounded-full blur-3xl -translate-y-1/2 -translate-x-1/4 pointer-events-none"></div>

                <div className="max-w-4xl mx-auto text-center relative z-10">
                    <ScrollRevelation>
                        <div className="inline-flex items-center gap-2 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-4 py-2 rounded-full mb-6">
                            <Scale className="w-4 h-4" />
                            <span className="text-sm font-medium">{t('terms.hero.badge')}</span>
                        </div>
                        <h1 className="text-4xl md:text-5xl font-serif font-bold text-gray-900 dark:text-gray-100 mb-6">
                            {t('terms.hero.title')}
                        </h1>
                        <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto mb-4">
                            {t('terms.hero.description')}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-500">
                            {t('terms.hero.lastUpdated', { date: lastUpdated })}
                        </p>
                    </ScrollRevelation>
                </div>
            </section>

            {/* Quick Navigation */}
            <section className="py-8 border-b border-gray-100 dark:border-gray-800 sticky top-16 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md z-40">
                <div className="max-w-4xl mx-auto px-4">
                    <div className="flex flex-wrap justify-center gap-3">
                        {sections.map((section) => (
                            <a
                                key={section.id}
                                href={`#${section.id}`}
                                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-amber-700 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/30 rounded-full transition-colors"
                                aria-label={t('terms.nav.ariaLabel', { title: section.title })}
                            >
                                <section.icon className="w-4 h-4" />
                                {section.navLabel}
                            </a>
                        ))}
                    </div>
                </div>
            </section>

            {/* Terms Content */}
            <section className="py-16">
                <div className="max-w-4xl mx-auto px-4 space-y-16">
                    {sections.map((section, idx) => (
                        <ScrollRevelation key={section.id} delay={idx * 0.1}>
                            <div id={section.id} className="scroll-mt-32">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="p-3 bg-amber-50 dark:bg-amber-900/30 rounded-xl text-amber-700 dark:text-amber-400">
                                        <section.icon className="w-6 h-6" />
                                    </div>
                                    <h2 className="text-2xl font-serif font-bold text-gray-900 dark:text-gray-100">
                                        {section.title}
                                    </h2>
                                </div>

                                <div className="space-y-6 pl-0 md:pl-14">
                                    {section.content.map((item, itemIdx) => (
                                        <div key={itemIdx} className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-6 border border-gray-100 dark:border-gray-700">
                                            {item.subtitle && (
                                                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                                                    {item.subtitle}
                                                </h3>
                                            )}
                                            {item.text && (
                                                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                                                    {item.text}
                                                </p>
                                            )}
                                            {item.list && Array.isArray(item.list) && (
                                                <ul className="space-y-2 mt-2">
                                                    {item.list.map((listItem, listIdx) => (
                                                        <li key={listIdx} className="flex items-start gap-2 text-gray-600 dark:text-gray-400">
                                                            <span className="text-amber-500 dark:text-amber-400 mt-1">•</span>
                                                            {listItem}
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </ScrollRevelation>
                    ))}

                    {/* Governing Law */}
                    <ScrollRevelation delay={0.7}>
                        <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 rounded-3xl p-8 md:p-12">
                            <div className="flex items-start gap-4">
                                <div className="p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm text-amber-700 dark:text-amber-400">
                                    <Gavel className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-serif font-bold text-gray-900 dark:text-gray-100 mb-3">
                                        {t('terms.governing_law.title')}
                                    </h3>
                                    <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                                        {t('terms.governing_law.description')}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </ScrollRevelation>

                    {/* Contact Section */}
                    <ScrollRevelation delay={0.8}>
                        <div className="text-center py-8">
                            <h2 className="text-2xl font-serif font-bold text-gray-900 dark:text-gray-100 mb-4">
                                {t('terms.contact.title')}
                            </h2>
                            <p className="text-gray-600 dark:text-gray-400 mb-6">
                                {t('terms.contact.description')}
                            </p>
                            <a
                                href="mailto:legal@in-aspired.com?subject=Terms%20of%20Service%20Inquiry"
                                className="inline-flex items-center gap-2 bg-amber-600 dark:bg-amber-600 text-white px-6 py-3 rounded-full font-medium hover:bg-amber-700 dark:hover:bg-amber-700 transition-colors"
                            >
                                <Mail className="w-4 h-4" />
                                legal@in-aspired.com
                            </a>
                        </div>
                    </ScrollRevelation>
                </div>
            </section>

            <Footer />
        </div>
    );
};

export default TermsOfServicePage;