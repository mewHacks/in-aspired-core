// Main navigation bar with responsive mobile menu and auth state awareness
import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, X, Home, Info, Brain, BookOpen, Briefcase, Monitor, Settings, HelpCircle, LogOut, LayoutDashboard, Mail } from 'lucide-react';
import { Button } from '../ui/Button';
import ProfileDropdown from '../ui/ProfileDropdown';
import NotificationBell from '../ui/NotificationBell';
import LoadingScreen from '../ui/LoadingScreen';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { useTranslation } from 'react-i18next';
import { useConfirm } from '../../contexts/ConfirmContext';

const Navbar: React.FC = () => {

    const [isOpen, setIsOpen] = useState(false); // Mobile menu
    const [hubDropdownOpen, setHubDropdownOpen] = useState(false); // Desktop dropdown

    // Auth state (SINGLE source of truth)
    const { isAuthenticated, user, logout, isLoading } = useAuth();
    const toast = useToast();
    const navigate = useNavigate();
    const { t } = useTranslation();
    const { confirm: confirmAction } = useConfirm();

    // Direct user to loading screen if loading
    if (isLoading) return <LoadingScreen />;

    const handleLogout = () => {
        logout(); // clear auth context + token
        setIsOpen(false); // close mobile menu if open
        toast.info(t('nav.logoutSuccess')); // show toast message
        navigate('/'); // redirect home
    };

    // Better Wrapper for Links
    const ProtectedLink = ({ to, children, className, onClick }: any) => (
        <Link
            to={to}
            className={className}
            onClick={async (e) => {
                if (!isAuthenticated) {
                    e.preventDefault();
                    const confirmed = await confirmAction({
                        title: t('common.confirm'),
                        message: t('nav.joinPrompt'),
                        confirmLabel: t('nav.signup'),
                        variant: 'info'
                    });

                    if (confirmed) {
                        navigate('/signup');
                        setIsOpen(false); // Close mobile menu if open
                    }
                } else {
                    if (onClick) onClick(e);
                }
            }}
        >
            {children}
        </Link>
    );

    // Helper for Icon-Only Navigation (Mid-size screens)
    const IconNav = ({ to, icon: Icon, label, protectedLink }: any) => {
        const LinkComponent = protectedLink ? ProtectedLink : Link;
        return (
            <div className="relative group">
                <LinkComponent 
                    to={to} 
                    className="p-2 text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all block"
                >
                    <Icon size={22} />
                </LinkComponent>
                <span className="absolute left-1/2 -translate-x-1/2 top-full mt-2 px-2 py-1 bg-gray-900 dark:bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                    {label}
                </span>
            </div>
        );
    };

    return ReactDOM.createPortal(
        <nav className="fixed w-full z-50 transition-all duration-300 bg-white/80 dark:bg-gray-950/90 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-800/50 top-0 left-0">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16 items-center">
                    
                    {/* Logo Section */}
                    <Link to="/" className="flex-shrink-0 flex items-center gap-2 group">
                        <img 
                            src="/assets/icons/logo_light.svg" 
                            alt="Logo" 
                            className="h-8 w-8 transition-transform group-hover:rotate-12 dark:hidden" 
                        />
                        <img 
                            src="/assets/icons/logo_dark.svg" 
                            alt="Logo" 
                            className="h-8 w-8 transition-transform group-hover:rotate-12 hidden dark:block" 
                        />
                        <span className="font-display text-2xl font-bold text-gray-900 dark:text-white tracking-tight group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                            In-Aspired
                        </span>
                    </Link>

                    {/* Desktop Navigation (XL screens) */}
                    <div className="hidden xl:flex items-center space-x-6">
                        <Link to="/" className="text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 transition-colors font-medium">
                            {t('nav.home')}
                        </Link>
                        <Link to="/about" className="text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 transition-colors font-medium">
                            {t('nav.about')}
                        </Link>
                        <ProtectedLink to="/personality-test" className="text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 transition-colors font-medium">
                            {t('nav.personalityTest')}
                        </ProtectedLink>

                        {/* Infographic Hub Dropdown */}
                        <div
                            className="relative group"
                            onMouseEnter={() => setHubDropdownOpen(true)}
                            onMouseLeave={() => setHubDropdownOpen(false)}
                        >
                            <button className="flex items-center text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 transition-colors font-medium focus:outline-none">
                                {t('nav.infographicHub')}
                                <svg className={`w-4 h-4 ml-1 transition-transform ${hubDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                                </svg>
                            </button>
                            
                            <div className={`absolute left-0 pt-4 w-48 transition-all duration-200 origin-top transform ${hubDropdownOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 -translate-y-2 pointer-events-none'}`}>
                                <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                                    <ProtectedLink to="/courses" className="block px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-primary-50 dark:hover:bg-primary-900/50 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
                                        {t('nav.courses')}
                                    </ProtectedLink>
                                    <ProtectedLink to="/careers" className="block px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-primary-50 dark:hover:bg-primary-900/50 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
                                        {t('nav.careers')}
                                    </ProtectedLink>
                                </div>
                            </div>
                        </div>

                        <ProtectedLink to="/rooms" className="text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 transition-colors font-medium">
                            {t('nav.virtualStudyRooms')}
                        </ProtectedLink>

                        {/* Auth Section */}
                        <div className="flex items-center gap-3 ml-2">
                            {isAuthenticated && user ? (
                                <>
                                    <NotificationBell />
                                    <ProfileDropdown
                                        userName={user.name}
                                        userEmail={user.email}
                                        userAvatar={user.avatar}
                                        onLogout={handleLogout}
                                    />
                                </>
                            ) : (
                                <>
                                    <Link to="/login" className="text-gray-900 dark:text-white font-semibold hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
                                        {t('nav.login')}
                                    </Link>
                                    <Link to="/signup">
                                        <Button variant="primary" size="md">{t('nav.signup')}</Button>
                                    </Link>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Tablet/Laptop Navigation (MD to XL - Icons Only) */}
                    <div className="hidden md:flex xl:hidden flex-1 items-center justify-around max-w-4xl mx-auto px-4">
                        <IconNav to="/" icon={Home} label={t('nav.home')} />
                        <IconNav to="/about" icon={Info} label={t('nav.about')} />
                        <IconNav to="/personality-test" icon={Brain} label={t('nav.personalityTest')} protectedLink />
                        {/* Hub Icons with protected links */}
                        <IconNav to="/courses" icon={BookOpen} label={t('nav.courses')} protectedLink />
                        <IconNav to="/careers" icon={Briefcase} label={t('nav.careers')} protectedLink />
                        <IconNav to="/rooms" icon={Monitor} label={t('nav.virtualStudyRooms')} protectedLink />

                        <div className="pl-2 border-l border-gray-300 dark:border-gray-700 ml-2 flex items-center gap-2">
                            {isAuthenticated && user ? (
                                <>
                                    {/* Notification Bell */}
                                    <NotificationBell />
                                    {/* Profile Dropdown */}
                                    <ProfileDropdown
                                        userName={user.name}
                                        userEmail={user.email}
                                        userAvatar={user.avatar}
                                        onLogout={handleLogout}
                                    />
                                </>
                            ) : (
                                <Link to="/login">
                                    <Button variant="primary" size="sm">{t('nav.login')}</Button>
                                </Link>
                            )}
                        </div>
                    </div>

                    {/* Mobile Menu Button */}
                    <div className="md:hidden">
                        <button 
                            onClick={() => setIsOpen(!isOpen)} 
                            className="text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                        >
                            {isOpen ? <X /> : <Menu />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Menu */}
            {isOpen && (
                <div className="md:hidden bg-white dark:bg-gray-950 border-t border-gray-200 dark:border-gray-800 h-[calc(100vh-4rem)] overflow-y-auto">
                    <div className="px-4 py-4 space-y-4">

                        {/* Main Navigation Links */}
                        <div className="space-y-1">
                            <Link 
                                to="/" 
                                onClick={() => setIsOpen(false)} 
                                className="flex items-center gap-3 px-3 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-primary-600 dark:hover:text-primary-400 rounded-lg transition-colors"
                            >
                                <Home size={20} />
                                <span className="font-medium">{t('nav.home')}</span>
                            </Link>
                            <Link 
                                to="/about" 
                                onClick={() => setIsOpen(false)} 
                                className="flex items-center gap-3 px-3 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-primary-600 dark:hover:text-primary-400 rounded-lg transition-colors"
                            >
                                <Info size={20} />
                                <span className="font-medium">{t('nav.about')}</span>
                            </Link>
                            <ProtectedLink 
                                to="/personality-test" 
                                onClick={() => setIsOpen(false)} 
                                className="flex items-center gap-3 px-3 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-primary-600 dark:hover:text-primary-400 rounded-lg transition-colors"
                            >
                                <Brain size={20} />
                                <span className="font-medium">{t('nav.personalityTest')}</span>
                            </ProtectedLink>
                        </div>

                        <hr className="border-gray-200 dark:border-gray-800" />

                        {/* Infographic Hub Section */}
                        <div className="space-y-1">
                            <div className="px-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                                {t('nav.infographicHub')}
                            </div>
                            <ProtectedLink 
                                to="/courses" 
                                onClick={() => setIsOpen(false)} 
                                className="flex items-center gap-3 px-3 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-primary-600 dark:hover:text-primary-400 rounded-lg transition-colors"
                            >
                                <BookOpen size={20} />
                                <span className="font-medium">{t('nav.courses')}</span>
                            </ProtectedLink>
                            <ProtectedLink 
                                to="/careers" 
                                onClick={() => setIsOpen(false)} 
                                className="flex items-center gap-3 px-3 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-primary-600 dark:hover:text-primary-400 rounded-lg transition-colors"
                            >
                                <Briefcase size={20} />
                                <span className="font-medium">{t('nav.careers')}</span>
                            </ProtectedLink>
                        </div>

                        <hr className="border-gray-200 dark:border-gray-800" />

                        {/* Virtual Study Rooms */}
                        <div className="space-y-1">
                            <ProtectedLink 
                                to="/rooms" 
                                onClick={() => setIsOpen(false)} 
                                className="flex items-center gap-3 px-3 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-primary-600 dark:hover:text-primary-400 rounded-lg transition-colors"
                            >
                                <Monitor size={20} />
                                <span className="font-medium">{t('nav.virtualStudyRooms')}</span>
                            </ProtectedLink>
                        </div>

                        <hr className="border-gray-200 dark:border-gray-800" />

                        {/* Auth Section Mobile */}
                        {isAuthenticated && user ? (
                            <div className="space-y-1">
                                {/* User Profile Card */}
                                <div className="px-3 py-2 flex items-center gap-3 mb-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                    <div className="h-8 w-8 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center text-primary-700 dark:text-primary-300 font-bold overflow-hidden">
                                        {user.avatar ? (
                                            <img src={user.avatar} alt="Profile" className="w-full h-full object-cover" />
                                        ) : (
                                            user.name.charAt(0).toUpperCase()
                                        )}
                                    </div>
                                    <div className="overflow-hidden">
                                        <div className="font-semibold text-sm truncate text-gray-900 dark:text-white">{user.name}</div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.email}</div>
                                    </div>
                                </div>

                                <Link 
                                    to="/dashboard" 
                                    onClick={() => setIsOpen(false)} 
                                    className="flex items-center gap-3 px-3 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-primary-600 dark:hover:text-primary-400 rounded-lg transition-colors"
                                >
                                    <LayoutDashboard size={20} />
                                    <span className="font-medium">{t('nav.dashboard')}</span>
                                </Link>

                                <Link 
                                    to="/settings" 
                                    onClick={() => setIsOpen(false)} 
                                    className="flex items-center gap-3 px-3 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-primary-600 dark:hover:text-primary-400 rounded-lg transition-colors"
                                >
                                    <Settings size={20} />
                                    <span className="font-medium">{t('nav.settings')}</span>
                                </Link>

                                <Link 
                                    to="/help" 
                                    onClick={() => setIsOpen(false)} 
                                    className="flex items-center gap-3 px-3 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-primary-600 dark:hover:text-primary-400 rounded-lg transition-colors"
                                >
                                    <HelpCircle size={20} />
                                    <span className="font-medium">{t('nav.help')}</span>
                                </Link>

                                <Link 
                                    to="/contact" 
                                    onClick={() => setIsOpen(false)} 
                                    className="flex items-center gap-3 px-3 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-primary-600 dark:hover:text-primary-400 rounded-lg transition-colors"
                                >
                                    <Mail size={20} />
                                    <span className="font-medium">{t('nav.contact')}</span>
                                </Link>

                                <button
                                    onClick={handleLogout}
                                    className="w-full flex items-center gap-3 px-3 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors"
                                >
                                    <LogOut size={20} />
                                    <span className="font-medium">{t('nav.logout')}</span>
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-3 pt-2">
                                <Link to="/login" onClick={() => setIsOpen(false)} className="block w-full">
                                    <Button variant="outline" className="w-full justify-center dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800">{t('nav.login')}</Button>
                                </Link>
                                <Link to="/signup" onClick={() => setIsOpen(false)} className="block w-full">
                                    <Button variant="primary" className="w-full justify-center">{t('nav.signup')}</Button>
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </nav>,
        document.body
    );
};

export default Navbar;