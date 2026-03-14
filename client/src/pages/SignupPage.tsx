// Signup page with email/password registration and Google OAuth
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, ArrowRight, Shield } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { LogoHeader } from '../components/ui/LogoHeader';
import { StatsGrid } from '../components/ui/StatsGrid';
import { FloatingBackButton } from '../components/ui/FloatingBackButton';
import { PasswordStrength } from '../components/ui/PasswordStrength';
import { validateEmail, validatePassword, validateName, validateConfirmPassword, validateTerms } from '../utils/validators';
import { API_BASE_URL } from '../config';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { useConfirm } from '../contexts/ConfirmContext';
import { useGoogleLogin } from '@react-oauth/google';

const SignUpPage: React.FC = () => {
  const { t } = useTranslation();
  const { alert: alertAction } = useConfirm();  
  const { googleLogin } = useAuth();
  const navigate = useNavigate();

  const handleGoogleSignup = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        await googleLogin(tokenResponse.access_token);
        navigate("/");
      } catch (error: any) {
        console.error("Google Signup Error:", error);
        alertAction({
          title: t('common.error'),
          message: error.message || t('auth.alerts.googleError'),
          variant: 'danger'
        });
      }
    },
    onError: () => {
      console.log('Signup Failed');
      alertAction({
        title: t('common.error'),
        message: t('auth.alerts.googleError'),
        variant: 'danger'
      });
    }
  });

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    acceptTerms: false,
    acceptNewsletter: true,
  });

  // UI state
  const [isLoading, setIsLoading] = useState(false);

  // Validation state
  const [errors, setErrors] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    acceptTerms: '',
  });

  const [touched, setTouched] = useState({
    name: false,
    email: false,
    password: false,
    confirmPassword: false,
    acceptTerms: false,
  });

  // Stats for the grid
  const stats = [
    { value: '10K+', label: 'Users', bgColor: 'bg-primary-50 dark:bg-primary-900/30', textColor: 'text-primary-600 dark:text-primary-400' },
    { value: '98%', label: 'Accuracy', bgColor: 'bg-secondary-50 dark:bg-secondary-900/30', textColor: 'text-secondary-600 dark:text-secondary-400' },
    { value: '500+', label: 'Careers', bgColor: 'bg-gradient-to-br from-primary-50 to-secondary-50 dark:from-primary-900/30 dark:to-secondary-900/30', textColor: 'text-gray-900 dark:text-gray-100' },
  ];

  // No validation effects needed!

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Mark all fields as touched
    setTouched({
      name: true,
      email: true,
      password: true,
      confirmPassword: true,
      acceptTerms: true,
    });

    // Validate all fields
    const newErrors = {
      name: validateName(formData.name).error || '',
      email: validateEmail(formData.email).error || '',
      password: validatePassword(formData.password, t).error || '',
      confirmPassword: validateConfirmPassword(formData.password, formData.confirmPassword, t).error || '',
      acceptTerms: validateTerms(formData.acceptTerms).error || '',
    };

    setErrors(newErrors);

    // Stop if validation errors exist
    if (Object.values(newErrors).some(error => error !== '')) return;

    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Show success message
        await alertAction({
          title: t('common.confirm'),
          message: t('auth.alerts.signupSuccess'),
          variant: 'info'
        });

        // Clear form
        setFormData({
          name: '',
          email: '',
          password: '',
          confirmPassword: '',
          acceptTerms: false,
          acceptNewsletter: true,
        });

        // Reset validation states
        setTouched({
          name: false,
          email: false,
          password: false,
          confirmPassword: false,
          acceptTerms: false,
        });

        setErrors({
          name: '',
          email: '',
          password: '',
          confirmPassword: '',
          acceptTerms: '',
        });

        // Redirect to login page
        navigate('/login');
      } else {
        // Show error message from server
        alertAction({
          title: t('common.error'),
          message: data.message || 'Signup failed. Please try again.',
          variant: 'danger'
        });
      }
    } catch (error) {
      console.error('Signup error:', error);
      alertAction({
        title: t('common.error'),
        message: t('auth.alerts.networkError'),
        variant: 'danger'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === 'checkbox' ? checked : value;

    // Create new form state immediately for validation
    const updatedForm = { ...formData, [name]: newValue };
    setFormData(updatedForm);
    setTouched(prev => ({ ...prev, [name]: true }));

    // Validate immediately avoiding useEffect
    const newErrors = { ...errors };
    if (name === 'name') newErrors.name = validateName(newValue as string).error || '';
    else if (name === 'email') newErrors.email = validateEmail(newValue as string).error || '';
    else if (name === 'password') {
      newErrors.password = validatePassword(newValue as string, t).error || '';
      if (touched.confirmPassword) {
        newErrors.confirmPassword = validateConfirmPassword(newValue as string, updatedForm.confirmPassword, t).error || '';
      }
    } else if (name === 'confirmPassword') {
      newErrors.confirmPassword = validateConfirmPassword(updatedForm.password, newValue as string, t).error || '';
    } else if (name === 'acceptTerms') {
      newErrors.acceptTerms = validateTerms(newValue as boolean).error || '';
    }

    setErrors(newErrors);
  };

  const isFormValid = () => {
    return (
      !errors.name &&
      !errors.email &&
      !errors.password &&
      !errors.confirmPassword &&
      !errors.acceptTerms &&
      formData.name.length > 0 &&
      formData.email.length > 0 &&
      formData.password.length > 0 &&
      formData.confirmPassword.length > 0 &&
      formData.acceptTerms
    );
  };

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
            subtitle="Start Your Journey"
            size="md"
          />

          <h2 className="text-4xl font-bold text-gray-900 dark:text-gray-100 font-serif text-center">
            {t('auth.signup.title')}
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400 text-center">
            {t('auth.signup.subtitle')}
          </p>

          {/* Card component */}
          <Card withAnimation className="p-8 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
            {/* StatsGrid component */}
            <StatsGrid stats={stats} className="mb-8" />

            <form className="space-y-6" onSubmit={handleSubmit}>
              {/* Name Input */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t('auth.signup.nameLabel')}
                  </label>
                </div>
                <Input
                  icon={User}
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder={t('auth.signup.namePlaceholder')}
                  required
                  error={errors.name}
                  success={touched.name && !errors.name && formData.name.length > 0}
                />
              </div>

              {/* Email Input */}
              <div className="space-y-2">
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
              </div>

              {/* Password Input with Strength Indicator & Requirements */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t('auth.signup.passwordLabel')}
                  </label>
                </div>
                <Input
                  icon={Lock}
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder={t('auth.signup.passwordPlaceholder')}
                  required
                  showPasswordToggle={true}
                  error={errors.password}
                  success={touched.password && !errors.password && formData.password.length >= 8}
                />
              </div>

              {/* Password Strength Indicator */}
              {touched.password && (
                <PasswordStrength
                  password={formData.password}
                  showRequirements={formData.password.length > 0}
                />
              )}

              {/* Confirm Password Input */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t('auth.signup.confirmPasswordLabel')}
                  </label>
                </div>
                <Input
                  icon={Lock}
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder={t('auth.signup.confirmPasswordPlaceholder')}
                  required
                  showPasswordToggle={true}
                  error={errors.confirmPassword}
                  success={touched.confirmPassword && !errors.confirmPassword && formData.confirmPassword.length > 0}
                />
              </div>

              {/* Terms & Conditions */}
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <input
                    id="acceptTerms"
                    name="acceptTerms"
                    type="checkbox"
                    checked={formData.acceptTerms}
                    onChange={handleChange}
                    className="h-5 w-5 mt-0.5 text-primary-600 dark:text-primary-400 focus:ring-primary-500 dark:focus:ring-primary-400 border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800"
                  />
                  <div className="flex-1">
                    <label htmlFor="acceptTerms" className="text-sm text-gray-700 dark:text-gray-300">
                      {t('auth.signup.agreeTo')}{' '}
                      <Link to="/terms" className="text-primary-600 dark:text-primary-400 hover:text-primary-500 dark:hover:text-primary-300 font-medium">
                        {t('footer.terms')}
                      </Link>{' '}
                      {t('auth.signup.and')}{' '}
                      <Link to="/privacy" className="text-primary-600 dark:text-primary-400 hover:text-primary-500 dark:hover:text-primary-300 font-medium">
                        {t('footer.privacy')}
                      </Link>
                    </label>
                    {errors.acceptTerms && (
                      <p className="text-red-500 dark:text-red-400 text-sm mt-1">{errors.acceptTerms}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <input
                    id="acceptNewsletter"
                    name="acceptNewsletter"
                    type="checkbox"
                    checked={formData.acceptNewsletter}
                    onChange={handleChange}
                    className="h-5 w-5 mt-0.5 text-primary-600 dark:text-primary-400 focus:ring-primary-500 dark:focus:ring-primary-400 border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800"
                  />
                  <label htmlFor="acceptNewsletter" className="text-sm text-gray-700 dark:text-gray-300 flex-1">
                    {t('auth.signup.newsletterOptIn')}
                  </label>
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full shadow-primary-500/30 hover:shadow-primary-600/40 transition-all duration-200"
                isLoading={isLoading}
                disabled={!isFormValid()}
              >
                {t('auth.signup.submit')}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>

              {/* Google Signup Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300 dark:border-gray-700"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400">
                    {t('auth.signup.orSignUpWith')}
                  </span>
                </div>
              </div>

              {/* Google Signup */}
              <button
                type="button"
                onClick={() => handleGoogleSignup()}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 border border-gray-300 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-gray-700 dark:text-gray-300 font-medium"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                <span>{t('auth.signup.googleSignup')}</span>
              </button>

              {/* Login Link */}
              <div className="text-center pt-4">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {t('auth.signup.alreadyHaveAccount')}{' '}
                </span>
                <Link
                  to="/login"
                  className="inline-flex items-center text-primary-600 dark:text-primary-400 hover:text-primary-500 dark:hover:text-primary-300 font-semibold transition-colors"
                >
                  {t('auth.signup.signIn')}
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </div>
            </form>
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

export default SignUpPage;