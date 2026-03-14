// Login page with email/password and Google OAuth authentication
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, ArrowRight, Shield } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { LogoHeader } from '../components/ui/LogoHeader';
import { StatsGrid } from '../components/ui/StatsGrid';
import { FloatingBackButton } from '../components/ui/FloatingBackButton';
import { validateEmail, validatePassword } from '../utils/validators';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { useConfirm } from '../contexts/ConfirmContext';
import { useGoogleLogin } from '@react-oauth/google';

const LoginPage: React.FC = () => {
    const { t } = useTranslation();
    const { alert: alertAction } = useConfirm();
    const navigate = useNavigate();
    const { login, googleLogin } = useAuth();

    const handleGoogleLogin = useGoogleLogin({
        onSuccess: async (tokenResponse) => {
            try {
                // Pass the access token to our backend
                await googleLogin(tokenResponse.access_token);
                navigate("/");
            } catch (error: any) {
                console.error("Google Login Error:", error);
                alertAction({
                    title: t('common.error'),
                    message: error.message || t('auth.alerts.googleError'),
                    variant: 'danger'
                });
            }
        },
        onError: () => {
            console.log('Login Failed');
            alertAction({
                title: t('common.error'),
                message: t('auth.alerts.googleError'),
                variant: 'danger'
            });
        }
    });
    const [errors, setErrors] = useState({ email: '', password: '' });
    const [touched, setTouched] = useState({ email: false, password: false });
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        rememberMe: false,
    });

    // Email validation effect
    useEffect(() => {
        if (touched.email) {
            const validation = validateEmail(formData.email);
            setErrors(prev => ({ ...prev, email: validation.error || '' }));
        }
    }, [formData.email, touched.email]);

    // Password validation effect
    useEffect(() => {
        if (touched.password) {
            const validation = validatePassword(formData.password);
            setErrors(prev => ({ ...prev, password: validation.error || '' }));
        }
    }, [formData.password, touched.password]);

    // Mark handleSubmit as async to allow await usage
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            await login(formData.email, formData.password, formData.rememberMe);
            setIsLoading(false);
            navigate("/"); // redirect after login
        } catch (err: any) {
            setIsLoading(false);
            alertAction({
                title: t('common.error'),
                message: err.message || t('auth.alerts.loginFailed'),
                variant: 'danger'
            });
        }
    };

    // Handle input changes
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));

        // Mark field as touched when user starts typing
        setTouched(prev => ({ ...prev, [name]: true }));
    };

    const stats = [
        { value: '10K+', label: 'Users', bgColor: 'bg-primary-50 dark:bg-primary-900/30', textColor: 'text-primary-600 dark:text-primary-400' },
        { value: '98%', label: 'Accuracy', bgColor: 'bg-secondary-50 dark:bg-secondary-900/30', textColor: 'text-secondary-600 dark:text-secondary-400' },
        { value: '500+', label: 'Careers', bgColor: 'bg-gradient-to-br from-primary-50 to-secondary-50 dark:from-primary-900/30 dark:to-secondary-900/30', textColor: 'text-gray-900 dark:text-gray-100' },
    ];

    return (
        <div className="min-h-screen bg-white dark:bg-gray-950 flex flex-col">
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
                    {/* LogoHeader component */}
                    <LogoHeader
                        title="In-Aspired"
                        subtitle="Discover Your Potential"
                        size="md"
                    />

                    <h2 className="mt-6 text-4xl font-bold text-gray-900 dark:text-gray-100 font-serif text-center">
                        {t('auth.login.title')}
                    </h2>
                    <p className="mt-3 text-lg text-gray-600 dark:text-gray-400 text-center">
                        {t('auth.login.subtitle')}
                    </p>

                    {/* Card component */}
                    <Card withAnimation className="p-8 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
                        {/* StatsGrid component */}
                        <StatsGrid stats={stats} className="mb-8" />

                        <form className="space-y-6" onSubmit={handleSubmit}>
                            <div className="space-y-2">
                                {/* Email Input with validation */}
                                <div className="flex justify-between items-center">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                            {t('auth.login.emailLabel')}
                                        </label>
                                    </div>
                                <Input
                                    icon={Mail}
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    placeholder={t('auth.login.emailPlaceholder')}
                                    required
                                    error={errors.email}
                                    success={touched.email && !errors.email && formData.email.length > 0}
                                />

                                {/* Password Input with validation */}
                                <div className="flex justify-between items-center">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        {t('auth.login.passwordLabel')}
                                    </label>
                                </div>
                                <Input
                                    icon={Lock}
                                    type="password"
                                    name="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    placeholder={t('auth.login.passwordPlaceholder')}
                                    required
                                    showPasswordToggle
                                    error={errors.password}
                                    success={touched.password && !errors.password && formData.password.length > 0}
                                />
                            </div>

                            {/* Remember Me & Quick Login */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                    <input
                                        id="rememberMe"
                                        name="rememberMe"
                                        type="checkbox"
                                        checked={formData.rememberMe}
                                        onChange={handleChange}
                                        className="h-4 w-4 text-primary-600 dark:text-primary-400 focus:ring-primary-500 dark:focus:ring-primary-400 border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800"
                                    />
                                    <label htmlFor="rememberMe" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                                        {t('auth.login.rememberMe')}
                                    </label>
                                </div>
                                <Link to="/forgot-password" className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-500 dark:hover:text-primary-300 font-medium">
                                    {t('auth.login.forgotPassword')}
                                </Link>
                            </div>

                            {/* Submit Button */}
                            <Button
                                type="submit"
                                variant="primary"
                                size="lg"
                                className="w-full shadow-primary-500/30 hover:shadow-primary-600/40 transition-all duration-200"
                                isLoading={isLoading}
                                disabled={!!errors.email || !!errors.password || !formData.email || !formData.password}
                            >
                                {t('auth.login.submit')}
                                <ArrowRight className="ml-2 h-5 w-5" />
                            </Button>

                            {/* Divider */}
                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-gray-300 dark:border-gray-700"></div>
                                </div>
                                <div className="relative flex justify-center text-sm">
                                    <span className="px-4 bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400">
                                        {t('auth.login.orContinueWith')}
                                    </span>
                                </div>
                            </div>

                            {/* Social Login */}
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    onClick={() => handleGoogleLogin()}
                                    className="flex items-center justify-center gap-2 py-3 px-4 border border-gray-300 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-gray-700 dark:text-gray-300 font-medium col-span-2"
                                >
                                    {/* Google Logo */}
                                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                    </svg>
                                    <span>{t('auth.login.googleLogin')}</span>
                                </button>
                            </div>
                        </form>

                        {/* Sign Up Link */}
                        <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-800">
                            <p className="text-center text-gray-600 dark:text-gray-400">
                                {t('auth.login.newToPlatform')}{' '}
                                <Link to="/signup" className="font-semibold text-primary-600 dark:text-primary-400 hover:text-primary-500 dark:hover:text-primary-300 transition-colors">
                                    {t('auth.login.createAccount')}
                                </Link>
                            </p>
                        </div>
                    </Card>

                    {/* Security & Trust Badges */}
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-center">
                        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                            <Shield className="h-4 w-4 text-green-500 dark:text-green-400" />
                            <span>{t('auth.security.secure')}</span>
                        </div>
                        <div className="hidden sm:block text-gray-300 dark:text-gray-600">•</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                            {t('auth.security.private')}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default LoginPage;