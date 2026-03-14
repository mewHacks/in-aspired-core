// User settings page for profile, preferences, security, and push notifications
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useConfirm } from '@/contexts/ConfirmContext';
import { User, Lock, Shield, Smartphone, Edit2, Save, X, Key, Palette, Globe, Bell, Settings, Eye, EyeOff, CheckCircle, XCircle, Copy, Check, Cookie, Trash2, AlertTriangle, Camera, GraduationCap, ShieldCheck, Crown, Compass, Target } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import ScrollRevelation from '@/components/ui/ScrollRevelation';
import { CustomSelect } from '../components/ui/CustomSelect';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useTheme } from '../contexts/ThemeContext';
import { validateEmail, validatePassword, validateName, validateConfirmPassword } from '../utils/validators';

import { httpClient } from '../services/httpClient';
import i18n from '../i18n';

// Define user type that matches AuthContext user
export interface UserType {
  name: string;
  email: string;
  phone?: string;
  phoneCountryCode?: string;
  gender?: string;
  dateOfBirth?: string;
  avatar?: string;
  role?: string;
  badges?: string[];
  [key: string]: any;
}

// Helper function to convert Base64-URL encoded string into a Uint8Array
function urlBase64ToUint8Array(base64String: string) {

  // Fix padding and convert to standard Base64 for browser to decode it
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  // atob decodes Base64 into a binary string
  const rawData = window.atob(base64);

  // Convert binary string into Uint8Array
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  // Return the Uint8Array to be used by web APIs
  return outputArray;
}
// Main Settings page component
const SettingsPage: React.FC = () => {

  // Get current authenticated user and update user function from AuthContext
  const { user: authUser, updateUser, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { alert: alertAction, confirm: confirmAction } = useConfirm();

  // Theme context - the source of truth for theme
  const { theme: activeTheme, setTheme: applyTheme } = useTheme();

  // Initialize default values for user information in case authUser is null
  const defaultUser: UserType = {
    name: '',
    email: '',
    phone: '',
    phoneCountryCode: '+60',
    gender: '',
    dateOfBirth: '',
    avatar: '',
    role: 'STUDENT',
    authProvider: 'local',
    isTwoFactorEnabled: false
  };

  // Safely get user from authUser with fallbacks
  const getSafeUser = (user: UserType | null): UserType => {

    if (!user) {
      return defaultUser;
    }

    return {
      name: user.name || '',
      email: user.email || '',
      phone: user.phone || '',
      phoneCountryCode: user.phoneCountryCode || '+60',
      gender: user.gender || '',
      dateOfBirth: user.dateOfBirth || '',
      avatar: user.avatar || '',
      role: user.role || 'STUDENT',
      badges: user.badges || [],
      authProvider: user.authProvider || 'local',
      isTwoFactorEnabled: user.isTwoFactorEnabled || false
    };
  };

  // User and account form states

  // Main user data state
  const [user, setUser] = useState<UserType>(getSafeUser(authUser));

  // Temporary editable state for account form
  const [tempAccount, setTempAccount] = useState<UserType>(getSafeUser(authUser));

  // Tracks validation errors 
  const [accountErrors, setAccountErrors] = useState({
    name: '',
    email: '',
    phone: ''
  });

  // Tracks whether a field has been interacted with
  const [accountTouched, setAccountTouched] = useState({
    name: false,
    email: false,
    phone: false
  });

  // Tracks whether the account form is currently in edit mode
  const [editingAccount, setEditingAccount] = useState(false);

  // Avatar upload state
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);

  // Security section state

  // Main security data state
  const [security, setSecurity] = useState({
    mfaEnabled: false,
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Temporary editable state for security form
  const [tempSecurity, setTempSecurity] = useState({ ...security });

  // Tracks validation errors 
  const [passwordErrors, setPasswordErrors] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Tracks whether a field has been interacted with
  const [passwordTouched, setPasswordTouched] = useState({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false
  });

  // Tracks server-side validation of the current password and any loading/feedback messages
  const [currentPasswordValid, setCurrentPasswordValid] = useState<boolean | null>(null);
  const [validatingCurrentPassword, setValidatingCurrentPassword] = useState(false);
  const [currentPasswordValidationMessage, setCurrentPasswordValidationMessage] = useState('');

  // Tracks whether the password fields are currently visible (toggles for showing/hiding passwords)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Tracks whether the security form is currently in edit mode
  const [editingSecurity, setEditingSecurity] = useState(false);

  // Preferences section state

  // Stores general user preferences for theme, language, and notifications
  const [general, setGeneral] = useState({
    theme: activeTheme, // sync from ThemeContext
    language: 'english',
    notifications: true,
    emailNotifications: true,
    pushNotifications: false
  });
  const [tempGeneral, setTempGeneral] = useState({ ...general });

  // 2FA state

  // Manages 2FA modal visibility, steps, QR code, secret, verification code and loading state
  const [showTwoFactorModal, setShowTwoFactorModal] = useState(false);
  const [twoFactorStep, setTwoFactorStep] = useState<'qr' | 'verify'>('qr');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [twoFactorSecret, setTwoFactorSecret] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [twoFactorLoading, setTwoFactorLoading] = useState(false);

  // Tracks whether the 2FA secret has been copied
  const [copied, setCopied] = useState(false);

  // Disable 2FA State
  const [showDisable2FAModal, setShowDisable2FAModal] = useState(false);
  const [disable2FAPassword, setDisable2FAPassword] = useState('');
  const [disable2FACode, setDisable2FACode] = useState('');
  const [disable2FALoading, setDisable2FALoading] = useState(false);
  const [showDisablePassword, setShowDisablePassword] = useState(false);

  // Effect: Sync Auth User to State
  // Syncs authenticated user and preferences into local state when authUser changes
  useEffect(() => {

    // Sync user if they exist
    if (authUser) {
      const safeUser = getSafeUser(authUser);
      setUser(safeUser);
      setTempAccount(safeUser);

      // Sync preferences if they exist
      if (authUser.preferences) {
        const savedTheme = (authUser.preferences.theme as 'light' | 'dark' | 'system') || activeTheme;
        const prefs = {
          theme: savedTheme,
          language: authUser.preferences.language || 'english',
          notifications: authUser.preferences.notifications ?? true,
          emailNotifications: authUser.preferences.emailNotifications ?? true,
          pushNotifications: authUser.preferences.pushNotifications ?? false
        };
        setGeneral(prefs);
        setTempGeneral(prefs);

        // Sync ThemeContext with saved backend preference
        // if (authUser.preferences.theme && authUser.preferences.theme !== activeTheme) {
        //   applyTheme(savedTheme);
        // }
      }
    }
  }, [authUser]);

  // Effect: Sync Push Notification State (Device Specific)
  useEffect(() => {
    if ('serviceWorker' in navigator && authUser) {
      navigator.serviceWorker.ready.then(async (registration) => {
        const sub = await registration.pushManager.getSubscription();

        if (Notification.permission === 'denied') {
          // If denied, force off
          setGeneral(prev => ({ ...prev, pushNotifications: false }));
          setTempGeneral(prev => ({ ...prev, pushNotifications: false }));
        } else if (sub) {
          // If subscription exists, force on
          setGeneral(prev => ({ ...prev, pushNotifications: true }));
          setTempGeneral(prev => ({ ...prev, pushNotifications: true }));
        } else {
          // If no subscription, force off (unless we trust backend, but local truth is important for this device)
          setGeneral(prev => ({ ...prev, pushNotifications: false }));
          setTempGeneral(prev => ({ ...prev, pushNotifications: false }));
        }
      }).catch(() => { });
    }
  }, [authUser]); // Run when authUser loads

  // Validate current password with backend (server-side)
  const validateCurrentPasswordWithServer = useCallback(async (password: string) => {
    if (!password.trim()) {
      setCurrentPasswordValid(null);
      setCurrentPasswordValidationMessage('');
      return;
    }

    setValidatingCurrentPassword(true);
    setCurrentPasswordValidationMessage(t('settings.security.password.checking', 'Checking password...'));

    try {
      // Call an API endpoint to verify the current password
      const res = await httpClient('/api/users/verify-password', {
        method: 'POST',
        body: JSON.stringify({ password })
      });

      // Check if the request was successful
      if (res.ok) {

        // Parse response as JSON
        const data = await res.json();

        // Updates validation state and messages based on response
        if (data.valid) {
          setCurrentPasswordValid(true);
          setCurrentPasswordValidationMessage(t('settings.security.password.currentCorrect', 'Current password is correct'));
          setPasswordErrors(prev => ({ ...prev, currentPassword: '' }));
        } else {
          setCurrentPasswordValid(false);
          setCurrentPasswordValidationMessage(t('settings.security.password.currentIncorrect', 'Current password is incorrect'));
          setPasswordErrors(prev => ({ ...prev, currentPassword: t('settings.security.password.currentIncorrect', 'Current password is incorrect') }));
        }

      } else {
        setCurrentPasswordValid(false);
        setCurrentPasswordValidationMessage(t('settings.security.password.errorChecking', 'Error checking password'));
        setPasswordErrors(prev => ({ ...prev, currentPassword: t('settings.security.password.unableVerify', 'Unable to verify password') }));
        console.error('Error checking password:', res.status, res.statusText);
      }
    } catch (error) {
      console.error('Error validating password:', error);
      setCurrentPasswordValid(false);
      setCurrentPasswordValidationMessage(t('settings.security.password.networkError', 'Network error'));
      setPasswordErrors(prev => ({ ...prev, currentPassword: t('settings.security.password.unableVerify', 'Unable to verify password') }));
    } finally {
      setValidatingCurrentPassword(false);
    }
  }, []);

  // Debounces password validation so server is not called on every keystroke
  useEffect(() => {
    if (!editingSecurity || !tempSecurity.currentPassword.trim()) {
      setCurrentPasswordValid(null);
      setCurrentPasswordValidationMessage('');
      return;
    }

    // Only validate after user stops typing for 500ms
    const timer = setTimeout(() => {
      if (tempSecurity.currentPassword.trim().length > 0) {
        validateCurrentPasswordWithServer(tempSecurity.currentPassword);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [tempSecurity.currentPassword, editingSecurity, validateCurrentPasswordWithServer]);

  // Account Handlers

  // Handles changes to account fields
  const handleAccountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setTempAccount(prev => ({ ...prev, [name]: value }));

    // Mark field as touched
    setAccountTouched(prev => ({ ...prev, [name as keyof typeof accountTouched]: true }));

    // Validate using validators.ts
    if (name === 'name') {
      const validation = validateName(value);
      setAccountErrors(prev => ({ ...prev, name: validation.error || '' }));
    }
    if (name === 'email') {
      const validation = validateEmail(value);
      setAccountErrors(prev => ({ ...prev, email: validation.error || '' }));
    }
    if (name === 'phone') {
      // Optional field, no error if empty
      setAccountErrors(prev => ({ ...prev, phone: '' }));
    }
  };

  // Helper to determine if account field should show success state
  const getAccountFieldSuccess = (fieldName: 'name' | 'email' | 'phone') => {
    if (!editingAccount) return false;

    const fieldValue = tempAccount[fieldName] || '';
    return accountTouched[fieldName] && !accountErrors[fieldName] && fieldValue.length > 0;
  };

  // Helper to get border color based on validation state
  const getAccountBorderColor = (fieldName: 'name' | 'email' | 'phone') => {
    if (!editingAccount) return 'border-gray-300 dark:border-gray-700';

    const fieldValue = tempAccount[fieldName] || '';

    if (accountTouched[fieldName]) {
      if (accountErrors[fieldName]) return 'border-red-500 focus:border-red-500 dark:border-red-500';
      if (fieldValue.length > 0) return 'border-green-500 focus:border-green-500 dark:border-green-500';
    }
    return 'border-gray-300 dark:border-gray-700';
  };

  // Check if account form is valid
  const isAccountFormValid = () => {

    return (
      !accountErrors.name &&
      !accountErrors.email &&
      !accountErrors.phone &&
      (tempAccount.name || '').trim().length > 0 &&
      (tempAccount.email || '').trim().length > 0
      // Phone is optional now
    );
  };

  const handleAccountSave = async () => {
    // Mark all account fields as touched before saving
    setAccountTouched({
      name: true,
      email: true,
      phone: true
    });

    // Re-validate all fields
    const nameValue = tempAccount.name || '';
    const emailValue = tempAccount.email || '';
    // const phoneValue = tempAccount.phone || ''; // Unused for validation now

    const newErrors = {
      name: validateName(nameValue).error || '',
      email: validateEmail(emailValue).error || '',
      phone: '' // Phone is optional
    };

    setAccountErrors(newErrors);

    // Stop if errors
    if (newErrors.name || newErrors.email || newErrors.phone) {
      return;
    }

    try {
      // Create a sanitized payload with only allowed fields
      // This prevents sending 'role: ADMIN' which fails backend validation (backend expects 'admin')
      // Also prevents accidental overwrite of protected fields
      const payload = {
        name: tempAccount.name,
        email: tempAccount.email,
        phone: tempAccount.phone,
        phoneCountryCode: tempAccount.phoneCountryCode,
        gender: tempAccount.gender,
        dateOfBirth: tempAccount.dateOfBirth,
        avatar: tempAccount.avatar // Save avatar if changed (handled by local state in handleAvatarUpload)
      };

      const res = await httpClient('/api/users/me', {
        method: 'PUT',
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const err = await res.json();
        console.error(err);
        return;
      }

      const updatedUser = await res.json();
      updateUser(updatedUser);
      const safeUpdatedUser = getSafeUser(updatedUser);
      setUser(safeUpdatedUser);
      setEditingAccount(false);
      setAccountErrors({ name: '', email: '', phone: '' });
      setAccountTouched({ name: false, email: false, phone: false });
    } catch (error) {
      console.error(error);
    }
  };

  const handleAccountCancel = () => {
    setTempAccount({ ...user });
    setEditingAccount(false);
    setAccountErrors({ name: '', email: '', phone: '' });
    setAccountTouched({ name: false, email: false, phone: false });
  };

  // Avatar Upload Handler
  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (max 2MB)
    const maxSize = 2 * 1024 * 1024; // 2MB
    if (file.size > maxSize) {
      toast.error('Image size must be less than 2MB');
      return;
    }

    setAvatarUploading(true);

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;

      // Update temp state only (preview)
      setTempAccount(prev => ({ ...prev, avatar: base64 }));
      // Mark as touched so we know something changed (though avatar isn't in accountTouched map, it shares the save button)
      setAccountTouched(prev => ({ ...prev, name: true })); // Trigger save button enabled state if needed, or just rely on diff

      setAvatarUploading(false);
      toast.success('Photo updated (click Save to apply)');
    };

    reader.onerror = () => {
      toast.error('Failed to read image file');
      setAvatarUploading(false);
    };

    reader.readAsDataURL(file);

    // Reset input
    if (avatarInputRef.current) {
      avatarInputRef.current.value = '';
    }
  };

  // Security Handlers
  //Handles password changes, field success, border colors, form validation, save and cancel

  const handleSecurityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setTempSecurity(prev => ({ ...prev, [name]: value }));

    // Mark field as touched
    setPasswordTouched(prev => ({ ...prev, [name as keyof typeof passwordTouched]: true }));

    // Validate immediately
    let newErrors = { ...passwordErrors };

    if (name === 'currentPassword') {
      // Clear previous validation when user starts typing again
      if (value !== tempSecurity.currentPassword) {
        setCurrentPasswordValid(null);
        setCurrentPasswordValidationMessage('');
      }

      // Basic validation - check if empty
      newErrors.currentPassword = value ? '' : t('settings.security.password.currentRequired', 'Current password is required');

      // Reset server validation if field is cleared
      if (!value.trim()) {
        setCurrentPasswordValid(null);
        setCurrentPasswordValidationMessage('');
      }
    } else if (name === 'newPassword') {
      const validation = validatePassword(value, t);
      newErrors.newPassword = validation.error || '';

      // Also re-validate confirm password if it's been touched
      if (passwordTouched.confirmPassword) {
        newErrors.confirmPassword = validateConfirmPassword(value, tempSecurity.confirmPassword, t).error || '';
      }
    } else if (name === 'confirmPassword') {
      newErrors.confirmPassword = validateConfirmPassword(tempSecurity.newPassword, value, t).error || '';
    }

    setPasswordErrors(newErrors);
  };

  // Helper to determine if security field should show success state
  const getPasswordFieldSuccess = (fieldName: 'currentPassword' | 'newPassword' | 'confirmPassword') => {
    if (!editingSecurity) return false;

    const fieldValue = tempSecurity[fieldName];

    if (fieldName === 'currentPassword') {
      // For current password, success only when server validates it
      return passwordTouched.currentPassword && currentPasswordValid === true;
    }

    return passwordTouched[fieldName] && !passwordErrors[fieldName] && fieldValue.length > 0;
  };

  // Helper to get border color based on validation state
  const getPasswordBorderColor = (fieldName: 'currentPassword' | 'newPassword' | 'confirmPassword') => {
    if (!editingSecurity) return 'border-gray-300 dark:border-gray-700';

    const fieldValue = tempSecurity[fieldName];

    if (passwordTouched[fieldName]) {
      if (fieldName === 'currentPassword') {
        if (validatingCurrentPassword) return 'border-yellow-500 focus:border-yellow-500 dark:border-yellow-500';
        if (currentPasswordValid === false) return 'border-red-500 focus:border-red-500 dark:border-red-500';
        if (currentPasswordValid === true) return 'border-green-500 focus:border-green-500 dark:border-green-500';
        if (passwordErrors.currentPassword) return 'border-red-500 focus:border-red-500 dark:border-red-500';
      } else {
        if (passwordErrors[fieldName]) return 'border-red-500 focus:border-red-500 dark:border-red-500';
        if (fieldValue.length > 0) return 'border-green-500 focus:border-green-500 dark:border-green-500';
      }
    }
    return 'border-gray-300 dark:border-gray-700';
  };

  // Check if password form is valid
  const isPasswordFormValid = () => {
    // Check if all fields have values
    const allFieldsFilled =
      tempSecurity.currentPassword.trim().length > 0 &&
      tempSecurity.newPassword.trim().length > 0 &&
      tempSecurity.confirmPassword.trim().length > 0;

    // Check if there are no errors
    const noErrors =
      !passwordErrors.currentPassword &&
      !passwordErrors.newPassword &&
      !passwordErrors.confirmPassword;

    // Current password must be validated by server
    const currentPasswordVerified = currentPasswordValid === true;

    return allFieldsFilled && noErrors && currentPasswordVerified;
  };

  const handleSecuritySave = async () => {
    // Mark all password fields as touched before saving
    const newTouched = {
      currentPassword: true,
      newPassword: true,
      confirmPassword: true
    };
    setPasswordTouched(newTouched);

    // Re-validate all fields with current values
    const newErrors = {
      currentPassword: tempSecurity.currentPassword.trim() ? '' : t('settings.security.password.currentRequired', 'Current password is required'),
      newPassword: validatePassword(tempSecurity.newPassword, t).error || '',
      confirmPassword: validateConfirmPassword(tempSecurity.newPassword, tempSecurity.confirmPassword, t).error || ''
    };

    setPasswordErrors(newErrors);

    // Stop if any errors exist
    if (newErrors.currentPassword || newErrors.newPassword || newErrors.confirmPassword) {
      return;
    }

    // Additional check - passwords should not be the same
    if (tempSecurity.currentPassword === tempSecurity.newPassword) {
      setPasswordErrors(prev => ({
        ...prev,
        newPassword: 'New password must be different from current password'
      }));
      return;
    }

    // Final check that current password is validated
    if (currentPasswordValid !== true) {
      setCurrentPasswordValidationMessage(t('settings.security.password.verifyRequired', 'Please verify your current password first'));
      return;
    }

    try {
      const res = await httpClient('/api/users/change-password', {
        method: 'PUT',
        body: JSON.stringify({
          oldPassword: tempSecurity.currentPassword,
          newPassword: tempSecurity.newPassword
        })
      });

      if (!res.ok) {
        const err = await res.json();
        // Handle server-side errors (like wrong current password)
        if (res.status === 400 || res.status === 401) {
          setCurrentPasswordValid(false);
          setCurrentPasswordValidationMessage(t('settings.security.password.currentIncorrect', 'Current password is incorrect'));
          setPasswordErrors(prev => ({
            ...prev,
            currentPassword: t('settings.security.password.currentIncorrect', 'Current password is incorrect')
          }));
        }
        console.error(err);
        return;
      }

      // Clear password fields
      setSecurity(prev => ({ ...prev, currentPassword: '', newPassword: '', confirmPassword: '' }));
      setTempSecurity({ ...security, currentPassword: '', newPassword: '', confirmPassword: '' });
      setPasswordErrors({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setPasswordTouched({ currentPassword: false, newPassword: false, confirmPassword: false });
      setCurrentPasswordValid(null);
      setCurrentPasswordValidationMessage('');
      setShowCurrentPassword(false);
      setShowNewPassword(false);
      setShowConfirmPassword(false);
      setEditingSecurity(false);

      alertAction({
        title: t('common.confirm'),
        message: t('settings.security.passwordChanged', 'Password changed successfully!'),
        variant: 'info'
      });
    } catch (error) {
      console.error(error);
    }
  };

  const handleSecurityCancel = () => {
    setTempSecurity({ ...security, currentPassword: '', newPassword: '', confirmPassword: '' });
    setPasswordErrors({ currentPassword: '', newPassword: '', confirmPassword: '' });
    setPasswordTouched({ currentPassword: false, newPassword: false, confirmPassword: false });
    setCurrentPasswordValid(null);
    setCurrentPasswordValidationMessage('');
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    setEditingSecurity(false);
  };

  // Preferences Handlers

  const handleLivePreferenceToggle = async (key: keyof typeof tempGeneral) => {

    const newValue = !tempGeneral[key];

    // Special handling for Push Notifications because they involve browser APIs + backend state
    if (key === 'pushNotifications') {

      // Turning ON
      if (newValue === true) {

        // Check if browser supports Push Notifications
        // Push Notifications require serviceWorker and PushManager APIs
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
          toast.error(t('settings.notifications.alerts.notSupported', 'Push notifications are not supported on this device.'));
          return;
        }

        // Check permission
        if (Notification.permission === 'denied') {
          toast.error(t('settings.notifications.alerts.blocked', 'Notifications are blocked. Please enable them in your browser settings.'));
          return;
        }

        try {
          // Request browser permission
          const permission = await Notification.requestPermission();

          if (permission !== 'granted') {
            // User denied
            return;
          }

          // Get VAPID public key
          // Identifies server to push services (Google, Mozilla, Apple) and revents push spam
          const vapidRes = await httpClient('/api/notifications/vapid-key');
          if (!vapidRes.ok) throw new Error('Failed to get VAPID key');
          const { publicKey } = await vapidRes.json();

          // Create push subscription (wait until sw is ready)
          const registration = await navigator.serviceWorker.ready;

          // Browser contacts push service to create subscription and generate endpoint + keys
          const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(publicKey)
          });

          // Send subscription to backend which stores endpoint, keys and metadata
          const subRes = await httpClient('/api/notifications/subscribe', {
            method: 'POST',
            body: JSON.stringify({ subscription })
          });

          if (!subRes.ok) throw new Error('Failed to subscribe on server');

          toast.success(t('settings.notifications.alerts.enabled', 'Push notifications enabled'));

          // Update state
          const newPrefs = { ...tempGeneral, [key]: true };
          setTempGeneral(newPrefs);
          setGeneral(newPrefs);
          updateUser({ preferences: newPrefs });

        } catch (err) { // Error handling
          console.error('Push setup failed:', err);
          toast.error(t('settings.notifications.alerts.enableFailed', 'Failed to enable push notifications'));
          // Don't update state (leaves it off)
        }
        return; // Exit, don't do default update

      } else {
        // Turning OFF
        try {

          // Get the existing subscription (if any)
          const registration = await navigator.serviceWorker.ready;
          const subscription = await registration.pushManager.getSubscription();

          if (subscription) {
            // Remove subscription from backend
            await httpClient('/api/notifications/unsubscribe', {
              method: 'POST',
              body: JSON.stringify({ endpoint: subscription.endpoint })
            });

            // Unsubscribe locally in browser too to avoid ghost pushes
            await subscription.unsubscribe();
          }

          toast.info(t('settings.notifications.alerts.disabled', 'Push notifications disabled'));

          // Update state
          const newPrefs = { ...tempGeneral, [key]: false };
          setTempGeneral(newPrefs);
          setGeneral(newPrefs);
          updateUser({ preferences: newPrefs });

        } catch (err) { // Error handling
          console.error('Unsubscribe failed:', err);
          toast.error(t('settings.notifications.alerts.disableFailed', 'Failed to disable push notifications'));
        }
        return; // Exit
      }
    }

    // Standard Preference Toggle
    // Optimistic Update (UI updates immediately)
    const newPrefs = { ...tempGeneral, [key]: newValue };

    setTempGeneral(newPrefs);
    setGeneral(newPrefs); // Sync main state too since it's "live"

    try {
      // API Call
      const res = await httpClient('/api/users/me', {
        method: 'PUT',
        body: JSON.stringify({ preferences: newPrefs })
      });

      if (!res.ok) throw new Error('Failed to update preference');

      // Update global user context just in case
      updateUser({ preferences: newPrefs });

    } catch (error) {
      console.error('Failed to update preference:', error);
      // Revert on error
      const originalValue = !newValue;
      const reverted = { ...newPrefs, [key]: originalValue };
      setTempGeneral(reverted);
      setGeneral(reverted);
      alertAction({
        title: t('common.error'),
        message: t('settings.alerts.preferenceFailed', 'Failed to update preference. Please check your connection.'),
        variant: 'danger'
      });
    }
  };

  // THEME CHANGE HANDLER
  // This is the key fix: we now call applyTheme() from ThemeContext so the
  // dark class on <html> is toggled immediately and persisted to localStorage.
  // We also save to the backend as before.
  const handleThemeChange = async (theme: 'light' | 'dark' | 'system') => {
    console.log('handleThemeChange called with:', theme);
    // 1. Apply immediately via ThemeContext (updates <html> class + localStorage)
    applyTheme(theme);

    // 2. Update local UI state
    // Optimistic Update
    const newPrefs = { ...tempGeneral, theme };
    setTempGeneral(newPrefs);
    setGeneral(newPrefs);

    // 3. Persist to backend
    try {
      const res = await httpClient('/api/users/me', {
        method: 'PUT',
        body: JSON.stringify({ preferences: newPrefs })
      });

      if (!res.ok) throw new Error('Failed to update theme');
      updateUser({ preferences: newPrefs });
    } catch (error) {
      console.error(error);
      // Revert ThemeContext and local state on error
      applyTheme(general.theme as 'light' | 'dark' | 'system');
      setTempGeneral(prev => ({ ...prev, theme: general.theme as any }));
      setGeneral(prev => ({ ...prev, theme: general.theme as any }));
      alertAction({
        title: t('common.error'),
        message: t('settings.alerts.themeFailed'),
        variant: 'danger'
      });
    }
  };

  const handleLanguageChange = async (language: string) => {
    // Optimistic Update
    const newPrefs = { ...tempGeneral, language };
    setTempGeneral(newPrefs);
    setGeneral(newPrefs);

    // Change language immediately in UI
    i18n.changeLanguage(language);

    try {
      const res = await httpClient('/api/users/me', {
        method: 'PUT',
        body: JSON.stringify({ preferences: newPrefs })
      });

      if (!res.ok) throw new Error('Failed to update language');
      updateUser({ preferences: newPrefs });
    } catch (error) {
      console.error(error);
      // Revert on error
      setTempGeneral(prev => ({ ...prev, language: general.language }));
      setGeneral(prev => ({ ...prev, language: general.language }));
      alertAction({
        title: t('common.error'),
        message: t('settings.alerts.langFailed'),
        variant: 'danger'
      });
    }
  };

  // 2FA Handlers

  // Handles 2FA flow: generate QR, verify code, enable/disable 2FA and copy secret code

  // Entry point for 2FA setup
  const handleStart2FA = async () => {

    // Resets previous 2FA data to prevent showing old QR codes or secrets
    setQrCodeUrl('');
    setTwoFactorSecret('');

    // Show modal immediately in loading state
    setShowTwoFactorModal(true);

    // Set step to QR and clear verification code
    setTwoFactorStep('qr');
    setVerificationCode('');

    // Start generation
    await handleGenerate2FA();
  };

  // Generate backend QR 
  const handleGenerate2FA = async () => {

    // Set loading state to prevent multiple requests
    setTwoFactorLoading(true);

    try {

      // Backend API Call
      const res = await httpClient('/api/users/2fa/generate', {
        method: 'POST',
        body: JSON.stringify({ manual: true }) // Explicitly request manual code
      });

      console.log("Response status:", res.status); // Debug log

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || `Server error: ${res.status}`);
      }

      // Parse response to JSON
      const data = await res.json();

      if (data.qrCode) {

        // Store qr and manual secret
        setQrCodeUrl(data.qrCode);
        setTwoFactorSecret(data.secret);
        setTwoFactorStep('qr');

        // Ensure modal is open
        setShowTwoFactorModal(true);

      } else {
        throw new Error('Invalid response from server (no QR code)');
      }
    } catch (error: any) {
      console.error("Error generating 2FA:", error);

      // Handle 401 Unauthorized (Session Expired) specially
      if (error.message.includes('401')) {
        await alertAction({
          title: t('common.warning'),
          message: t('settings.alerts.sessionExpired'),
          variant: 'warning'
        });
        logout();
        navigate('/login');
        return;
      }

      alertAction({
        title: t('common.error'),
        message: `${t('settings.alerts.2faGenFailed')}: ${error.message}`,
        variant: 'danger'
      });
    } finally {
      setTwoFactorLoading(false);
    }
  };

  // Verify 2FA code (OTP token) to finalize 2FA setup
  const handleVerify2FA = async () => {
    setTwoFactorLoading(true);
    try {
      // Backend API call to read stored token and verify 6-digit code
      const res = await httpClient('/api/users/2fa/verify', {
        method: 'POST',
        body: JSON.stringify({ token: verificationCode })
      });
      const data = await res.json();

      // If verification is successful, update global auth context, local user state and close modal
      if (data.success) {
        updateUser({ ...authUser, isTwoFactorEnabled: true } as any);
        setUser(prev => ({ ...prev, isTwoFactorEnabled: true }));
        setShowTwoFactorModal(false);
        alertAction({
          title: t('common.confirm'),
          message: t('settings.alerts.2faEnabled'),
          variant: 'info'
        });
      } else { // If not, show error message
        alertAction({
          title: t('common.error'),
          message: t('settings.alerts.2faInvalid'),
          variant: 'danger'
        });
      }

    } catch (error) {
      console.error("Error verifying 2FA:", error);
      alertAction({
        title: t('common.error'),
        message: t('settings.alerts.verifyFailed'),
        variant: 'danger'
      });
    } finally {
      setTwoFactorLoading(false); // 2FA is not enabled until this step is completed
    }
  };

  // Disable 2FA (Trigger Modal)
  const handleDisable2FA = () => {
    // Reset state
    setDisable2FAPassword('');
    setDisable2FACode('');
    setDisable2FALoading(false);
    setShowDisable2FAModal(true);
  };

  // Confirm Disable 2FA (Call API)
  const confirmDisable2FA = async () => {
    setDisable2FALoading(true);
    try {
      const res = await httpClient('/api/users/2fa/disable', {
        method: 'POST',
        body: JSON.stringify({
          password: user.authProvider === 'local' ? disable2FAPassword : undefined, // Only send if local
          token: disable2FACode // Always send code
        })
      });

      const data = await res.json();

      if (res.ok) {
        updateUser({ ...authUser, isTwoFactorEnabled: false } as any);
        setUser(prev => ({ ...prev, isTwoFactorEnabled: false }));
        setShowDisable2FAModal(false);
        toast.success('Two-Factor Authentication Disabled');
      } else {
        toast.error(data.message || 'Failed to disable 2FA');
      }
    } catch (error) {
      console.error("Error disabling 2FA:", error);
      toast.error('An unexpected error occurred');
    } finally {
      setDisable2FALoading(false);
    }
  };

  // Copy 2FA secret to clipboard and shows "Copied!" feedback for 2 seconds
  const handleCopyCode = async () => {
    if (!twoFactorSecret) return;
    try {
      await navigator.clipboard.writeText(twoFactorSecret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy!', err);
    }
  };



  // Prevents duplicate delete requests & disables UI during deletion
  const [isDeleting, setIsDeleting] = useState(false);

  // Data & Privacy Handlers

  // Cookie preferences state
  const [cookiePrefs, setCookiePrefs] = useState({
    necessary: true, // Always enabled
    analytics: true,
    marketing: false
  });

  // Load cookie prefs on component mount
  useEffect(() => {
    const saved = localStorage.getItem('cookie-preferences');
    if (saved) {
      try {
        // Restore cookie prefs from local storage
        setCookiePrefs(JSON.parse(saved));
      } catch (e) {
        // Fail gracefully if stored data is corrupted
        console.error('Failed to parse cookie prefs', e);
      }
    }
  }, []);

  // Toggles cookie preference (analytics or marketing) and updates changes in local storage
  const handleCookieToggle = (key: 'analytics' | 'marketing') => {
    const newPrefs = { ...cookiePrefs, [key]: !cookiePrefs[key] };

    setCookiePrefs(newPrefs);

    // Save updated cookie prefs to local storage
    localStorage.setItem('cookie-preferences', JSON.stringify(newPrefs));

    // Ensure consent key is set to true if they are editing settings
    localStorage.setItem('cookie-consent', 'true');
  };

  // Handle delete account button click
  const handleDeleteClick = async () => {
    const confirmed = await confirmAction({
      title: t('settings.privacy.delete.modal.title', 'Delete Account?'),
      message: t('settings.privacy.delete.modal.desc', 'This action cannot be undone. This will permanently delete your account, saved preferences, and quiz results.'),
      variant: 'danger',
      confirmLabel: t('settings.privacy.delete.modal.submitBtn', 'Delete Account'),
      verificationKeyword: 'DELETE',
      verificationPlaceholder: t('settings.privacy.delete.modal.confirmWord', 'DELETE')
    });

    if (!confirmed) return;

    setIsDeleting(true);

    try {
      // Backend API call 
      const res = await httpClient('/api/users/me', {
        method: 'DELETE'
      });

      if (res.ok) {
        // If successfully deleted, clear auth state and redirect
        logout();
        toast.info(t('settings.toast.accountDeleted', 'Your account has been deleted permanently.'));
        navigate('/');
      } else {
        // Handle expired or invalid session
        if (res.status === 401) {
          toast.warning(t('auth.toast.sessionExpired', 'Your session has expired. Please log in again.'));
          logout();
          navigate('/login');
          return;
        }

        // Handle other errors
        const errData = await res.json().catch(() => ({}));
        console.error('Delete failed:', res.status, errData);

        toast.error(`${t('settings.toast.deleteFailed', 'Failed to delete account')}: ${errData.message || 'Unknown error'}`);
      }
    } catch (error) {
      // Network or unexpected error
      console.error('Error deleting account:', error);
      toast.error(t('common.toast.error', 'An unexpected error occurred. Please try again.'));
    } finally {
      // Always re-enable UI
      setIsDeleting(false);
    }
  };

  // Theme button config
  const themeOptions: { value: 'light' | 'dark' | 'system'; label: string; description: string }[] = [
    { value: 'light', label: 'Light', description: 'Light mode' },
    { value: 'dark', label: 'Dark', description: 'Dark mode' },
    { value: 'system', label: 'System', description: 'Follow system' },
  ];

  return (
    // Render JSX
    <div className="min-h-screen bg-white dark:bg-gray-950">

      {/* Navigation bar */}
      <Navbar />

      {/* Page title and subtitle */}
      <section className="pt-32 pb-12 px-4 bg-white dark:bg-gray-950 relative">
        <div className="max-w-3xl mx-auto text-center relative z-10">
          <ScrollRevelation>
            <div className="inline-flex items-center justify-center p-3 bg-indigo-50 dark:bg-indigo-950 rounded-2xl text-indigo-600 dark:text-indigo-400 mb-6">
              <Settings className="w-8 h-8" />
            </div>
            <h1 className="text-4xl md:text-5xl font-serif font-bold text-gray-900 dark:text-gray-100 mb-4 leading-tight">
              {t('settings_nav.title')}
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-xl mx-auto">
              {t('settings.account.subtitle')} & {t('settings.security.subtitle')}
            </p>
          </ScrollRevelation>
        </div>
      </section>

      <section className="pb-24 bg-white dark:bg-gray-950">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <ScrollRevelation delay={0.1}>
            <div className="space-y-8">

              {/* Account Section */}
              <Card className="p-8 dark:bg-gray-900 dark:border-gray-800">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0 mb-8">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-indigo-50 dark:bg-indigo-950 rounded-xl">
                      <User className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('settings.account.title')}</h2>
                      <p className="text-gray-600 dark:text-gray-400">{t('settings.account.subtitle')}</p>
                    </div>
                  </div>

                  <div className="flex-shrink-0 ml-4">
                    {!editingAccount ? (
                      <Button variant="outline" onClick={() => setEditingAccount(true)} className="flex items-center gap-2 whitespace-nowrap dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800">
                        <Edit2 className="h-4 w-4" />
                        {t('settings.btn.edit')}
                      </Button>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Button
                          variant="primary"
                          onClick={handleAccountSave}
                          className="flex items-center gap-2 whitespace-nowrap"
                          disabled={!isAccountFormValid()}
                        >
                          <Save className="h-4 w-4" />
                          {t('settings.btn.save')}
                        </Button>
                        <Button variant="outline" onClick={handleAccountCancel} className="flex items-center justify-center px-3 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800">
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Profile Picture Section */}
                <div className="flex flex-col sm:flex-row items-center gap-6 mb-8 pb-8 border-b border-gray-100 dark:border-gray-800">
                  <div className="relative group">

                    {/* Avatar Display */}
                    <div className="w-24 h-24 rounded-full overflow-hidden bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900 dark:to-purple-900 flex items-center justify-center border-4 border-white dark:border-gray-800 shadow-lg">
                      {(editingAccount ? tempAccount.avatar : user.avatar) ? (
                        <img
                          src={editingAccount ? (tempAccount.avatar || user.avatar) : user.avatar}
                          alt="Profile"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">
                          {(editingAccount ? tempAccount.name : user.name)?.charAt(0)?.toUpperCase() || 'U'}
                        </span>
                      )}
                    </div>

                    {/* Camera Overlay Button that only show when editing */}
                    {editingAccount && (
                      <button
                        onClick={() => avatarInputRef.current?.click()}
                        disabled={avatarUploading}
                        className="absolute bottom-0 right-0 p-2 bg-indigo-600 rounded-full text-white shadow-lg hover:bg-indigo-700 transition-all duration-200 group-hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Change photo • Max 2MB • JPG, PNG, GIF"
                      >
                        {avatarUploading ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Camera className="w-4 h-4" />
                        )}
                      </button>
                    )}

                    {/* Hidden File Input */}
                    <input
                      ref={avatarInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      className="hidden"
                    />
                  </div>

                  <div className="text-center sm:text-left self-center">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">{user.name || 'Your Name'}</h3>

                    <div className="flex flex-col sm:flex-row items-center gap-3">
                      <p className="text-sm text-gray-500 dark:text-gray-400">{user.email}</p>

                      {/* Badges Container */}
                      <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                        {/* Role Badge */}
                        <div className="relative group cursor-help">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center ${user.role === 'ADMIN'
                            ? 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300'
                            : 'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300'
                            }`}>
                            {user.role === 'ADMIN' ? (
                              <Crown className="w-4 h-4" />
                            ) : (
                              <GraduationCap className="w-4 h-4" />
                            )}
                          </div>

                          {/* Custom Tooltip */}
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-gray-900 text-white text-xs font-medium rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-all duration-200 whitespace-nowrap pointer-events-none z-50 transform translate-y-1 group-hover:translate-y-0 text-center min-w-[80px]">
                            <div className="font-bold text-sm mb-0.5">
                              {user.role === 'ADMIN' ? 'Admin' : 'Student'}
                            </div>
                            <div className="text-gray-300 text-[10px] font-normal">
                              {user.role === 'ADMIN' ? 'System Administrator' : 'Registered Student'}
                            </div>
                            {/* Tooltip Arrow */}
                            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
                          </div>
                        </div>


                        {/* Other Badges */}
                        <div className="flex items-center gap-1">
                          {/* Security Guru Badge (Awarded if badge present OR 2FA enabled) */}
                          {(user.badges?.includes('security-guru') || user.isTwoFactorEnabled) && (
                            <div className="relative group cursor-help">
                              <div className="w-7 h-7 rounded-full flex items-center justify-center bg-amber-100 dark:bg-amber-900 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                                <ShieldCheck className="w-4 h-4" />
                              </div>
                              {/* Custom Tooltip */}
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-gray-900 text-white text-xs font-medium rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-all duration-200 whitespace-nowrap pointer-events-none z-50 transform translate-y-1 group-hover:translate-y-0 text-center min-w-[100px]">
                                <div className="font-bold text-sm mb-0.5 text-amber-400">Security Guru</div>
                                <div className="text-gray-300 text-[10px] font-normal">Enabled 2FA Security</div>
                                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
                              </div>
                            </div>
                          )}

                          {/* Self Explorer Badge */}
                          {user.badges?.includes('self-explorer') && (
                            <div className="relative group cursor-help">
                              <div className="w-7 h-7 rounded-full flex items-center justify-center bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                                <Compass className="w-4 h-4" />
                              </div>
                              {/* Custom Tooltip */}
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-gray-900 text-white text-xs font-medium rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-all duration-200 whitespace-nowrap pointer-events-none z-50 transform translate-y-1 group-hover:translate-y-0 text-center min-w-[100px]">
                                <div className="font-bold text-sm mb-0.5 text-blue-400">Self Explorer</div>
                                <div className="text-gray-300 text-[10px] font-normal">Took Personality Test</div>
                                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
                              </div>
                            </div>
                          )}

                          {/* Focus Master Badge */}
                          {user.badges?.includes('focus-master') && (
                            <div className="relative group cursor-help">
                              <div className="w-7 h-7 rounded-full flex items-center justify-center bg-rose-100 dark:bg-rose-900 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
                                <Target className="w-4 h-4" />
                              </div>
                              {/* Custom Tooltip */}
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-gray-900 text-white text-xs font-medium rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-all duration-200 whitespace-nowrap pointer-events-none z-50 transform translate-y-1 group-hover:translate-y-0 text-center min-w-[100px]">
                                <div className="font-bold text-sm mb-0.5 text-rose-400">Focus Master</div>
                                <div className="text-gray-300 text-[10px] font-normal">50+ Focus Sessions</div>
                                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Full Name */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('settings.account.labels.fullName')}</label>
                    <div className="relative">
                      <input
                        type="text"
                        name="name"
                        value={editingAccount ? (tempAccount.name || '') : (user.name || '')}
                        onChange={handleAccountChange}
                        disabled={!editingAccount}
                        className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-50 dark:disabled:bg-gray-800 disabled:text-gray-500 dark:disabled:text-gray-400 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700 transition-colors duration-200 ${getAccountBorderColor('name')}`}
                      />
                      {getAccountFieldSuccess('name') && (
                        <div className="absolute right-3 top-3.5 text-green-500 dark:text-green-400">✓</div>
                      )}
                    </div>
                    {editingAccount && accountErrors.name && (
                      <p className="text-red-500 dark:text-red-400 text-sm mt-1">{accountErrors.name}</p>
                    )}
                  </div>

                  {/* Email */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('settings.account.labels.email')}</label>
                    <div className="relative">
                      <input
                        type="email"
                        name="email"
                        value={editingAccount ? (tempAccount.email || '') : (user.email || '')}
                        onChange={handleAccountChange}
                        disabled={!editingAccount}
                        className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-50 dark:disabled:bg-gray-800 disabled:text-gray-500 dark:disabled:text-gray-400 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700 transition-colors duration-200 ${getAccountBorderColor('email')}`}
                      />
                      {getAccountFieldSuccess('email') && (
                        <div className="absolute right-3 top-3.5 text-green-500 dark:text-green-400">✓</div>
                      )}
                    </div>
                    {editingAccount && accountErrors.email && (
                      <p className="text-red-500 dark:text-red-400 text-sm mt-1">{accountErrors.email}</p>
                    )}
                  </div>

                  {/* Phone */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('settings.account.labels.phone')}</label>
                    <div
                      className={`relative flex items-center w-full border rounded-xl transition-all duration-200
                      ${editingAccount
                          ? `bg-white dark:bg-gray-800 focus-within:ring-2 focus-within:ring-indigo-200 ${getAccountBorderColor('phone')}`
                          : 'bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-500 dark:text-gray-400'
                        }`}
                    >
                      <div className="w-[125px] flex-shrink-0 border-r border-gray-100 dark:border-gray-700">
                        <CustomSelect
                          options={[
                            { label: '🇲🇾 +60', value: '+60' },
                            { label: '🇸🇬 +65', value: '+65' },
                            { label: '🇮🇩 +62', value: '+62' },
                            { label: '🇺🇸 +1', value: '+1' },
                            { label: '🇬🇧 +44', value: '+44' },
                            { label: '🇦🇺 +61', value: '+61' },
                          ]}
                          value={editingAccount ? (tempAccount.phoneCountryCode || '+60') : (user.phoneCountryCode || '+60')}
                          onChange={(val) => setTempAccount(prev => ({ ...prev, phoneCountryCode: val }))}
                          placeholder="+60"
                          className="bg-transparent dark:text-gray-300"
                          variant="ghost"
                          disabled={!editingAccount}
                        />
                      </div>
                      <input
                        type="tel"
                        name="phone"
                        value={editingAccount ? (tempAccount.phone || '') : (user.phone || '')}
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^0-9 ]/g, '');
                          setTempAccount(prev => ({ ...prev, phone: val }));
                          setAccountTouched(prev => ({ ...prev, phone: true }));
                          // Optional field validation: only validate if there's input
                          setAccountErrors(prev => ({ ...prev, phone: '' }));
                        }}
                        disabled={!editingAccount}
                        placeholder="12 345 6789"
                        className="flex-1 min-w-0 px-4 py-3 border-0 focus:ring-0 bg-transparent disabled:bg-transparent disabled:text-gray-500 dark:disabled:text-gray-400 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 relative z-10"
                      />
                      {getAccountFieldSuccess('phone') && (
                        <div className="absolute right-3 top-3.5 text-green-500 dark:text-green-400">✓</div>
                      )}
                    </div>
                    {editingAccount && accountErrors.phone && (
                      <p className="text-red-500 dark:text-red-400 text-sm mt-1">{accountErrors.phone}</p>
                    )}
                  </div>

                  {/* Gender */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('settings.account.labels.gender')}</label>
                    <CustomSelect
                      options={[
                        { label: t('settings.account.genders.male'), value: 'Male' },
                        { label: t('settings.account.genders.female'), value: 'Female' },
                        { label: t('settings.account.genders.nonBinary'), value: 'Non-binary' },
                        { label: t('settings.account.genders.preferNotToSay'), value: 'Prefer not to say' },
                      ]}
                      value={editingAccount ? (tempAccount.gender || '') : (user.gender || '')}
                      onChange={(val) => setTempAccount(prev => ({ ...prev, gender: val }))}
                      placeholder={user.gender || t('settings.account.placeholders.gender')}
                      disabled={!editingAccount}
                      className="dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700"
                    />
                  </div>

                  {/* Date of Birth */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('settings.account.labels.dob')}</label>
                    <input
                      type="date"
                      name="dateOfBirth"
                      value={editingAccount ? (tempAccount.dateOfBirth || '') : (user.dateOfBirth || '')}
                      onChange={handleAccountChange}
                      disabled={!editingAccount}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-50 dark:disabled:bg-gray-800 disabled:text-gray-500 dark:text-gray-100 dark:bg-gray-800"
                    />
                  </div>
                </div>
              </Card>

              {/* Security Section with current password validation */}
              <Card className="p-8 dark:bg-gray-900 dark:border-gray-800">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0 mb-8">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-red-50 dark:bg-red-950 rounded-xl">
                      <Shield className="h-6 w-6 text-red-600 dark:text-red-400" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('settings.security.title')}</h2>
                      <p className="text-gray-600 dark:text-gray-400">{t('settings.security.subtitle')}</p>
                    </div>
                  </div>

                  <div className="flex-shrink-0 ml-4">
                    {!editingSecurity && authUser?.authProvider !== 'google' ? (
                      <Button
                        variant="outline"
                        onClick={() => setEditingSecurity(true)}
                        className="flex items-center gap-2 whitespace-nowrap dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                      >
                        <Edit2 className="h-4 w-4" />
                        {t('settings.btn.edit')}
                      </Button>
                    ) : editingSecurity ? (
                      <div className="flex gap-2">
                        <Button
                          variant="primary"
                          onClick={handleSecuritySave}
                          className="flex items-center gap-2 whitespace-nowrap"
                          disabled={!isPasswordFormValid()}
                        >
                          <Save className="h-4 w-4" />
                          {t('settings.btn.save')}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={handleSecurityCancel}
                          className="dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="space-y-6">
                  {/* Change Password (Conditionally Rendered) */}
                  {authUser?.authProvider === 'google' ? (
                    <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                        <Key className="h-4 w-4" />
                        {t('settings.security.changePassword')}
                      </h3>
                      <div className="flex flex-col items-center justify-center p-8 text-center border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900">
                        <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-3">
                          <Globe className="w-6 h-6 text-gray-500 dark:text-gray-400" />
                        </div>
                        <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-1">{t('settings.security.managedByGoogle')}</h4>
                        <p className="text-gray-500 dark:text-gray-400 text-sm mb-4 max-w-xs">
                          {t('settings.security.googleDesc')}
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open('https://myaccount.google.com/security', '_blank')}
                          className="dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                        >
                          {t('settings.security.googleBtn')}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                        <Key className="h-4 w-4" />
                        {t('settings.security.changePassword')}
                      </h3>

                      {editingSecurity ? (
                        <div className="space-y-6">
                          {/* Current Password */}
                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                              {t('settings.security.labels.currentPassword')}
                            </label>
                            <div className="relative">
                              <input
                                type={showCurrentPassword ? "text" : "password"}
                                name="currentPassword"
                                value={tempSecurity.currentPassword}
                                onChange={handleSecurityChange}
                                placeholder={t('settings.security.phCurrent', 'Enter your current password')}
                                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600 transition-colors duration-200 pr-10 ${getPasswordBorderColor('currentPassword')}`}
                              />
                              <button
                                type="button"
                                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                className="absolute right-3 top-3.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                              >
                                {showCurrentPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                              </button>

                              {/* Show validation status icon */}
                              {validatingCurrentPassword && (
                                <div className="absolute right-10 top-3.5 text-yellow-500 dark:text-yellow-400 animate-pulse">
                                  <div className="h-5 w-5 border-2 border-yellow-500 dark:border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
                                </div>
                              )}
                              {currentPasswordValid === true && !validatingCurrentPassword && (
                                <div className="absolute right-10 top-3.5 text-green-500 dark:text-green-400">
                                  <CheckCircle className="h-5 w-5" />
                                </div>
                              )}
                              {currentPasswordValid === false && !validatingCurrentPassword && (
                                <div className="absolute right-10 top-3.5 text-red-500 dark:text-red-400">
                                  <XCircle className="h-5 w-5" />
                                </div>
                              )}
                            </div>

                            {/* Validation messages below the input */}
                            <div className="min-h-[20px]">
                              {validatingCurrentPassword && (
                                <p className="text-yellow-600 dark:text-yellow-400 text-sm mt-1 flex items-center gap-1">
                                  <div className="h-3 w-3 border-2 border-yellow-600 dark:border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
                                  Checking password...
                                </p>
                              )}
                              {currentPasswordValid === true && !validatingCurrentPassword && (
                                <p className="text-green-600 dark:text-green-400 text-sm mt-1 flex items-center gap-1">
                                  <CheckCircle className="h-4 w-4" />
                                  {t('settings.security.password.currentCorrect', 'Current password is correct')}
                                </p>
                              )}
                              {currentPasswordValid === false && !validatingCurrentPassword && (
                                <p className="text-red-500 dark:text-red-400 text-sm mt-1 flex items-center gap-1">
                                  <XCircle className="h-4 w-4" />
                                  {t('settings.security.password.currentIncorrect', 'Current password is incorrect')}
                                </p>
                              )}
                              {currentPasswordValidationMessage && !validatingCurrentPassword && currentPasswordValid === null && (
                                <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{currentPasswordValidationMessage}</p>
                              )}
                              {passwordErrors.currentPassword && !currentPasswordValidationMessage && (
                                <p className="text-red-500 dark:text-red-400 text-sm mt-1">{passwordErrors.currentPassword}</p>
                              )}
                            </div>
                          </div>

                          {/* New Password */}
                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                              {t('settings.security.labels.newPassword')}
                            </label>
                            <div className="relative">
                              <input
                                type={showNewPassword ? "text" : "password"}
                                name="newPassword"
                                value={tempSecurity.newPassword}
                                onChange={handleSecurityChange}
                                placeholder={t('settings.security.phNew', 'Create a new password')}
                                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600 transition-colors duration-200 pr-10 ${getPasswordBorderColor('newPassword')}`}
                              />
                              <button
                                type="button"
                                onClick={() => setShowNewPassword(!showNewPassword)}
                                className="absolute right-3 top-3.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                              >
                                {showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                              </button>
                              {getPasswordFieldSuccess('newPassword') && (
                                <div className="absolute right-10 top-3.5 text-green-500 dark:text-green-400">
                                  <CheckCircle className="h-5 w-5" />
                                </div>
                              )}
                            </div>
                            {passwordErrors.newPassword && (
                              <p className="text-red-500 dark:text-red-400 text-sm mt-1">{passwordErrors.newPassword}</p>
                            )}
                            {tempSecurity.newPassword.length > 0 && !passwordErrors.newPassword && (
                              <p className="text-green-600 dark:text-green-400 text-sm mt-1 flex items-center gap-1">
                                <CheckCircle className="h-4 w-4" />
                                Password meets all requirements
                              </p>
                            )}
                          </div>

                          {/* Confirm New Password */}
                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                              {t('settings.security.labels.confirmPassword')}
                            </label>
                            <div className="relative">
                              <input
                                type={showConfirmPassword ? "text" : "password"}
                                name="confirmPassword"
                                value={tempSecurity.confirmPassword}
                                onChange={handleSecurityChange}
                                placeholder={t('settings.security.phConfirm', 'Confirm your new password')}
                                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600 transition-colors duration-200 pr-10 ${getPasswordBorderColor('confirmPassword')}`}
                              />
                              <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="absolute right-3 top-3.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                              >
                                {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                              </button>
                              {getPasswordFieldSuccess('confirmPassword') && (
                                <div className="absolute right-10 top-3.5 text-green-500 dark:text-green-400">
                                  <CheckCircle className="h-5 w-5" />
                                </div>
                              )}
                            </div>
                            {passwordErrors.confirmPassword && (
                              <p className="text-red-500 dark:text-red-400 text-sm mt-1">{passwordErrors.confirmPassword}</p>
                            )}
                            {tempSecurity.confirmPassword.length > 0 && !passwordErrors.confirmPassword && (
                              <p className="text-green-600 dark:text-green-400 text-sm mt-1 flex items-center gap-1">
                                <CheckCircle className="h-4 w-4" />
                                {t('settings.security.password.match', 'Passwords match')}
                              </p>
                            )}
                          </div>

                          {/* Validation status summary */}
                          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              {t('settings.security.password.requirements', 'Requirements to save:')}
                            </p>
                            <ul className="text-sm space-y-1">
                              <li className={`flex items-center gap-2 ${currentPasswordValid === true ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-500'}`}>
                                {currentPasswordValid === true ? (
                                  <CheckCircle className="h-4 w-4" />
                                ) : (
                                  <div className="h-4 w-4 rounded-full border border-gray-400 dark:border-gray-600"></div>
                                )}
                                {t('settings.security.password.currentVerified', 'Current password verified')}
                              </li>
                              <li className={`flex items-center gap-2 ${!passwordErrors.newPassword && tempSecurity.newPassword.length > 0 ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-500'}`}>
                                {!passwordErrors.newPassword && tempSecurity.newPassword.length > 0 ? (
                                  <CheckCircle className="h-4 w-4" />
                                ) : (
                                  <div className="h-4 w-4 rounded-full border border-gray-400 dark:border-gray-600"></div>
                                )}
                                {t('settings.security.password.newValid', 'New password valid')}
                              </li>
                              <li className={`flex items-center gap-2 ${!passwordErrors.confirmPassword && tempSecurity.confirmPassword.length > 0 ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-500'}`}>
                                {!passwordErrors.confirmPassword && tempSecurity.confirmPassword.length > 0 ? (
                                  <CheckCircle className="h-4 w-4" />
                                ) : (
                                  <div className="h-4 w-4 rounded-full border border-gray-400 dark:border-gray-600"></div>
                                )}
                                {t('settings.security.password.match', 'Passwords match')}
                              </li>
                            </ul>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-4">
                          <Lock className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                          <p className="text-gray-500 dark:text-gray-400">{t('settings.security.password.clickEdit', 'Click "Edit" to change your password')}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Two-Factor Authentication */}
                  <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-indigo-50 dark:bg-indigo-950 rounded-lg text-indigo-600 dark:text-indigo-400">
                        <Smartphone className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100">{t('settings.security.twoFactor.title', 'Two-Factor Authentication')}</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{t('settings.security.twoFactor.subtitle', 'Add an extra layer of security')}</p>
                      </div>
                    </div>
                    {/* Toggle Switch */}
                    <button
                      onClick={() => {
                        if (user.isTwoFactorEnabled) {
                          handleDisable2FA();
                        } else {
                          handleStart2FA();
                        }
                      }}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 ${user.isTwoFactorEnabled ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-600'
                        }`}
                    >
                      <span
                        className={`${user.isTwoFactorEnabled ? 'translate-x-6' : 'translate-x-1'
                          } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                      />
                    </button>
                  </div>
                </div>
              </Card>

              {/* Preferences Section */}
              <Card className="p-8 dark:bg-gray-900 dark:border-gray-800">
                <div className="flex justify-between items-center mb-8">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-purple-50 dark:bg-purple-950 rounded-xl">
                      <Palette className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('settings.preferences.title')}</h2>
                      <p className="text-gray-600 dark:text-gray-400">{t('settings.preferences.subtitle')}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  {/* Theme Selection */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                      <Palette className="h-4 w-4" />
                      {t('settings.appearance.title')}
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {themeOptions.map((option) => (
                        <button
                          key={option.value}
                          onClick={() => handleThemeChange(option.value)}
                          className={`p-4 border rounded-xl text-center transition-all ${activeTheme === option.value
                            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300'
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                            }`}
                        >
                          <div className="font-medium capitalize">{t(`settings.appearance.${option.value}`, { defaultValue: `${option.value} mode` })}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Language Selection */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-xl gap-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-100 dark:bg-green-950 rounded-lg">
                        <Globe className="h-5 w-5 text-green-600 dark:text-green-400" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100">{t('settings.language.title')}</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{t('settings.language.subtitle')}</p>
                      </div>
                    </div>
                    <div className="w-[180px]">
                      <CustomSelect
                        options={[
                          { label: 'English', value: 'english' },
                          { label: '中文 (简体)', value: 'chinese' },
                          { label: 'Bahasa Melayu', value: 'malay' },
                          { label: 'தமிழ்', value: 'tamil' },
                        ]}
                        value={general.language}
                        onChange={(val) => handleLanguageChange(val)}
                        placeholder={t('settings.language.placeholder')}
                        className="dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700"
                      />
                    </div>
                  </div>

                  {/* Notification Toggles */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                      <Bell className="h-4 w-4" />
                      {t('settings.notifications.title')}
                    </h3>

                    {[
                      { key: 'notifications' as const, label: t('settings.notifications.enableAll') },
                      { key: 'emailNotifications' as const, label: t('settings.notifications.email') },
                      { key: 'pushNotifications' as const, label: t('settings.notifications.push') },
                    ].map((item) => (
                      <div key={item.key} className="flex items-center justify-between">
                        <span className="text-gray-700 dark:text-gray-300">{item.label}</span>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={tempGeneral[item.key]}
                            onChange={() => handleLivePreferenceToggle(item.key)}
                            className="sr-only peer"
                          />
                          <div className={`w-11 h-6 rounded-full peer peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-500 peer-focus:ring-offset-2 dark:peer-focus:ring-offset-gray-900 transition-colors duration-200 ${tempGeneral[item.key] ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-600'
                            }`}></div>
                          <div className={`absolute left-[2px] top-[2px] bg-white border border-gray-300 dark:border-gray-600 rounded-full h-5 w-5 transition-all duration-200 ${tempGeneral[item.key] ? 'translate-x-[20px] border-white' : 'translate-x-0'
                            }`}></div>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>

              {/* Data and Privacy Section */}
              <Card className="p-8 dark:bg-gray-900 dark:border-gray-800">
                <div className="flex justify-between items-center mb-8">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-amber-50 dark:bg-amber-950 rounded-xl">
                      <Cookie className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('settings.privacy.title')}</h2>
                      <p className="text-gray-600 dark:text-gray-400">{t('settings.privacy.subtitle')}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-8">
                  {/* Cookie Preferences */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                      <Cookie className="h-4 w-4" />
                      {t('settings.privacy.cookies.title')}
                    </h3>

                    {/* Necessary Cookies (Disabled) */}
                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 opacity-75">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-100 dark:bg-green-950 rounded-lg">
                          <Shield className="w-4 h-4 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-gray-100">{t('settings.privacy.cookies.necessary.title')}</h4>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{t('settings.privacy.cookies.necessary.desc')}</p>
                        </div>
                      </div>
                      <div className="relative">
                        <input type="checkbox" checked={true} disabled className="sr-only" />
                        <div className="w-11 h-6 bg-green-500 rounded-full opacity-50"></div>
                        <div className="absolute left-[22px] top-0.5 w-5 h-5 bg-white rounded-full shadow-sm"></div>
                      </div>
                    </div>

                    {/* Analytics Cookies */}
                    <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 dark:bg-blue-950 rounded-lg">
                          <Eye className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-gray-100">{t('settings.privacy.cookies.analytics.title')}</h4>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{t('settings.privacy.cookies.analytics.desc')}</p>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={cookiePrefs.analytics}
                          onChange={() => handleCookieToggle('analytics')}
                          className="sr-only peer"
                        />
                        <div className={`w-11 h-6 rounded-full peer peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-500 peer-focus:ring-offset-2 dark:peer-focus:ring-offset-gray-900 transition-colors duration-200 ${cookiePrefs.analytics ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-600'
                          }`}></div>
                        <div className={`absolute left-[2px] top-[2px] bg-white border border-gray-300 dark:border-gray-600 rounded-full h-5 w-5 transition-all duration-200 ${cookiePrefs.analytics ? 'translate-x-[20px] border-white' : 'translate-x-0'
                          }`}></div>
                      </label>
                    </div>

                    {/* Marketing Cookies */}
                    <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-100 dark:bg-purple-950 rounded-lg">
                          <Smartphone className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-gray-100">{t('settings.privacy.cookies.marketing.title')}</h4>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{t('settings.privacy.cookies.marketing.desc')}</p>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={cookiePrefs.marketing}
                          onChange={() => handleCookieToggle('marketing')}
                          className="sr-only peer"
                        />
                        <div className={`w-11 h-6 rounded-full peer peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-500 peer-focus:ring-offset-2 dark:peer-focus:ring-offset-gray-900 transition-colors duration-200 ${cookiePrefs.marketing ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-600'
                          }`}></div>
                        <div className={`absolute left-[2px] top-[2px] bg-white border border-gray-300 dark:border-gray-600 rounded-full h-5 w-5 transition-all duration-200 ${cookiePrefs.marketing ? 'translate-x-[20px] border-white' : 'translate-x-0'
                          }`}></div>
                      </label>
                    </div>
                  </div>

                  <div className="border-t border-gray-200 dark:border-gray-700 my-6"></div>

                  {/* Delete Account */}
                  <div className="bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900 rounded-xl p-6">
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-red-100 dark:bg-red-900 rounded-full">
                        <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-red-900 dark:text-red-400 mb-1">{t('settings.privacy.delete.title')}</h3>
                        <p className="text-red-700 dark:text-red-500 text-sm mb-4">
                          {t('settings.privacy.delete.desc')}
                        </p>
                        <button
                          onClick={handleDeleteClick}
                          disabled={isDeleting}
                          className={`px-4 py-2 bg-red-600 dark:bg-red-800 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2 shadow-sm ${isDeleting ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          <Trash2 className="h-4 w-4" />
                          {t('settings.privacy.delete.action', 'Delete Account')}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </ScrollRevelation >
        </div >
      </section >

      {/* Modal containers handled by ConfirmProvider */}

      {/* Disable 2FA Modal */}
      {
        showDisable2FAModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 dark:bg-black/70 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-md w-full p-6 shadow-xl animate-in fade-in zoom-in duration-200 relative border border-gray-200 dark:border-gray-800">
              <div className="text-center mb-6">
                <div className="w-12 h-12 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mx-auto mb-4">
                  <ShieldCheck className="w-6 h-6 text-red-600 dark:text-red-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">{t('settings.security.disable2fa.title', 'Disable 2FA?')}</h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  {t('settings.security.disable2fa.desc', 'To ensure your security, please verify your identity to turn off Two-Factor Authentication.')}
                </p>
              </div>

              <div className="space-y-4">
                {/* 1. Password Step (Local Users Only) */}
                {user.authProvider === 'local' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('settings.security.disable2fa.passwordLabel', 'Password')}</label>
                    <div className="relative">
                      <input
                        type={showDisablePassword ? "text" : "password"}
                        value={disable2FAPassword}
                        onChange={(e) => setDisable2FAPassword(e.target.value)}
                        placeholder={t('settings.security.phLoginPass', 'Enter your login password')}
                        className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700"
                      />
                      <button
                        type="button"
                        onClick={() => setShowDisablePassword(!showDisablePassword)}
                        className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                      >
                        {showDisablePassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                )}

                {/* 2. 2FA Code Step (Everyone) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('settings.security.disable2fa.codeLabel', 'Current 2FA Code')}
                  </label>
                  <input
                    type="text"
                    value={disable2FACode}
                    onChange={(e) => setDisable2FACode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                    placeholder="000 000"
                    className="w-full text-center text-2xl font-mono tracking-widest px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700"
                    autoFocus
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-center">
                    {t('settings.security.disable2fa.codeDesc', 'Enter the 6-digit code from your authenticator app.')}
                  </p>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button variant="outline" onClick={() => setShowDisable2FAModal(false)} className="flex-1 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800">
                    {t('common.cancel', 'Cancel')}
                  </Button>
                  <Button
                    variant="primary"
                    onClick={confirmDisable2FA}
                    isLoading={disable2FALoading}
                    disabled={
                      (user.authProvider === 'local' && !disable2FAPassword) ||
                      disable2FACode.length !== 6
                    }
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white shadow-red-500/30"
                  >
                    {t('settings.security.disable2fa.button', 'Disable 2FA')}
                  </Button>
                </div>
              </div>

              <button
                onClick={() => setShowDisable2FAModal(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        )
      }

      {/* 2FA Setup Modal */}
      {
        showTwoFactorModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 dark:bg-black/70 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-lg w-full p-6 shadow-xl animate-in fade-in zoom-in duration-200 relative border border-gray-200 dark:border-gray-800">
              <div className="text-center mb-6">
                <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-950 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Smartphone className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  {twoFactorStep === 'qr' && t('settings.security.twoFactor.qrTitle', 'Scan QR Code')}
                  {twoFactorStep === 'verify' && t('settings.security.twoFactor.verifyTitle', 'Verify Code')}
                </h3>
                <p className="text-gray-500 dark:text-gray-400 mt-2">
                  {twoFactorStep === 'qr' && t('settings.security.twoFactor.qrDesc', 'Open your authenticator app and scan this QR code.')}
                  {twoFactorStep === 'verify' && t('settings.security.twoFactor.verifyDesc', 'Enter the 6-digit code from your authenticator app.')}
                </p>
              </div>

              {twoFactorStep === 'qr' && (
                <div className="space-y-6">
                  <div className="flex justify-center bg-white dark:bg-gray-800 p-4 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700">
                    {qrCodeUrl ? (
                      <img src={qrCodeUrl} alt="2FA QR Code" className="w-48 h-48" />
                    ) : (
                      <div className="w-48 h-48 flex items-center justify-center text-gray-400 dark:text-gray-500">{t('common.loading', 'Loading...')}</div>
                    )}
                  </div>

                  {/* Secret Key Display */}
                  {twoFactorSecret && (
                    <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg flex items-center justify-between gap-3 border border-gray-200 dark:border-gray-700">
                      <div className="flex-1 min-w-0 text-center sm:text-left">
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('settings.security.twoFactor.manualCode', 'Manual Entry Code')}</p>
                        <code className="text-sm font-mono font-medium text-gray-900 dark:text-gray-100 break-all select-all">{twoFactorSecret}</code>
                      </div>

                      {/* Copy image button */}
                      <button
                        onClick={handleCopyCode}
                        className="flex-shrink-0 p-2 text-gray-500 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400 transition-colors flex items-center gap-1.5"
                        title={t('common.copy', 'Copy to clipboard')}
                      >
                        {copied ? (
                          <>
                            <Check className="w-4 h-4 text-green-500 dark:text-green-400" />
                            <span className="text-xs font-medium text-green-500 dark:text-green-400">{t('common.copied', 'Copied!')}</span>
                          </>
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  )}

                  <Button
                    variant="primary"
                    onClick={() => setTwoFactorStep('verify')}
                    className="w-full"
                  >
                    {t('common.next', 'Next')}
                  </Button>
                </div>
              )}

              {twoFactorStep === 'verify' && (
                <div className="space-y-4">
                  <input
                    type="text"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                    placeholder="000 000"
                    className="w-full text-center text-3xl tracking-widest font-mono py-3 border-2 border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 rounded-xl focus:border-indigo-500 focus:ring-0"
                    autoFocus
                  />
                  <div className="flex gap-3">
                    <Button
                      variant="primary"
                      onClick={handleVerify2FA}
                      isLoading={twoFactorLoading}
                      className="flex-1"
                      disabled={verificationCode.length !== 6}
                    >
                      {t('settings.security.twoFactor.verifyBtn', 'Verify & Enable')}
                    </Button>
                    <Button variant="outline" onClick={() => setTwoFactorStep('qr')} className="flex-1 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800">
                      {t('common.back', 'Back')}
                    </Button>
                  </div>
                </div>
              )}

              {/* Close button */}
              <button
                onClick={() => setShowTwoFactorModal(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        )
      }

      <Footer />
    </div >
  );
};

export default SettingsPage;