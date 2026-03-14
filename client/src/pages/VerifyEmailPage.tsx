// Email verification page — confirms user email via token from URL
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CheckCircle, XCircle, Mail, Shield, Loader } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { LogoHeader } from '../components/ui/LogoHeader';
import { API_BASE_URL } from '../config';
import { useTranslation } from 'react-i18next';

const VerifyEmailPage: React.FC = () => {
    const { t } = useTranslation();
    const { token } = useParams<{ token: string }>(); // Extract verification token from URL
    const navigate = useNavigate();

    // Tracks the current state of verification
    type VerifyStatus = 'loading' | 'success' | 'error';
    const [status, setStatus] = useState<VerifyStatus>('loading');

    // Error message from backend if verification fails
    const [errorMessage, setErrorMessage] = useState('');

    // For resend verification flow
    const [email, setEmail] = useState('');
    const [isResending, setIsResending] = useState(false);
    const [resendSuccess, setResendSuccess] = useState(false);
    const [resendError, setResendError] = useState('');

    // Automatically call verify endpoint when page loads with token
    useEffect(() => {
        const verifyEmail = async () => {
            // If no token in URL, show error immediately
            if (!token) {
                setStatus('error');
                setErrorMessage(t('auth.verify.noToken', 'No verification token found. Please check your email link.'));
                return;
            }

            try {
                // Call backend verify endpoint with token from URL
                const response = await fetch(`${API_BASE_URL}/api/auth/verify-email/${token}`, {
                    method: 'GET',
                });

                const data = await response.json();

                if (response.ok) {
                    // Token valid — email verified successfully
                    setStatus('success');

                    // Redirect to login after 3 seconds
                    setTimeout(() => {
                        navigate('/login');
                    }, 3000);
                } else {
                    // Token invalid or expired
                    setStatus('error');
                    setErrorMessage(data.message || t('auth.verify.invalidToken', 'Verification link is invalid or has expired.'));
                }
            } catch (err) {
                // Network or server error
                setStatus('error');
                setErrorMessage(t('auth.verify.serverError', 'Something went wrong. Please try again.'));
            }
        };

        verifyEmail();
    }, [token, navigate, t]); // Only runs once on mount

    // Handles resend verification email request
    const handleResend = async () => {
        // Require email input before resending
        if (!email.trim()) {
            setResendError(t('auth.verify.emailRequired', 'Please enter your email address.'));
            return;
        }

        setIsResending(true);
        setResendError('');
        setResendSuccess(false);

        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/resend-verification`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email.trim() })
            });

            const data = await response.json();

            if (response.ok) {
                setResendSuccess(true);
            } else {
                setResendError(data.message || t('auth.verify.resendError', 'Failed to resend email. Please try again.'));
            }
        } catch (err) {
            setResendError(t('auth.verify.serverError', 'Something went wrong. Please try again.'));
        } finally {
            setIsResending(false);
        }
    };

    return (
        <div className="min-h-screen bg-white dark:bg-gray-950 flex flex-col">
            <main className="flex-grow flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative">

                {/* Background decorations — same as other auth pages */}
                <div className="absolute top-0 right-0 -z-10 opacity-20 dark:opacity-10 transform translate-x-1/3 -translate-y-1/4">
                    <div className="w-[600px] h-[600px] bg-gradient-to-br from-primary-400 to-secondary-400 rounded-full blur-3xl animate-float"></div>
                </div>
                <div className="absolute bottom-0 left-0 -z-10 opacity-20 dark:opacity-10 transform -translate-x-1/3 translate-y-1/4">
                    <div className="w-[500px] h-[500px] bg-gradient-to-tr from-secondary-300 to-primary-300 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }}></div>
                </div>

                <div className="max-w-md w-full space-y-8">

                    {/* Logo header */}
                    <LogoHeader
                        title={t('ui.logoHeader.title')}
                        subtitle={t('auth.verify.subtitle', 'Email Verification')}
                        size="md"
                    />

                    {/* Page title */}
                    <h2 className="mt-6 text-4xl font-bold text-gray-900 dark:text-gray-100 font-serif text-center">
                        {t('auth.verify.title', 'Verify Your Email')}
                    </h2>

                    <Card withAnimation className="p-8 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800">

                        {/* ── LOADING STATE ─────────────────────────────────────────────── */}
                        {status === 'loading' && (
                            <div className="text-center space-y-6 py-4">
                                {/* Spinning loader icon */}
                                <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-primary-100 dark:bg-primary-900/30 mb-4">
                                    <Loader className="h-8 w-8 text-primary-600 dark:text-primary-400 animate-spin" />
                                </div>
                                <h3 className="text-xl font-medium text-gray-900 dark:text-white">
                                    {t('auth.verify.verifying', 'Verifying your email...')}
                                </h3>
                                <p className="text-gray-500 dark:text-gray-400">
                                    {t('auth.verify.pleaseWait', 'Please wait a moment.')}
                                </p>
                            </div>
                        )}

                        {/* ── SUCCESS STATE ─────────────────────────────────────────────── */}
                        {status === 'success' && (
                            <div className="text-center space-y-6 py-4">
                                {/* Green check icon */}
                                <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 mb-4">
                                    <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
                                </div>

                                <h3 className="text-xl font-medium text-gray-900 dark:text-white">
                                    {t('auth.verify.successTitle', 'Email Verified!')}
                                </h3>

                                <p className="text-gray-500 dark:text-gray-400">
                                    {t('auth.verify.successDesc', 'Your email has been verified successfully. Redirecting you to login...')}
                                </p>

                                {/* Manual login button in case redirect is slow */}
                                <Button
                                    variant="primary"
                                    className="w-full mt-4"
                                    onClick={() => navigate('/login')}
                                >
                                    {t('auth.recovery.goToLogin', 'Go to Login')}
                                </Button>
                            </div>
                        )}

                        {/* ── ERROR STATE ───────────────────────────────────────────────── */}
                        {status === 'error' && (
                            <div className="text-center space-y-6 py-4">
                                {/* Red X icon */}
                                <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 dark:bg-red-900/30 mb-4">
                                    <XCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
                                </div>

                                <h3 className="text-xl font-medium text-gray-900 dark:text-white">
                                    {t('auth.verify.errorTitle', 'Verification Failed')}
                                </h3>

                                <p className="text-gray-500 dark:text-gray-400">
                                    {errorMessage}
                                </p>

                                {/* Divider */}
                                <div className="relative">
                                    <div className="absolute inset-0 flex items-center">
                                        <div className="w-full border-t border-gray-200 dark:border-gray-700"></div>
                                    </div>
                                    <div className="relative flex justify-center text-sm">
                                        <span className="px-4 bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400">
                                            {t('auth.verify.resendPrompt', 'Request a new verification link')}
                                        </span>
                                    </div>
                                </div>

                                {/* Resend success message */}
                                {resendSuccess && (
                                    <div className="bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 p-3 rounded-md text-sm border border-green-200 dark:border-green-800">
                                        {t('auth.verify.resendSuccess', 'Verification email sent! Please check your inbox.')}
                                    </div>
                                )}

                                {/* Resend error message */}
                                {resendError && (
                                    <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-3 rounded-md text-sm border border-red-200 dark:border-red-800">
                                        {resendError}
                                    </div>
                                )}

                                {/* Email input for resend */}
                                {!resendSuccess && (
                                    <div className="space-y-3">
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <Mail className="h-5 w-5 text-gray-400" />
                                            </div>
                                            <input
                                                type="email"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                placeholder={t('auth.verify.emailPlaceholder', 'Enter your email address')}
                                                className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 text-sm"
                                            />
                                        </div>

                                        {/* Resend button */}
                                        <Button
                                            variant="primary"
                                            className="w-full"
                                            onClick={handleResend}
                                            isLoading={isResending}
                                            disabled={isResending}
                                        >
                                            {t('auth.verify.resendBtn', 'Resend Verification Email')}
                                        </Button>
                                    </div>
                                )}

                                {/* Back to login link */}
                                <Button
                                    variant="outline"
                                    className="w-full"
                                    onClick={() => navigate('/login')}
                                >
                                    {t('auth.recovery.goToLogin', 'Back to Login')}
                                </Button>
                            </div>
                        )}
                    </Card>

                    {/* Security badge — same as other auth pages */}
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

export default VerifyEmailPage;