// Password reset page — validates token and sets new password
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Lock, Shield, CheckCircle } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { LogoHeader } from '../components/ui/LogoHeader';
import { validatePassword } from '../utils/validators';
import { API_BASE_URL } from '../config';
import { useTranslation } from 'react-i18next';

const ResetPasswordPage: React.FC = () => {
    const { t } = useTranslation();
    const { resetToken } = useParams<{ resetToken: string }>(); // Extracts reset token from URL
    const navigate = useNavigate(); // For navigation to /login

    // Stores the values of both password fields to sync with UI
    const [formData, setFormData] = useState({
        password: '',
        confirmPassword: ''
    });

    // Stores validation messages for each field to handle specific error
    const [errors, setErrors] = useState({
        password: '',
        confirmPassword: ''
    });

    // Tracks whether the user has interacted with each field 
    const [touched, setTouched] = useState({
        password: false,
        confirmPassword: false
    });

    // For UI and submission states
    const [isLoading, setIsLoading] = useState(false); // Shows loading state during API call
    const [isSuccess, setIsSuccess] = useState(false); // Shows success message 
    const [submitError, setSubmitError] = useState(''); // Shows backend or network errors

    // Validates password and confirmPassword fields when interacted
    useEffect(() => {
        if (touched.password) {
            const validation = validatePassword(formData.password, t);
            setErrors(prev => ({ ...prev, password: validation.error || '' }));
        }

        if (touched.confirmPassword) {
            if (formData.confirmPassword && formData.password !== formData.confirmPassword) {
                setErrors(prev => ({ ...prev, confirmPassword: t('auth.validation.passwordsMismatch', 'Passwords do not match') }));
            } else {
                setErrors(prev => ({ ...prev, confirmPassword: '' }));
            }
        }
    }, [formData, touched]); // Rerun validation when password value or touched state changes

    // Handles changes in input fields
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target; // Update correct field
        setFormData(prev => ({ ...prev, [name]: value }));
        setTouched(prev => ({ ...prev, [name]: true }));
    };

    // Handles form submission
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault(); // Prevents default page from reloading

        // Prevents submission when there are validation errors or empty fields
        if (errors.password || errors.confirmPassword || !formData.password || !formData.confirmPassword) {
            return;
        }

        // Sets loading state and clears any previous errors
        setIsLoading(true);
        setSubmitError('');

        // API request
        try {

            // Sends new password to backend, include reset token from URL and update password
            const response = await fetch(`${API_BASE_URL}/api/auth/resetpassword/${resetToken}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ password: formData.password }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Failed to reset password');
            }

            // Shows success message 
            setIsSuccess(true);

            // Redirects to login page after 3 seconds
            setTimeout(() => {
                navigate('/login');
            }, 3000);

        } catch (err: any) { // Displays backend or network errors
            setSubmitError(err.message || 'Something went wrong');
        } finally {
            setIsLoading(false); // Always stop loading state
        }
    };

    return (
        <div className="min-h-screen bg-white dark:bg-gray-950 flex flex-col">
            <main className="flex-grow flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative">
                {/* Background decorations */}
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
                        subtitle={t('auth.recovery.resetSubtitle')}
                        size="md"
                    />

                    {/* Page title */}
                    <h2 className="mt-6 text-4xl font-bold text-gray-900 dark:text-gray-100 font-serif text-center">
                        {t('auth.recovery.resetTitle')}
                    </h2>

                    <Card withAnimation className="p-8 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
                        {!isSuccess ? ( // If not success, show password reset form
                            <form className="space-y-6" onSubmit={handleSubmit}>
                                {submitError && (
                                    <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-3 rounded-md text-sm border border-red-200 dark:border-red-800">
                                        {submitError}
                                    </div>
                                )}

                                {/* New password input */}
                                <div className="space-y-2">
                                    <Input
                                        icon={Lock}
                                        label={t('auth.recovery.newPasswordLabel')}
                                        type="password"
                                        name="password"
                                        value={formData.password}
                                        onChange={handleChange}
                                        placeholder={t('auth.recovery.newPasswordPlaceholder')}
                                        required
                                        showPasswordToggle
                                        error={errors.password}
                                        success={touched.password && !errors.password && formData.password.length > 0}
                                    />
                                </div>

                                {/* Confirm password input */}
                                <div className="space-y-2">
                                    <Input
                                        icon={Lock}
                                        label={t('auth.recovery.confirmNewPasswordLabel')}
                                        type="password"
                                        name="confirmPassword"
                                        value={formData.confirmPassword}
                                        onChange={handleChange}
                                        placeholder={t('auth.recovery.confirmNewPasswordPlaceholder')}
                                        required
                                        showPasswordToggle
                                        error={errors.confirmPassword}
                                        success={touched.confirmPassword && !errors.confirmPassword && formData.confirmPassword.length > 0}
                                    />
                                </div>

                                {/* Submit button */}
                                <Button
                                    type="submit"
                                    variant="primary"
                                    size="lg"
                                    className="w-full shadow-primary-500/30 hover:shadow-primary-600/40 transition-all duration-200"
                                    isLoading={isLoading}
                                    disabled={!!errors.password || !!errors.confirmPassword || !formData.password}
                                >
                                    {t('auth.recovery.resetPasswordBtn')}
                                </Button>
                            </form>
                        ) : ( // If success, show success message
                            <div className="text-center space-y-6 py-4">
                                <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 mb-4">
                                    {/* Success icon */}
                                    <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
                                </div>

                                {/* Success message */}
                                <h3 className="text-xl font-medium text-gray-900 dark:text-white">
                                    {t('auth.recovery.resetSuccessTitle')}
                                </h3>

                                {/* Success message description */}
                                <p className="text-gray-500 dark:text-gray-400">
                                    {t('auth.recovery.resetSuccessDesc')}
                                </p>

                                {/* Redirect to login button */}
                                <Button
                                    variant="primary"
                                    className="w-full mt-4"
                                    onClick={() => navigate('/login')}
                                >
                                    {t('auth.recovery.goToLogin')}
                                </Button>
                            </div>
                        )}
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

export default ResetPasswordPage;