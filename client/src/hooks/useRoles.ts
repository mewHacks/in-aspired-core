// Custom hook for role-based access control — provides isAdmin, isStudent, etc.
import { useAuth } from "../contexts/AuthContext";
import { UserRole } from "@in-aspired/shared";

export const useRoles = () => {
  const { user } = useAuth();
  
  // Convert to string and lowercase for comparison
  const roleString = user?.role?.toString().toLowerCase();
  const isAdmin = roleString === 'admin' || roleString === UserRole.ADMIN;
  const isStudent = roleString === 'student' || roleString === UserRole.STUDENT;
  
  return {
    isAdmin,
    isStudent,
    currentRole: user?.role,
    hasRole: (roleToCheck: string) => roleString === roleToCheck.toLowerCase(),
    hasAnyRole: (roles: string[]) => {
      if (!roleString) return false;
      return roles.some(r => roleString === r.toLowerCase());
    },
    canEditCourses: isAdmin,
    canDeleteCourses: isAdmin,
    canManageUsers: isAdmin,
    canViewAnalytics: isAdmin,
    user: user,
  };
};