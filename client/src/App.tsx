// Root application component with React Router, context providers, and route definitions
import React, { useState, useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { SavedCareersProvider } from './contexts/SavedCareersContext';
import { SavedCoursesProvider } from './contexts/SavedCoursesContext';

import './styles/animations.css';

import { IntroAnimation } from './components/ui/IntroAnimation';
import ChatbotWidget from './components/chatbot/ChatbotWidget';
import CookieConsent from './components/ui/CookieConsent';
import CustomCursor from './components/ui/CustomCursor';
import LoadingScreen from './components/ui/LoadingScreen';

import HomePage from './pages/HomePage';
import QuizPage from './pages/QuizPage';
import AboutPage from './pages/AboutPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import TermsOfServicePage from './pages/TermsOfServicePage';
import HelpPage from './pages/HelpPage';
import ContactPage from './pages/ContactPage';
import SettingsPage from './pages/SettingsPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import ResultsPage from '@/pages/ResultsPage';
import CourseListingPage from './pages/CourseListingPage';
import CourseDetailPage from './pages/CourseDetailPage';
import CreateCoursePage from './pages/admin/CreateCoursePage';
import CareerListingPage from './pages/CareerListingPage';
import CareerDetailPage from './pages/CareerDetailPage';
import CreateCareerPage from './pages/admin/CreateCareerPage';
import VirtualRoomListingPage from './pages/VirtualRoomListingPage';
import CreateRoomPage from './pages/CreateRoomPage';
import VirtualRoomDetailPage from './pages/VirtualRoomDetailPage';
import VirtualRoomPage from './pages/VirtualRoomPage';
import SavedPage from './pages/SavedPage';
import ArchivedPage from './pages/admin/ArchivedPage';
import PaymentSuccessPage from './pages/PaymentSuccessPage';
import AdminProtectedRoute from './routes/AdminProtectedRoute';
import DashboardPage from './pages/DashboardPage';
import UserMonitoringPage from './pages/admin/UserMonitoringPage';

import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { SocketProvider } from './contexts/SocketContext';
import { ChatbotProvider } from './contexts/ChatbotContext';
import { NotificationProvider } from './contexts/NotificationContext';
import ProtectedRoute from './routes/ProtectedRoute';
import UnauthorizedPage from './pages/UnauthorizedPage';
import ReportCenterPage from './pages/admin/ReportCenterPage';
import { ConfirmProvider } from './contexts/ConfirmContext';

// Scroll to top on route change
const ScrollToTop: React.FC = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
};

// Wrapper to show chatbot only for authenticated users
const AuthenticatedChatbot: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  // Don't show chatbot on virtual room meet page or if not logged in
  if (!isAuthenticated || location.pathname.endsWith('/meet')) {
    return null;
  }

  return <ChatbotWidget />;
};

