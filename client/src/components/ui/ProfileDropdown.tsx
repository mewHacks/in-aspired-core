// User profile dropdown menu with navigation links and logout
import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Settings, HelpCircle, Mail, LogOut, ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ProfileDropdownProps {
  userName: string;
  userEmail: string;
  userAvatar?: string; // Optional profile picture URL or base64
  onLogout: () => void;
}

const ProfileDropdown: React.FC<ProfileDropdownProps> = ({ userName, userEmail, userAvatar, onLogout }) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Logout handler using parent AuthContext
  const handleLogout = (e: React.MouseEvent) => {
    e.stopPropagation();

    onLogout(); // Clears auth context & token
    setIsOpen(false); // Close dropdown
    navigate('/'); // Redirect to home
  };

  // Close dropdown if clicked outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors group"
        aria-label={t('nav.profileMenu', 'Profile menu')}
        aria-expanded={isOpen}
      >
        <div className="w-8 h-8 rounded-full overflow-hidden bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center text-white font-semibold">
          {userAvatar ? (
            <img src={userAvatar} alt={t('nav.profile', 'Profile')} className="w-full h-full object-cover" />
          ) : (
            userName.charAt(0).toUpperCase()
          )}
        </div>
        <div className="hidden md:block text-left">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{userName}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[120px]">{userEmail}</p>
        </div>
        <ChevronDown className={`h-4 w-4 text-gray-500 dark:text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 py-2 z-50 animate-fade-in">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
            <p className="font-medium text-gray-900 dark:text-gray-100">{userName}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{userEmail}</p>
          </div>

          <div className="py-1">
            {/* Dashboard */}
            <Link
              to="/dashboard"
              className="flex items-center gap-3 px-4 py-2.5 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              onClick={() => setIsOpen(false)}
            >
              <LayoutDashboard className="h-4 w-4" />
              <span>{t('nav.dashboard', 'Dashboard')}</span>
            </Link>

            <Link
              to="/settings"
              className="flex items-center gap-3 px-4 py-2.5 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              onClick={() => setIsOpen(false)}
            >
              <Settings className="h-4 w-4" />
              <span>{t('nav.settings', 'Settings')}</span>
            </Link>

            {/* Help */}
            <Link
              to="/help"
              className="flex items-center gap-3 px-4 py-2.5 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              onClick={() => setIsOpen(false)}
            >
              <HelpCircle className="h-4 w-4" />
              <span>{t('nav.help', 'Help')}</span>
            </Link>

            {/* Contact item */}
            <Link
              to="/contact"
              className="flex items-center gap-3 px-4 py-2.5 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              onClick={() => setIsOpen(false)}
            >
              <Mail className="h-4 w-4" />
              <span>{t('nav.contact', 'Contact')}</span>
            </Link>
          </div>

          <div className="border-t border-gray-100 dark:border-gray-800 pt-1">
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 w-full px-4 py-2.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              <span>{t('nav.logout', 'Log Out')}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileDropdown;