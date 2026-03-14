// Privacy policy page with expandable sections
import React from 'react';
import { useTranslation } from 'react-i18next';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import ScrollRevelation from '../components/ui/ScrollRevelation';
import { Shield, Lock, Eye, Users, Mail, FileText, Calendar } from 'lucide-react';

const PrivacyPolicyPage: React.FC = () => {
    const { t } = useTranslation();

    // Last updated date
    const lastUpdated = import.meta.env.VITE_LAST_UPDATED || "December 14, 2025";

    // Policy sections data
    const sections = [
        {
            id: "controller",
            icon: Shield,
            title: t('privacy.sections.controller.title'),
            navLabel: t('privacy.sections.controller.navLabel'),
            content: [
                {
                    subtitle: t('privacy.sections.controller.content.sub1'),
                    text: t('privacy.sections.controller.content.text1')
                },
                {
                    subtitle: t('privacy.sections.controller.content.sub2'),
                    text: t('privacy.sections.controller.content.text2')
                }
            ]
        },
        {
            id: "collection",
            icon: FileText,
            title: t('privacy.sections.collection.title'),
            navLabel: t('privacy.sections.collection.navLabel'),
            content: [
                {
                    subtitle: t('privacy.sections.collection.content.sub1'),
                    text: t('privacy.sections.collection.content.text1')
                },
                {
                    subtitle: t('privacy.sections.collection.content.sub2'),
                    text: t('privacy.sections.collection.content.text2')
                },
                {
                    subtitle: t('privacy.sections.collection.content.sub3'),
                    text: t('privacy.sections.collection.content.text3')
                },
                {
                    subtitle: t('privacy.sections.collection.content.sub4'),
                    text: t('privacy.sections.collection.content.text4')
                }
            ]
        },
        {
            id: "usage",
            icon: Eye,
            title: t('privacy.sections.usage.title'),
            navLabel: t('privacy.sections.usage.navLabel'),
            content: [
                {
                    subtitle: t('privacy.sections.usage.content.sub1'),
                    text: t('privacy.sections.usage.content.text1')
                },
                {
                    subtitle: t('privacy.sections.usage.content.sub2'),
                    text: t('privacy.sections.usage.content.text2')
                },
                {
                    subtitle: t('privacy.sections.usage.content.sub3'),
                    text: t('privacy.sections.usage.content.text3')
                }
            ]
        },
        {
            id: "legal-basis",
            icon: FileText,
            title: t('privacy.sections.legal_basis.title'),
            navLabel: t('privacy.sections.legal_basis.navLabel'),
            content: [
                {
                    subtitle: t('privacy.sections.legal_basis.content.sub1'),
                    text: t('privacy.sections.legal_basis.content.text1')
                },
                {
                    subtitle: t('privacy.sections.legal_basis.content.sub2'),
                    text: t('privacy.sections.legal_basis.content.text2')
                },
                {
                    subtitle: t('privacy.sections.legal_basis.content.sub3'),
                    text: t('privacy.sections.legal_basis.content.text3')
                }
            ]
        },
        {
            id: "sharing",
            icon: Users,
            title: t('privacy.sections.sharing.title'),
            navLabel: t('privacy.sections.sharing.navLabel'),
            content: [
                {
                    subtitle: t('privacy.sections.sharing.content.sub1'),
                    text: t('privacy.sections.sharing.content.text1')
                },
                {
                    subtitle: t('privacy.sections.sharing.content.sub2'),
                    text: t('privacy.sections.sharing.content.text2')
                },
                {
                    subtitle: t('privacy.sections.sharing.content.sub3'),
                    text: t('privacy.sections.sharing.content.text3')
                },
                {
                    subtitle: t('privacy.sections.sharing.content.sub4'),
                    text: t('privacy.sections.sharing.content.text4')
                }
            ]
        },
        {
            id: "security",
            icon: Lock,
            title: t('privacy.sections.security.title'),
            navLabel: t('privacy.sections.security.navLabel'),
            content: [
                {
                    subtitle: t('privacy.sections.security.content.sub1'),
                    text: t('privacy.sections.security.content.text1')
                },
                {
                    subtitle: t('privacy.sections.security.content.sub2'),
                    text: t('privacy.sections.security.content.text2')
                },
                {
                    subtitle: t('privacy.sections.security.content.sub3'),
                    text: t('privacy.sections.security.content.text3')
                }
            ]
        },
        {
            id: "rights",
            icon: Shield,
            title: t('privacy.sections.rights.title'),
            navLabel: t('privacy.sections.rights.navLabel'),
            content: [
                {
                    subtitle: t('privacy.sections.rights.content.sub1'),
                    text: t('privacy.sections.rights.content.text1')
                },
                {
                    subtitle: t('privacy.sections.rights.content.sub2'),
                    text: t('privacy.sections.rights.content.text2')
                },
                {
                    subtitle: t('privacy.sections.rights.content.sub3'),
                    text: t('privacy.sections.rights.content.text3')
                }
            ]
        },
        {
            id: "children",
            icon: Shield,
            title: t('privacy.sections.children.title'),
            navLabel: t('privacy.sections.children.navLabel'),
            content: [
                {
                    subtitle: t('privacy.sections.children.content.sub1'),
                    text: t('privacy.sections.children.content.text1')
                }
            ]
        },
        {
            id: "retention",
            icon: Calendar,
            title: t('privacy.sections.retention.title'),
            navLabel: t('privacy.sections.retention.navLabel'),
            content: [
                {
                    subtitle: t('privacy.sections.retention.content.sub1'),
                    text: t('privacy.sections.retention.content.text1')
                },
                {
                    subtitle: t('privacy.sections.retention.content.sub2'),
                    text: t('privacy.sections.retention.content.text2')
                }
            ]
        },
        {
            id: "changes",
            icon: Calendar,
            title: t('privacy.sections.changes.title'),
            navLabel: t('privacy.sections.changes.navLabel'),
            content: [
                {
                    subtitle: t('privacy.sections.changes.content.sub1'),
                    text: t('privacy.sections.changes.content.text1')
                }
            ]
        }
    ];

    return (
        <div className="min-h-screen bg-white dark:bg-gray-950">
            <Navbar />

            {/* Hero Section */}
            <section className="pt-32 pb-16 px-4 bg-gradient-to-b from-gray-50 dark:from-gray-900 to-white dark:to-gray-950 relative overflow-hidden">
                {/* Background decoration */}
                <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-indigo-100/30 dark:bg-indigo-900/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none"></div>

                <div className="max-w-4xl mx-auto text-center relative z-10">
                    <ScrollRevelation>
                        <div className="inline-flex items-center gap-2 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 px-4 py-2 rounded-full mb-6">
                            <Shield className="w-4 h-4" />
                            <span className="text-sm font-medium">{t('privacy.hero.badge')}</span>
                        </div>
                        <h1 className="text-4xl md:text-5xl font-serif font-bold text-gray-900 mb-6 dark:text-gray-100 mb-6">
                            {t('privacy.hero.title')}
                        </h1>
                        <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto mb-4">
                            {t('privacy.hero.description')}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-500">
                            {t('privacy.hero.lastUpdated', { date: lastUpdated })}
                        </p>
                    </ScrollRevelation>
                </div>
            </section>

            {/* Quick Navigation */}
            <section className="py-8 border-b border-gray-100 dark:border-gray-800 sticky top-16 bg-white/90 dark:bg-gray-950/90 backdrop-blur-md z-40">
                <div className="max-w-4xl mx-auto px-4">
                    <div className="flex flex-wrap justify-center gap-3">
                        {sections.map((section) => (
                            <a
                                key={section.id}
                                href={`#${section.id}`}
                                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950 rounded-full transition-colors"
                                aria-label={t('privacy.nav.ariaLabel', { title: section.title })}
                            >
                                <section.icon className="w-4 h-4" />
                                {section.navLabel}
                            </a>
                        ))}
                    </div>
                </div>
            </section>

            {/* Policy Content */}
            <section className="py-16">
                <div className="max-w-4xl mx-auto px-4 space-y-16">
                    {sections.map((section, idx) => (
                        <ScrollRevelation key={section.id} delay={idx * 0.1}>
                            <div id={section.id} className="scroll-mt-32">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="p-3 bg-indigo-50 dark:bg-indigo-950 rounded-xl text-indigo-600 dark:text-indigo-400">
                                        <section.icon className="w-6 h-6" />
                                    </div>
                                    <h2 className="text-2xl font-serif font-bold text-gray-900 dark:text-gray-100">
                                        {section.title}
                                    </h2>
                                </div>

                                <div className="space-y-6 pl-0 md:pl-14">
                                    {section.content.map((item, itemIdx) => (
                                        <div key={itemIdx} className="bg-gray-50 dark:bg-gray-900 rounded-2xl p-6 border border-gray-100 dark:border-gray-800">
                                            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                                                {item.subtitle}
                                            </h3>
                                            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                                                {item.text}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </ScrollRevelation>
                    ))}

                    {/* Contact Section */}
                    <ScrollRevelation delay={0.6}>
                        <div className="bg-gradient-to-br from-indigo-50 dark:from-indigo-950/50 to-sky-50 dark:to-sky-950/50 rounded-3xl p-8 md:p-12 text-center">
                            <div className="inline-flex items-center justify-center w-16 h-16 bg-white dark:bg-gray-800 rounded-2xl shadow-lg mb-6">
                                <Mail className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
                            </div>
                            <h2 className="text-2xl font-serif font-bold text-gray-900 dark:text-gray-100 mb-4">
                                {t('privacy.contact.title')}
                            </h2>
                            <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-lg mx-auto">
                                {t('privacy.contact.description')}
                            </p>
                            <a
                                href="mailto:privacy@in-aspired.com?subject=Privacy%20Policy%20Inquiry"
                                className="inline-flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-full font-medium hover:bg-indigo-700 transition-colors"
                            >
                                <Mail className="w-4 h-4" />
                                privacy@in-aspired.com
                            </a>
                        </div>
                    </ScrollRevelation>

                    {/* PDPA Compliance Notice */}
                    <ScrollRevelation delay={0.7}>
                        <div className="flex items-start gap-4 p-6 bg-green-50 dark:bg-green-950/30 border border-green-100 dark:border-green-900 rounded-2xl">
                            <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg text-green-600 dark:text-green-400">
                                <Shield className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-green-900 dark:text-green-400 mb-1">
                                    {t('privacy.pdpa.title')}
                                </h3>
                                <p className="text-green-800 dark:text-green-500 text-sm">
                                    {t('privacy.pdpa.description')}
                                </p>
                            </div>
                        </div>
                    </ScrollRevelation>
                </div>
            </section>

            <Footer />
        </div>
    );
};

export default PrivacyPolicyPage;