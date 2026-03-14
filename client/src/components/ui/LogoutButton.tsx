// Logout button that clears storage and redirects to home
import React from 'react';
import { LogOut } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const LogoutButton: React.FC = () => {
  const { t } = useTranslation();

  const handleLogout = () => {
    console.log('🚪 Logout initiated');

    // Clear ALL storage
    localStorage.clear();
    sessionStorage.clear();

    console.log('All storage cleared');

    // Redirect to home
    window.location.href = '/';
  };

  return (
    <button
      onClick={handleLogout}
      className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
    >
      <LogOut className="h-4 w-4" />
      <span>{t('ui.logout')}</span>
    </button>
  );
};

export default LogoutButton;