import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, ChevronRight, Star, Activity, Sparkles, Target, Zap, Users, Flag, Rocket } from 'lucide-react';
import { Button } from '../ui/Button';
import { httpClient } from '../../services/httpClient';
import { useTranslation } from 'react-i18next';

// Premium Analysis section component for monetization
const PremiumAnalysisSection: React.FC = () => {
    const { t } = useTranslation();

    // Tracks loading state
    const [isLoading, setIsLoading] = useState(false);

    // Track if user is in waitlist modal (Fallback)
    const [isWaitlistModalOpen, setIsWaitlistModalOpen] = useState(false);

    // Track user's email and submission status (for waitlist as fallback)
    const [email, setEmail] = useState('');
    const [isSubmitted, setIsSubmitted] = useState(false);

    // Premium table of contents data
    const premiumSections = [
        { // Personality Overview
            icon: <Zap className="w-5 h-5 text-amber-500" />,
            title: t('premium.analysis.sections.personality.title'),
            subtitle: t('premium.analysis.sections.personality.subtitle'),
            description: t('premium.analysis.sections.personality.desc')
        },
        { // Career Compatibility Matrix
            icon: <Rocket className="w-5 h-5 text-blue-500" />,
            title: t('premium.analysis.sections.career.title'),
            subtitle: t('premium.analysis.sections.career.subtitle'),
            description: t('premium.analysis.sections.career.desc')
        },
        { // Course Recommendations
            icon: <Target className="w-5 h-5 text-emerald-500" />,
            title: t('premium.analysis.sections.course.title'),
            subtitle: t('premium.analysis.sections.course.subtitle'),
            description: t('premium.analysis.sections.course.desc')
        },
        { // Soft Skills & Action Plan
            icon: <Activity className="w-5 h-5 text-rose-500" />,
            title: t('premium.analysis.sections.skills.title'),
            subtitle: t('premium.analysis.sections.skills.subtitle'),
            description: t('premium.analysis.sections.skills.desc')
        },
        { // Workplace Environment Fit
            icon: <Users className="w-5 h-5 text-indigo-500" />,
            title: t('premium.analysis.sections.workplace.title'),
            subtitle: t('premium.analysis.sections.workplace.subtitle'),
            description: t('premium.analysis.sections.workplace.desc')
        },
        { // Personal Growth Timeline
            icon: <Flag className="w-5 h-5 text-cyan-500" />,
            title: t('premium.analysis.sections.growth.title'),
            subtitle: t('premium.analysis.sections.growth.subtitle'),
            description: t('premium.analysis.sections.growth.desc')
        },
        { // Fun Insights (to better attract students)
            icon: <Sparkles className="w-5 h-5 text-purple-500" />,
            title: t('premium.analysis.sections.insights.title'),
            subtitle: t('premium.analysis.sections.insights.subtitle'),
            description: t('premium.analysis.sections.insights.desc')
        }
    ];

    // Triggers when user click unlock full report button
    const handleUnlock = async () => {

        // Show loading indicator
        setIsLoading(true);

        try {
            // Call backend to generate Checkout URL
            const res = await httpClient('/api/payment/checkout', { method: 'POST' });

            // If there is no backend error
            if (res.ok) {
                const data = await res.json();
                if (data.url) {  // Redirect to LemonSqueezy hosted checkout
                    window.location.href = data.url;
                } else { // If checkout fails, fallback to waiting list
                    console.error('No checkout URL received');
                    setIsWaitlistModalOpen(true);
                }
            } else { // If there is a backend error, fallback to waiting list
                console.error('Checkout failed');
                setIsWaitlistModalOpen(true);
            }
        } catch (error) { // If there is a frontend error, fallback to waiting list
            console.error('Checkout error:', error);
            setIsWaitlistModalOpen(true);
        } finally { // Always hide loading indicator
            setIsLoading(false);
        }
    };

    // Triggers when user submit waitlist form
    const handleSubmitWaitlist = async (e: React.FormEvent) => {
        e.preventDefault(); // Prevent page reload
        try {
            const res = await httpClient('/api/payment/waitlist', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });
            if (res.ok) {
                setIsSubmitted(true);
            } else {
                console.error('Waitlist submission failed');
                setIsSubmitted(true); // Still show success to avoid frustrating the user
            }
        } catch (error) {
            console.error('Waitlist submission error:', error);
            setIsSubmitted(true); // Still show success UI
        }
    };

    return (
        // Render JSX
        <section className="relative w-full max-w-4xl mx-auto my-16 px-4">

            {/* Header */}
            <div className="text-center mb-8">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-sm font-semibold mb-4">
                    <Star className="w-4 h-4 fill-indigo-500 dark:fill-indigo-400 text-indigo-500 dark:text-indigo-400" />
                    {t('premium.analysis.tag')}
                </div>
                <h2 className="text-3xl md:text-4xl font-serif font-bold text-gray-900 dark:text-gray-100 mb-4">
                    {t('premium.analysis.title')}
                </h2>
                <p className="text-gray-600 dark:text-gray-400 max-w-xl mx-auto">
                    {t('premium.analysis.subtitle')}
                </p>
            </div>

            {/* Locked Content Container with Animated Neon Border */}
            <div className="neon-border-container shadow-2xl dark:shadow-gray-900/50">
                {/* The Rotating Neon Beam */}
                <div className="neon-border-beam" />

                {/* The Content Mask (White Background) */}
                <div className="neon-content-mask dark:bg-gray-900 overflow-hidden">
                    {/* The "blurred" list behind the overlay */}
                    <div className="p-8 filter blur-[6px] select-none pointer-events-none opacity-60">
                        <div className="space-y-6">
                            {premiumSections.map((section, idx) => (
                                <div key={idx} className="flex items-start gap-4 p-4 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50">
                                    <div className="p-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                                        {React.cloneElement(section.icon as React.ReactElement, { 
                                            className: section.icon.props.className.replace('text-', 'dark:text-').replace('-500', '-400')
                                        })}
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-bold text-gray-900 dark:text-gray-100">{section.title}</h3>
                                        <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400 mb-1">{section.subtitle}</p>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">{section.description}</p>
                                    </div>
                                    <ChevronRight className="w-5 h-5 text-gray-300 dark:text-gray-600 mt-2" />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* The Absolute Overlay (Mobile Responsive) */}
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-gradient-to-b from-white/30 via-white/80 to-white dark:from-gray-900/30 dark:via-gray-900/80 dark:to-gray-900 backdrop-blur-[2px] p-6 text-center">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            whileInView={{ scale: 1, opacity: 1 }}
                            className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-md border border-white/50 dark:border-gray-700/50 shadow-[0_8px_30px_rgb(0,0,0,0.12)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.3)] p-8 rounded-2xl max-w-sm w-full"
                        >
                            <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 dark:from-indigo-600 dark:to-purple-700 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-indigo-200 dark:shadow-indigo-900/30">
                                <Lock className="w-8 h-8 text-white" />
                            </div>

                            <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Advanced Analysis</h3>
                            <p className="text-gray-600 dark:text-gray-400 mb-6 text-sm leading-relaxed">
                                {t('premium.analysis.advancedDesc')}
                            </p>

                            <Button
                                variant="primary"
                                size="lg"
                                className="w-full justify-center shadow-indigo-200 dark:shadow-indigo-900/30 shadow-md group"
                                onClick={handleUnlock}
                                disabled={isLoading}
                            >
                                {isLoading ? t('premium.analysis.loading') : t('premium.analysis.unlockBtn')}
                                {!isLoading && <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />}
                            </Button>
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-4">
                                {t('premium.analysis.limitedTime')}
                            </p>
                        </motion.div>
                    </div>
                </div>
            </div>

            {/* Waitlist Modal (Fallback if payment fails) */}
            <AnimatePresence>
                {isWaitlistModalOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 dark:bg-black/80 backdrop-blur-sm p-4"
                        onClick={() => setIsWaitlistModalOpen(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl p-8 max-w-md w-full relative overflow-hidden"
                        >
                            {/* Decorative background blob */}
                            <div className="absolute -top-20 -right-20 w-64 h-64 bg-indigo-50 dark:bg-indigo-900/20 rounded-full blur-3xl opacity-50 pointer-events-none" />

                            {!isSubmitted ? (
                                <>
                                    <div className="relative">
                                        <h3 className="text-2xl font-serif font-bold text-gray-900 dark:text-gray-100 mb-2">Join the Waitlist</h3>
                                        <p 
                                            className="text-gray-600 dark:text-gray-400 mb-8"
                                            dangerouslySetInnerHTML={{ __html: t('premium.waitlist.desc') }}
                                        />

                                        <form onSubmit={handleSubmitWaitlist} className="space-y-4">
                                            <div>
                                                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('premium.waitlist.labelEmail')}</label>
                                                <input
                                                    type="email"
                                                    id="email"
                                                    required
                                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900/30 transition-all outline-none"
                                                    placeholder={t('premium.waitlist.phEmail', 'you@example.com')}
                                                    value={email}
                                                    onChange={(e) => setEmail(e.target.value)}
                                                />
                                            </div>

                                            <Button type="submit" variant="primary" className="w-full justify-center py-4 text-base">
                                                {t('premium.waitlist.btnNotify')}
                                            </Button>
                                        </form>
                                    </div>
                                    <button
                                        onClick={() => setIsWaitlistModalOpen(false)}
                                        className="absolute top-4 right-4 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 p-2"
                                    >
                                        ✕
                                    </button>
                                </>
                            ) : (
                                <div className="text-center py-12">
                                    <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce-short">
                                        <div className="text-2xl">🎉</div>
                                    </div>
                                    <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">You're on the list!</h3>
                                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                                        {t('premium.waitlist.successDesc')}
                                    </p>
                                    <Button variant="outline" onClick={() => setIsWaitlistModalOpen(false)} className="dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800">
                                        {t('premium.waitlist.btnClose')}
                                    </Button>
                                </div>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </section>
    );
};

export default PremiumAnalysisSection;