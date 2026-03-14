// Route guard that restricts access to authenticated users
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';

// Allows access ONLY if user is authenticated
// Otherwise redirects to /login
const ProtectedRoute = () => {
  const { t } = useTranslation();
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  // Optional: wait until auth state is resolved
  if (isLoading) {
    return <div className="p-8">{t('common.loading', 'Loading...')}</div>;
  }

  // Not logged in → redirect
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // Logged in → render child route
  return <Outlet />;
};

export default ProtectedRoute;
