// Help/FAQ page with searchable accordion questions
import React, { useState } from 'react';
import { SearchBar } from '../components/ui/SearchBar';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import ScrollRevelation from '@/components/ui/ScrollRevelation';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle, ChevronDown, MessageCircle, Rocket, Brain, BookOpen, Users, Shield, Wrench, GraduationCap } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

// Reusable FAQ item component
const FaqItem = ({ question, answer }: { question: string; answer: string }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="border-b border-gray-100 dark:border-gray-800 last:border-0">
            <button
                className="w-full py-5 flex items-center justify-between text-left focus:outline-none group bg-transparent"
                onClick={() => setIsOpen(!isOpen)}
            >
                <span className={`font-medium text-lg transition-colors duration-200 ${isOpen ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-900 dark:text-gray-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400'}`}>
                    {question}
                </span>
                <div className={`p-2 rounded-full transition-all duration-200 ${isOpen ? 'bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rotate-180' : 'bg-gray-50 dark:bg-gray-800 text-gray-400 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-950 group-hover:text-indigo-600 dark:group-hover:text-indigo-400'}`}>
                    <ChevronDown className="w-5 h-5" />
                </div>
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2, ease: 'easeOut' }}
                        className="overflow-hidden"
                    >
                        <p className="pb-5 text-gray-600 dark:text-gray-400 leading-relaxed pr-8">
                            {answer}
                        </p>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

const HelpPage: React.FC = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');

    // Define FAQ categories with localized content
    const faqCategories = [
        {
            title: t('help.categories.gettingStarted.title'),
            icon: <Rocket className="w-5 h-5" />,
            faqs: t('help.categories.gettingStarted.faqs', { returnObjects: true }) as { question: string; answer: string }[]
        },
        {
            title: t('help.categories.riasec.title'),
            icon: <Brain className="w-5 h-5" />,
            faqs: t('help.categories.riasec.faqs', { returnObjects: true }) as { question: string; answer: string }[]
        },
        {
            title: t('help.categories.courses.title'),
            icon: <BookOpen className="w-5 h-5" />,
            faqs: t('help.categories.courses.faqs', { returnObjects: true }) as { question: string; answer: string }[]
        },
        {
            title: t('help.categories.rooms.title'),
            icon: <Users className="w-5 h-5" />,
            faqs: t('help.categories.rooms.faqs', { returnObjects: true }) as { question: string; answer: string }[]
        },
        {
            title: t('help.categories.chatbot.title'),
            icon: <MessageCircle className="w-5 h-5" />,
            faqs: t('help.categories.chatbot.faqs', { returnObjects: true }) as { question: string; answer: string }[]
        },
        {
            title: t('help.categories.privacy.title'),
            icon: <Shield className="w-5 h-5" />,
            faqs: t('help.categories.privacy.faqs', { returnObjects: true }) as { question: string; answer: string }[]
        },
        {
            title: t('help.categories.technical.title'),
            icon: <Wrench className="w-5 h-5" />,
            faqs: t('help.categories.technical.faqs', { returnObjects: true }) as { question: string; answer: string }[]
        },
        {
            title: t('help.categories.parents.title'),
            icon: <GraduationCap className="w-5 h-5" />,
            faqs: t('help.categories.parents.faqs', { returnObjects: true }) as { question: string; answer: string }[]
        }
    ];

    // Filter FAQs based on search query
    const filteredCategories = faqCategories.map(category => ({
        ...category,
        faqs: category.faqs.filter(faq =>
            faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
            faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
        )
    })).filter(category => category.faqs.length > 0);

    return (
        <div className="min-h-screen bg-white dark:bg-gray-950">
            <Navbar />

            {/* Header section */}
            <section className="pt-32 pb-12 px-4 bg-white dark:bg-gray-950 relative">
                <div className="max-w-3xl mx-auto text-center relative z-10">
                    <ScrollRevelation>
                        <div className="inline-flex items-center justify-center p-3 bg-indigo-50 dark:bg-indigo-950 rounded-2xl text-indigo-600 dark:text-indigo-400 mb-6">
                            <HelpCircle className="w-8 h-8" />
                        </div>
                        <h1 className="text-4xl md:text-5xl font-serif font-bold text-gray-900 dark:text-gray-100 mb-4 leading-tight">
                            {t('help.title', 'Frequently Asked Questions')}
                        </h1>
                        <p className="text-lg text-gray-600 dark:text-gray-400 max-w-xl mx-auto mb-8">
                            {t('help.subtitle', 'Quick answers to questions you may have about In-Aspired.')}
                        </p>

                        <div className="relative max-w-md mx-auto">
                            <SearchBar
                                value={searchQuery}
                                onChange={setSearchQuery}
                                placeholder={t('help.searchPlaceholder', 'Search our help center...')}
                            />
                        </div>
                    </ScrollRevelation>
                </div>
            </section>

            {/* FAQs display section */}
            <section className="pb-24 bg-white dark:bg-gray-950">
                <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
                    {filteredCategories.length > 0 ? (
                        <div className="space-y-12">
                            {filteredCategories.map((category, idx) => (
                                <ScrollRevelation key={idx} delay={idx * 0.1}>
                                    <div className="bg-white dark:bg-gray-950 rounded-3xl p-2 md:p-4">
                                        <div className="flex items-center gap-3 mb-4 px-2">
                                            <span className="p-2 bg-indigo-50 dark:bg-indigo-950 rounded-lg text-indigo-600 dark:text-indigo-400">
                                                {category.icon}
                                            </span>
                                            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{category.title}</h2>
                                        </div>

                                        <div className="border border-gray-100 dark:border-gray-800 rounded-2xl px-6 bg-white dark:bg-gray-900 shadow-sm">
                                            {category.faqs.map((faq, i) => (
                                                <FaqItem key={i} question={faq.question} answer={faq.answer} />
                                            ))}
                                        </div>
                                    </div>
                                </ScrollRevelation>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12">
                            <p className="text-gray-500 dark:text-gray-400">{t('help.noResults', 'No questions found matching your search.')}</p>
                            <Button variant="ghost" className="mt-2 text-indigo-600 dark:text-indigo-400" onClick={() => setSearchQuery('')}>
                                {t('help.clearSearch', 'Clear Search')}
                            </Button>
                        </div>
                    )}
                </div>
            </section>

            {/* Still need help section */}
            <section className="py-20 bg-gray-50 dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800">
                <div className="max-w-4xl mx-auto px-4 text-center">
                    <ScrollRevelation>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">{t('help.stillHaveQuestions', 'Still have questions?')}</h2>
                        <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-xl mx-auto">
                            {t('help.cantFindAnswer', "Can't find the answer you're looking for? Please chat to our friendly team.")}
                        </p>

                        <Button variant="primary" size="lg" onClick={() => navigate('/contact')} className="inline-flex items-center gap-2">
                            <MessageCircle className="w-5 h-5" />
                            {t('help.getInTouch', 'Get in Touch')}
                        </Button>
                    </ScrollRevelation>
                </div>
            </section>

            <Footer />
        </div>
    );
};

export default HelpPage;