const App: React.FC = () => {
  const location = useLocation();

  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  // Diagnostic log for debugging Google OAuth Client ID loading issues
  console.log('[Auth] Google Client ID loaded:', googleClientId ?
    `Length: ${googleClientId.length}, Starts with: ${googleClientId.slice(0, 5)}...` :
    'UNDEFINED');

  // Check if intro was already completed in this session or user is logged in
  const [introComplete, setIntroComplete] = useState(() => {
    // Skip intro for reset password flow
    if (location.pathname.includes('/reset-password') || location.pathname.includes('/forgot-password')) {
      return true;
    }

    // Skip intro if user is already logged in (cached user profile from previous session)
    const hasUser = localStorage.getItem('user') || sessionStorage.getItem('user');
    if (hasUser) {
      return true;
    }

    return sessionStorage.getItem('introSeen') === 'true';
  });

  // Store intro completion in sessionStorage
  const handleIntroComplete = () => {
    setIntroComplete(true);
    sessionStorage.setItem('introSeen', 'true');
  };

  const AuthGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { isAuthReady } = useAuth();

    if (!isAuthReady) {
      return <LoadingScreen />;
    }

    return <>{children}</>;
  };

  return (
    <GoogleOAuthProvider clientId={googleClientId || ""}>
      <ToastProvider>
        <ConfirmProvider>
          <AuthProvider>
            <ChatbotProvider>
              <SavedCareersProvider>
                <SavedCoursesProvider>
                  <SocketProvider>
                    <NotificationProvider>
                      <div className="bg-white min-h-screen w-full relative overflow-hidden text-black selection:bg-black selection:text-white">
                        <CustomCursor />
                        <ScrollToTop />
                        <AuthGate>
                          <AnimatePresence mode="wait">
                            {!introComplete && (
                              <motion.div
                                key="intro"
                                exit={{ opacity: 0, transition: { duration: 1 } }}
                                className="fixed inset-0 z-50 bg-white"
                              >
                                <IntroAnimation onComplete={handleIntroComplete} />
                              </motion.div>
                            )}

                            {introComplete && (
                              <motion.div
                                key="main"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ duration: 1, delay: 0.5 }}
                                className="relative z-10"
                              >
                                <Routes location={location} key={location.pathname}>

                                  {/* Public routes */}
                                  <Route path="/" element={<HomePage />} />
                                  <Route path="/about" element={<AboutPage />} />
                                  <Route path="/login" element={<LoginPage />} />
                                  <Route path="/signup" element={<SignupPage />} />
                                  <Route path="/privacy" element={<PrivacyPolicyPage />} />
                                  <Route path="/terms" element={<TermsOfServicePage />} />
                                  <Route path="/help" element={<HelpPage />} />
                                  <Route path="/contact" element={<ContactPage />} />
                                  <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                                  <Route path="/reset-password/:resetToken" element={<ResetPasswordPage />} />
                                  <Route path="/verify-email/:token" element={<VerifyEmailPage />} /> 
                                  <Route path="/unauthorized" element={<UnauthorizedPage />} />
                                  <Route path="/loading-test" element={<LoadingScreen />} />
                                  <Route path="/dashboard" element={<DashboardPage />} />

                                  {/* Protected routes accessible only after logged in */}
                                  <Route element={<ProtectedRoute />}>
                                    <Route path="/personality-test" element={<QuizPage />} />
                                    <Route path="/results" element={<ResultsPage />} />
                                    <Route path="/settings" element={<SettingsPage />} />
                                    <Route path="/courses" element={<CourseListingPage />} />
                                    <Route path="/courses/:id" element={<CourseDetailPage />} />
                                    <Route path="/careers" element={<CareerListingPage />} />
                                    <Route path="/careers/:id" element={<CareerDetailPage />} />
                                    <Route path="/saved" element={<SavedPage />} />
                                    <Route path="/rooms" element={<VirtualRoomListingPage />} />
                                    <Route path="/rooms/create" element={<CreateRoomPage />} />
                                    <Route path="/rooms/:id" element={<VirtualRoomDetailPage />} />
                                    <Route path="/rooms/:id/meet" element={<VirtualRoomPage />} />
                                    <Route path="/payment/success" element={<PaymentSuccessPage />} />

                                    {/* Admin only routes */}
                                    <Route element={<AdminProtectedRoute />}>
                                      <Route path="/courses/create" element={<CreateCoursePage />} />
                                      <Route path="/careers/create" element={<CreateCareerPage />} />
                                      <Route path="/admin/archived" element={<ArchivedPage />} />
                                      <Route path="/admin/monitoring" element={<UserMonitoringPage />} />
                                      <Route path="/admin/reports" element={<ReportCenterPage />} />

                                    </Route>
                                  </Route>

                                </Routes>

                                {/* Chatbot for authenticated users only */}
                                <AuthenticatedChatbot />

                                {/* Hide CookieConsent on reset password pages */}
                                {!location.pathname.includes('/reset-password') && <CookieConsent />}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </AuthGate>
                      </div>
                    </NotificationProvider>
                  </SocketProvider>
                </SavedCoursesProvider>
              </SavedCareersProvider>
            </ChatbotProvider>
          </AuthProvider>
        </ConfirmProvider>
      </ToastProvider>
    </GoogleOAuthProvider>
  );
};

export default App;