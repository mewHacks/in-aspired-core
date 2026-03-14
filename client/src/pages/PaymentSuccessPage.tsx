import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle2, Mail, Home, ArrowRight } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { useTranslation } from 'react-i18next';

// Payment Success Page
const PaymentSuccessPage: React.FC = () => {

    // For navigation to home page and courses page
    const navigate = useNavigate();
    const { t } = useTranslation();

    // Countdown timer after 15 seconds
    const [countdown, setCountdown] = useState(15);

    useEffect(() => {

        // Set interval to count down
        const timer = setInterval(() => {
            setCountdown((prev) => {
                // If countdown reaches 0, navigate to home page
                if (prev <= 1) {
                    clearInterval(timer);
                    navigate('/', { replace: true });
                    return 0;
                }
                return prev - 1; // Decrement countdown
            });
        }, 1000); // every second

        return () => clearInterval(timer);
    }, [navigate]);

    return (
        // Render JSX
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-950 dark:to-indigo-950 flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="max-w-2xl w-full"
            >
                {/* Success Card */}
                <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
                    {/* Header with gradient */}
                    <div className="bg-gradient-to-r from-green-500 to-emerald-500 dark:from-green-600 dark:to-emerald-600 p-8 text-center">
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                            className="inline-flex items-center justify-center w-20 h-20 bg-white dark:bg-gray-900 rounded-full mb-4"
                        >
                            <CheckCircle2 className="w-12 h-12 text-green-500 dark:text-green-500" />
                        </motion.div>
                        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
                            {t('premium.success.title')}
                        </h1>
                        <p className="text-green-50 dark:text-green-100 text-lg">
                            {t('premium.success.subtitle')}
                        </p>
                    </div>

                    {/* Content */}
                    <div className="p-8 md:p-12">
                        {/* What's Next Section */}
                        <div className="mb-8">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">{t('premium.success.nextTitle')}</h2>

                            <div className="space-y-4">
                                {/* Step 1 */}
                                <motion.div
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.3 }}
                                    className="flex gap-4 items-start"
                                >
                                    <div className="flex-shrink-0 w-8 h-8 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center">
                                        <span className="text-indigo-600 dark:text-indigo-400 font-bold text-sm">1</span>
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{t('premium.success.step1Title')}</h3>
                                        <p className="text-gray-600 dark:text-gray-400 text-sm">
                                            {t('premium.success.step1Desc')}
                                        </p>
                                    </div>
                                </motion.div>

                                {/* Step 2 */}
                                <motion.div
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.4 }}
                                    className="flex gap-4 items-start"
                                >
                                    <div className="flex-shrink-0 w-8 h-8 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center">
                                        <span className="text-indigo-600 dark:text-indigo-400 font-bold text-sm">2</span>
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{t('premium.success.step2Title')}</h3>
                                        <p className="text-gray-600 dark:text-gray-400 text-sm">
                                            {t('premium.success.step2Desc')}
                                        </p>
                                    </div>
                                </motion.div>

                                {/* Step 3 */}
                                <motion.div
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.5 }}
                                    className="flex gap-4 items-start"
                                >
                                    <div className="flex-shrink-0 w-8 h-8 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center">
                                        <span className="text-indigo-600 dark:text-indigo-400 font-bold text-sm">3</span>
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{t('premium.success.step3Title')}</h3>
                                        <p className="text-gray-600 dark:text-gray-400 text-sm">
                                            {t('premium.success.step3Desc')}
                                        </p>
                                    </div>
                                </motion.div>
                            </div>
                        </div>

                        {/* Email Reminder Box */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.6 }}
                            className="bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800 rounded-xl p-6 mb-8"
                        >
                            <div className="flex items-start gap-3">
                                <Mail className="w-5 h-5 text-indigo-600 dark:text-indigo-400 mt-0.5 flex-shrink-0" />
                                <div>
                                    <h3 className="font-semibold text-indigo-900 dark:text-indigo-300 mb-1">{t('premium.success.noEmailTitle')}</h3>
                                    <p className="text-sm text-indigo-700 dark:text-indigo-400">
                                        {t('premium.success.noEmailDesc')}
                                    </p>
                                </div>
                            </div>
                        </motion.div>

                        {/* Auto-redirect notice */}
                        <div className="text-center mb-6">
                            <p className="text-gray-500 dark:text-gray-400 text-sm">
                                {t('premium.success.redirecting', { count: countdown }).split(countdown.toString())[0]}
                                <span className="font-bold text-indigo-600 dark:text-indigo-400">{countdown}</span>
                                {t('premium.success.redirecting', { count: countdown }).split(countdown.toString())[1] || ''}
                            </p>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-col sm:flex-row gap-3">
                            <Button
                                variant="primary"
                                size="lg"
                                onClick={() => navigate('/', { replace: true })}
                                className="flex-1 justify-center"
                            >
                                <Home className="w-5 h-5 mr-2" />
                                {t('premium.success.btnHome')}
                            </Button>
                            <Button
                                variant="outline"
                                size="lg"
                                onClick={() => navigate('/courses')}
                                className="flex-1 justify-center border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                            >
                                {t('premium.success.btnCourses')}
                                <ArrowRight className="w-5 h-5 ml-2" />
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Footer Note */}
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.8 }}
                    className="text-center text-gray-500 dark:text-gray-400 text-sm mt-6"
                >
                    {t('premium.success.footerHelp')}{' '}
                    <a href="mailto:inaspired.official@gmail.com" className="text-indigo-600 dark:text-indigo-400 hover:underline">
                        inaspired.official@gmail.com
                    </a>
                </motion.p>
            </motion.div>
        </div>
    );
};

// Export component
export default PaymentSuccessPage;