// Forgot password page — sends password reset email via API
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, Shield } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { LogoHeader } from '../components/ui/LogoHeader';
import { FloatingBackButton } from '../components/ui/FloatingBackButton';
import { validateEmail } from '../utils/validators';
import { API_BASE_URL } from '../config';
import { useTranslation } from 'react-i18next';

const ForgotPasswordPage: React.FC = () => {
    const { t } = useTranslation();
    const [email, setEmail] = useState(''); // Stores user email input
    const [error, setError] = useState('');  // Stores validation or server error message
    const [touched, setTouched] = useState(false); // Tracks if email input has been interacted with, for UX
    const [isLoading, setIsLoading] = useState(false); // Shows loading state during API call
    const [isSubmitted, setIsSubmitted] = useState(false); // Toggles UI after a successful reset request

    // Handles email input changes in real-time
    // Validates the input and displays error if invalid
    const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setEmail(e.target.value);
        if (touched) {
            const validation = validateEmail(e.target.value);
            setError(validation.error || '');
        }
    };

    // Blur handler when user leaves the input field
    const handleBlur = () => {
        setTouched(true);
        const validation = validateEmail(email);
        setError(validation.error || '');
    };

    // Handles form submission
    const handleSubmit = async (e: React.FormEvent) => {

        e.preventDefault(); // Prevents browser from reloading 

        // Validate email input
        if (!email || error) {
            setError('Please enter a valid email address');
            return;
        }

        // API request to send reset password email

        setIsLoading(true); // Set loading state

        try {
            // Sends a POST request to the backend with the email
            // If successful, send a password reset email
            const response = await fetch(`${API_BASE_URL}/api/auth/forgotpassword`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email }),
            });

            // Handles response
            const data = await response.json(); // Parse response as JSON

            // If the backend returns failure, throw error
            if (!response.ok) {
                throw new Error(data.message || 'Something went wrong');
            }

            setIsSubmitted(true);

        } catch (err: any) {
            setError(err.message || 'Failed to send reset email'); // Displays server or network error
        } finally {
            setIsLoading(false); // Always stop loading indicator
        }
    };

    return (
        <div className="min-h-screen bg-white dark:bg-gray-950 flex flex-col">

            {/* Floating back button to return to login page */}
            <FloatingBackButton />

            <main className="flex-grow flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative">
                {/* Background decorations */}
                <div className="absolute top-0 right-0 -z-10 opacity-20 dark:opacity-10 transform translate-x-1/3 -translate-y-1/4">
                    <div className="w-[600px] h-[600px] bg-gradient-to-br from-primary-400 to-secondary-400 rounded-full blur-3xl animate-float"></div>
                </div>
                <div className="absolute bottom-0 left-0 -z-10 opacity-20 dark:opacity-10 transform -translate-x-1/3 translate-y-1/4">
                    <div className="w-[500px] h-[500px] bg-gradient-to-tr from-secondary-300 to-primary-300 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }}></div>
                </div>

                <div className="max-w-md w-full space-y-8">
                    {/* Logo header for branding*/}
                    <LogoHeader
                        title={t('ui.logoHeader.title')}
                        subtitle={t('auth.recovery.resetTitle')}
                        size="md"
                    />

                    {/* Page title */}
                    <h2 className="mt-6 text-4xl font-bold text-gray-900 dark:text-gray-100 font-serif text-center">
                        {t('auth.recovery.forgotTitle')}
                    </h2>

                    {/* Page subtitle */}
                    <p className="mt-3 text-lg text-gray-600 dark:text-gray-400 text-center">
                        {t('auth.recovery.forgotSubtitle')}
                    </p>

                    {/* Main email input form for resetting password */}
                    <Card withAnimation className="p-8 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
                        {!isSubmitted ? ( // If not submitted yet, show form
                            <form className="space-y-6" onSubmit={handleSubmit}>
                                <Input
                                    icon={Mail}
                                    label={t('auth.login.emailLabel')}
                                    type="email"
                                    name="email"
                                    value={email}
                                    onChange={handleEmailChange}
                                    onBlur={handleBlur}
                                    placeholder={t('auth.login.emailPlaceholder')}
                                    required // Required field
                                    error={error} //Passes an error message
                                    success={touched && !error && email.length > 0}
                                />

                                <Button
                                    type="submit"
                                    variant="primary"
                                    size="lg"
                                    className="w-full shadow-primary-500/30 hover:shadow-primary-600/40 transition-all duration-200"
                                    isLoading={isLoading}
                                    disabled={!!error || !email}
                                >
                                    {t('auth.recovery.requestResetLink')}
                                </Button>
                            </form>
                        ) : ( // If submitted, show success message and retry button
                            <div className="text-center space-y-6">
                                <div className="bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-300 p-4 rounded-lg border border-green-200 dark:border-green-800">
                                    <p className="font-medium">{t('auth.recovery.resetLinkSent')}</p>
                                    <p className="text-sm mt-1">{t('auth.recovery.checkEmail')}</p>
                                </div>
                                <Button
                                    variant="outline"
                                    className="w-full border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                                    onClick={() => setIsSubmitted(false)}
                                >
                                    {t('auth.recovery.tryAnotherEmail')}
                                </Button>
                            </div>
                        )}

                        {/* Back to login button */}
                        <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-800 text-center">
                            <Link to="/login" className="inline-flex items-center text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors">
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                {t('auth.recovery.backToLogin')}
                            </Link>
                        </div>
                    </Card>

                    {/* Security badge */}
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-center">
                        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                            <Shield className="h-4 w-4 text-green-500 dark:text-green-400" />
                            <span>{t('auth.security.secure')}</span>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default ForgotPasswordPage;