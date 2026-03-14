// Route guard that restricts access to admin-only pages
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '@in-aspired/shared';

const AdminProtectedRoute = () => {
    const { user, isAuthenticated, isLoading } = useAuth();

    if (isLoading) {
        return <div className="p-8">Checking permissions...</div>;
    }

    // Check if user is authenticated
    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    // Check if user has admin role
    if (user?.role?.toLowerCase() !== UserRole.ADMIN) {
        return <Navigate to="/unauthorized" replace />;
    }

    return <Outlet />;
};

export default AdminProtectedRoute;
