import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bookmark, Archive, BarChart3, ChevronRight, BookOpen, Briefcase,
  FileText, Shield, Activity, Sparkles, ArrowUpRight,
  Users, UserCheck, UserX, UserPlus, Flag 
} from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import { useSavedCareers } from '@/contexts/SavedCareersContext';
import { useSavedCourses } from '@/contexts/SavedCoursesContext';
import { useRoles } from '@/hooks/useRoles';
import { httpClient } from '@/services/httpClient';
import { Career, Course } from '@/types';
import { useTranslation } from 'react-i18next';

// TYPE DEFINITIONS
interface UserStats {
  totalUsers: number;
  activeUsers: number;
  suspendedUsers: number;
  newToday: number;
  lastUpdated: string;
}

// Interface for resource report stats
interface ResourceStats {
  totalReported: number;
  hidden: number;
  active: number;
}

const DashboardPage: React.FC = () => {
  const { t } = useTranslation(); // Translation hook for internationalization
  const navigate = useNavigate();
  const { isAdmin } = useRoles(); // Check if user has admin role
  const [hoveredCard, setHoveredCard] = useState<number | null>(null); // Track which card is currently hovered for effects
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 }); // Track mouse position for parallax effect on cards

  // SAVED ITEMS (from context providers) 
  // Gets the user's saved careers and courses counts from context providers
  // These counts are displayed in the "Saved Vault" card
  const { savedIds: savedCareerIds } = useSavedCareers();
  const { savedIds: savedCourseIds } = useSavedCourses();

  // Calculate total saved items by summing careers and courses
  const savedCareersCount = savedCareerIds.size;
  const savedCoursesCount = savedCourseIds.size;
  const totalSaved = savedCareersCount + savedCoursesCount;

  // ARCHIVED DATA STATE
  // Tracks items that have been archived (soft-deleted) by admin
  // This includes both courses and careers that are no longer active but not permanently deleted
  const [archivedCount, setArchivedCount] = useState<number>(0); // Total count of archived items (courses + careers)
  const [archivedCourses, setArchivedCourses] = useState<Course[]>([]); // State to hold archived courses data
  const [archivedCareers, setArchivedCareers] = useState<Career[]>([]); // State to hold archived careers data
  const [dashboardLastUpdated, setDashboardLastUpdated] = useState<string>(t('core.dashboard.justNow')); // Timestamp for last dashboard refresh, shown in header
  const [isLoadingArchived, setIsLoadingArchived] = useState<boolean>(true); // Loading state for archived data, used to show loading text in badge before data loads

  // USER STATS STATE
  // Tracks user metrics: total, active, suspended, and new registrations today
  // These stats are displayed in the "User Monitoring" card
  const [userStats, setUserStats] = useState<UserStats>({
    totalUsers: 0,
    activeUsers: 0,
    suspendedUsers: 0,
    newToday: 0,
    lastUpdated: t('core.dashboard.loading')
  });
  const [isLoadingUsers, setIsLoadingUsers] = useState<boolean>(true);

  // FEEDBACK STATS STATE
  // Tracks user-submitted feedback: total, pending, resolved
  // These stats are displayed in the "Reports Center" card to give admin an overview of feedback volume and status
  const [feedbackStats, setFeedbackStats] = useState({ // Initialize with 0 to avoid not a number (NaN) issues before data loads
    total: 0,
    pending: 0,
    resolved: 0
  });
  const [isLoadingFeedback, setIsLoadingFeedback] = useState<boolean>(true);

  // RESOURCE REPORT STATS STATE
  // Tracks resources that have been reported as inappropriate
  // totalReported = all resources with at least 1 report
  // hidden = auto-hidden after 2+ reports
  // active = only 1 report, still visible
  // These stats are displayed in the "Reports Center" card to give admin an overview of resource report volume and status
  const [resourceStats, setResourceStats] = useState<ResourceStats>({ // Initialize with 0 to avoid not a number (NaN) issues before data loads
    totalReported: 0,
    hidden: 0,
    active: 0
  });
  const [isLoadingResources, setIsLoadingResources] = useState<boolean>(true);

  // HELPER: formatLastUpdated
  // Converts timestamps to human-readable relative time
  // This is used for the "Last Updated" timestamps on the dashboard and in user stats
  const formatLastUpdated = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return t('core.dashboard.justNow'); // "Just now"
    if (diffMins < 60) return t('core.dashboard.minutesAgo', { count: diffMins }); // "5m ago"

    const diffHours = Math.floor(diffMins / 60); // Calculate hours difference
    if (diffHours < 24) return t('core.dashboard.hoursAgo', { count: diffHours }); // "3h ago"

    const diffDays = Math.floor(diffHours / 24); // Calculate days difference
    if (diffDays === 1) return t('core.dashboard.yesterday'); // "Yesterday"
    if (diffDays < 7) return `${diffDays}d ago`; // "2d ago"

    return date.toLocaleDateString('en-US', { // "Jan 15" format
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // REDIRECT NON-ADMIN USERS
  // If user is not an admin, send them to the saved page instead
  // This prevents unauthorized access to the dashboard and ensures only admins can see it
  useEffect(() => {
    if (!isAdmin) {
      navigate('/saved');
    }
  }, [isAdmin, navigate]);

  // FETCH ARCHIVED DATA
  // Loads both archived courses and careers in parallel
  // This data is used to populate the "Archived Vault" card with the total count of archived items
  useEffect(() => {
    if (!isAdmin) return;

    const fetchArchivedData = async () => {
      try {
        // Set loading state to true while fetching archived data
        setIsLoadingArchived(true);
        const [coursesRes, careersRes] = await Promise.all([ // Fetch archived courses and careers in parallel
          httpClient('/api/courses/archived'),
          httpClient('/api/careers/archived')
        ]);

        // Only update state if both requests succeed
        if (coursesRes.ok && careersRes.ok) {
          const coursesData = await coursesRes.json();
          const careersData = await careersRes.json();

          // Update state with archived items and total count
          setArchivedCourses(coursesData);
          setArchivedCareers(careersData);
          const totalArchived = coursesData.length + careersData.length; // Total archived items is the sum of archived courses and careers
          setArchivedCount(totalArchived);

          // Store last update time in localStorage for future reference
          const now = new Date();
          localStorage.setItem('archivedPageLastUpdate', now.toISOString());
        }
      } catch (err) {
        console.error('Failed to fetch archived data:', err);
        setArchivedCount(0);
      } finally {
        setIsLoadingArchived(false); // Set loading state to false after attempt to fetch archived data, regardless of success or failure, to update the badge text accordingly
      }
    };

    fetchArchivedData();

    return () => { };
  }, [isAdmin]); // This effect runs once on mount and whenever isAdmin changes, but since non-admins are redirected away, it effectively runs only for admins when they access the dashboard

  // DASHBOARD REFRESH TIMER
  // Updates the "last updated" timestamp every minute
  useEffect(() => {
    setDashboardLastUpdated(formatLastUpdated(new Date())); // Set initial last updated time on mount 

    const interval = setInterval(() => {
      setDashboardLastUpdated(formatLastUpdated(new Date())); // Update last updated time every minute to keep it current
    }, 60 * 1000); // Update every minute

    return () => clearInterval(interval); // Clean up interval on unmount
  }, []);

  // FETCH USER STATS
  // Loads user metrics from the admin API
  // Refreshes every 2 minutes to keep data current
  useEffect(() => {
    if (!isAdmin) return;

    const fetchUserStats = async () => {
      try {
        setIsLoadingUsers(true);
        const res = await httpClient('/api/admin/users/stats', { // Admin API endpoint for user stats
          credentials: 'include' // Include credentials to ensure we get the correct data for the logged-in admin user
        });

        if (res.ok) {
          const data = await res.json(); // Expected data: { totalUsers, activeUsers, suspendedUsers, newToday }
          setUserStats({
            totalUsers: data.totalUsers || 0,
            activeUsers: data.activeUsers || 0,
            suspendedUsers: data.suspendedUsers || 0,
            newToday: data.newToday || 0,
            lastUpdated: formatLastUpdated(new Date())
          });
        }
      } catch (err) {
        console.error('Failed to fetch user stats:', err);
      } finally {
        setIsLoadingUsers(false);
      }
    };

    fetchUserStats();

    // Refresh every 2 minutes
    const interval = setInterval(fetchUserStats, 120000);
    return () => clearInterval(interval);
  }, [isAdmin]);

  // FETCH FEEDBACK STATS
  // Loads feedback submission metrics from the admin API
  useEffect(() => {
    if (!isAdmin) return;

    const fetchFeedbackStats = async () => {
      try {
        setIsLoadingFeedback(true);
        const res = await httpClient('/api/feedback/admin/stats', { // Admin API endpoint for feedback stats
          credentials: 'include' // Include credentials to ensure we get the correct data for the logged-in admin user
        });

        if (res.ok) {
          const data = await res.json(); 
          setFeedbackStats({ 
            total: data.total || 0,
            pending: data.pending || 0,
            resolved: data.resolved || 0
          });
        }
      } catch (err) {
        console.error('Failed to fetch feedback stats:', err);
      } finally {
        setIsLoadingFeedback(false);
      }
    };

    fetchFeedbackStats();

    // Refresh every 2 minutes
    const interval = setInterval(fetchFeedbackStats, 120000);
    return () => clearInterval(interval);
  }, [isAdmin]);

  // FETCH RESOURCE REPORT STATS
  // Loads metrics about reported resources from the admin API
  // Using the same endpoint that works in the ReportCenterPage
  // totalReported = all resources with at least 1 report
  useEffect(() => {
    if (!isAdmin) return;

    const fetchResourceStats = async () => {
      try {
        setIsLoadingResources(true);
        const res = await httpClient('/api/resources/admin/reported', { // Admin API endpoint for reported resources
          credentials: 'include'
        });

        if (res.ok) {
          const data = await res.json();
          
          // The API returns an array of reported resources in data.data
          // We need to count them to get totalReported
          const reportedResources = data.data || [];
          const totalReported = reportedResources.length;
          
          // Count how many are hidden vs active
          const hidden = reportedResources.filter((r: any) => r.status === 'hidden').length;
          const active = reportedResources.filter((r: any) => r.status === 'active').length;
          
          setResourceStats({
            totalReported: totalReported,
            hidden: hidden,
            active: active
          });
          
          console.log('Resource stats loaded:', { totalReported, hidden, active }); // Debug log
        } else {
          console.error('Failed to fetch resource stats, status:', res.status);
          setResourceStats({
            totalReported: 0,
            hidden: 0,
            active: 0
          });
        }
      } catch (err) {
        console.error('Failed to fetch resource report stats:', err);
        setResourceStats({
          totalReported: 0,
          hidden: 0,
          active: 0
        });
      } finally {
        setIsLoadingResources(false);
      }
    };

    fetchResourceStats();

    // Refresh every 2 minutes
    const interval = setInterval(fetchResourceStats, 120000);
    return () => clearInterval(interval);
  }, [isAdmin]);

  // ADMIN CHECK
  // Don't render anything if user isn't an admin
  // This is a safeguard in case the useRoles hook or redirect logic fails for some reason
  // The useEffect at the top should redirect non-admins away, 
  // but this ensures that even if they somehow access this page, they won't see any content
  if (!isAdmin) return null;

  // CALCULATE COMBINED TOTAL
  // Combined total of both feedback and resource reports
  // This will be used for the main count and badge
  // This gives admins a quick overview of the total volume of reports they need to review in the Report Center
  const combinedTotal = feedbackStats.total + resourceStats.totalReported;

  // DASHBOARD CARDS CONFIGURATION
  // Array of card configurations for the dashboard
  // Each card has properties for title, description, icon, count, colors, route, badge text, and whether to show shimmer effect
  // This configuration drives the rendering of the cards in the dashboard and allows for easy updates to card content and styling
  const dashboardCards = [
    { 
      title: t('core.dashboard.savedVault.title'),
      description: t('core.dashboard.savedVault.desc'),
      icon: Bookmark,
      count: totalSaved,
      subCounts: {
        courses: savedCoursesCount,
        careers: savedCareersCount
      },
      color: "amber",
      route: '/saved',
      gradient: 'from-amber-500 via-amber-400 to-orange-400',
      accentColor: 'amber',
      badge: t('core.dashboard.savedVault.badge', { count: savedCoursesCount }),
      shimmer: true
    },
    {
      title: t('core.dashboard.archivedVault.title'),
      description: t('core.dashboard.archivedVault.desc'),
      icon: Archive,
      count: archivedCount,
      color: "stone",
      route: '/admin/archived',
      gradient: 'from-stone-500 via-stone-400 to-gray-400',
      accentColor: 'stone',
      badge: isLoadingArchived ? t('core.dashboard.loading') : t('core.dashboard.archivedVault.badge', { count: archivedCount }),
      shimmer: false
    },
    {
      title: t('core.dashboard.userMonitoring.title'),
      description: t('core.dashboard.userMonitoring.desc'),
      icon: Users,
      count: userStats.totalUsers,
      color: "violet",
      route: '/admin/monitoring',
      gradient: 'from-violet-500 via-violet-400 to-purple-400',
      accentColor: 'violet',
      badge: isLoadingUsers ? t('core.dashboard.loading') : t('core.dashboard.userMonitoring.badge', { count: userStats.activeUsers }),
      subStats: {
        active: userStats.activeUsers,
        suspended: userStats.suspendedUsers,
        newToday: userStats.newToday
      },
      shimmer: true
    },
    {
      title: t('core.dashboard.reportsCenter.title'),
      description: t('core.dashboard.reportsCenter.desc'),
      icon: BarChart3,
      // Main count now shows combined total of feedback + resources
      count: combinedTotal,
      color: "red",
      route: '/admin/reports',
      gradient: 'from-red-500 via-red-400 to-rose-400',
      accentColor: 'red',
      // FIXED: Badge now shows combined total
      badge: isLoadingFeedback || isLoadingResources 
        ? t('core.dashboard.loading') 
        : `${combinedTotal} total reports`,
      // Stats for the two numbers below
      reportStats: {
        feedback: feedbackStats.total,
        resources: resourceStats.totalReported
      },
      shimmer: false
    }
  ];

  // MOUSE MOVE HANDLER
  // Creates parallax effect on hover for desktop
  // Calculates mouse position relative to card center and updates state
  const handleMouseMove = (e: React.MouseEvent, index: number) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 20;
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * 20;
    setMousePosition({ x, y });
    setHoveredCard(index);
  };

  // GLASS CARD STYLING
  // Returns CSS classes for the premium glassmorphism effect
  // Applies different hover effects based on whether the card is active (has data) or not
  const getGlassCardClasses = (isActive: boolean) => {
    const base = 'relative overflow-hidden transition-all duration-500 ease-out will-change-transform group';
    const glass = `bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl 
                   border border-white/90 dark:border-gray-800/90 shadow-xl shadow-gray-200/50 dark:shadow-gray-900/50
                   hover:shadow-2xl hover:shadow-gray-300/70 dark:hover:shadow-gray-800/70`;

    const hover = isActive ?
      'scale-[1.03] translate-y-[-8px] shadow-2xl shadow-gray-300/70 dark:shadow-gray-800/70' :
      'hover:scale-[1.03] hover:translate-y-[-8px]';

    return `${base} ${glass} ${hover}`;
  };

  // CARD GRADIENT
  // Returns gradient background based on card color
  // This is used to create the subtle gradient backgrounds for each card that match their accent color
  const getCardGradient = (color: string) => {
    const gradients = {
      amber: 'bg-gradient-to-br from-amber-500/10 via-amber-400/5 to-orange-400/5 dark:from-amber-500/20 dark:via-amber-400/10 dark:to-orange-400/10',
      stone: 'bg-gradient-to-br from-stone-500/10 via-stone-400/5 to-gray-600/5 dark:from-stone-500/20 dark:via-stone-400/10 dark:to-gray-600/10',
      violet: 'bg-gradient-to-br from-violet-500/10 via-violet-400/5 to-purple-400/5 dark:from-violet-500/20 dark:via-violet-400/10 dark:to-purple-400/10',
      red: 'bg-gradient-to-br from-red-500/10 via-red-400/5 to-rose-400/5 dark:from-red-500/20 dark:via-red-400/10 dark:to-rose-400/10'
    };
    return gradients[color as keyof typeof gradients] || gradients.amber;
  };

  // SHIMMER EFFECT COMPONENT
  // Animated shine that runs across cards on hover
  // This is a purely visual effect to enhance the premium feel of the dashboard
  const ShimmerEffect = ({ color }: { color: string }) => (
    <div className="absolute inset-0 overflow-hidden">
      <div className={`absolute -inset-[100%] animate-shimmer bg-gradient-to-r 
        from-transparent via-white/30 dark:via-white/10 to-transparent ${
          color === 'amber' ? 'via-amber-100/40 dark:via-amber-500/20' :
          color === 'stone' ? 'via-stone-100/40 dark:via-stone-500/20' :
          color === 'violet' ? 'via-violet-100/40 dark:via-violet-500/20' : 
          'via-red-100/40 dark:via-red-500/20'
        }`} />
    </div>
  );

  // PARTICLE EFFECT COMPONENT
  // Floating dots that appear when card is hovered
  // Adds a dynamic, lively feel to the dashboard when hovering over active cards
  const ParticleEffect = ({ color, isActive }: { color: string, isActive: boolean }) => {
    if (!isActive) return null;

    const particleColors = {
      amber: 'bg-amber-400 dark:bg-amber-500',
      stone: 'bg-stone-400 dark:bg-stone-500',
      violet: 'bg-violet-400 dark:bg-violet-500',
      red: 'bg-red-400 dark:bg-red-500'
    };

    const colorClass = particleColors[color as keyof typeof particleColors] || particleColors.amber;

    return (
      <>
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className={`absolute w-1 h-1 ${colorClass} rounded-full animate-float`}
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${i * 0.2}s`,
              opacity: 0.6
            }}
          />
        ))}
      </>
    );
  };

  // RENDER
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-72 h-72 bg-amber-200/20 dark:bg-amber-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-violet-200/20 dark:bg-violet-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10">
        <Navbar />

        {/* Main content container */}
        <div className="pt-20 sm:pt-24 px-3 sm:px-6 lg:px-8 max-w-7xl mx-auto">

          {/* HEADER SECTION */}
          <div className="mb-8 sm:mb-12 p-5 sm:p-8 rounded-2xl sm:rounded-3xl bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl 
                        border border-white/90 dark:border-gray-800/90 shadow-xl shadow-gray-200/50 dark:shadow-gray-900/50">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start sm:items-center">
                <div className="p-2.5 sm:p-3 rounded-xl bg-gradient-to-br from-violet-500/10 to-purple-400/5 dark:from-violet-500/20 dark:to-purple-400/10 
                             border border-violet-200 dark:border-violet-800 mr-3 sm:mr-4 flex-shrink-0">
                  <Shield className="w-6 h-6 sm:w-8 sm:h-8 text-violet-600 dark:text-violet-400" />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white">
                    {t('core.dashboard.title')}
                  </h1>
                  <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1">
                    {t('core.dashboard.subtitle')}
                  </p>
                </div>
              </div>

              {/* Last refresh time - desktop */}
              <div className="hidden md:block">
                <div className="text-right">
                  <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center justify-end">
                    <Sparkles className="w-4 h-4 mr-2 text-violet-500 dark:text-violet-400" />
                    {t('core.dashboard.lastRefresh')}
                  </p>
                  <p className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                    {dashboardLastUpdated}
                  </p>
                </div>
              </div>
            </div>

            {/* Last refresh time - mobile only */}
            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 md:hidden">
              <div className="flex items-center justify-between">
                <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                  <Sparkles className="w-4 h-4 mr-2 text-violet-500 dark:text-violet-400" />
                  {t('core.dashboard.lastRefreshMobile')}
                </div>
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                  {dashboardLastUpdated}
                </p>
              </div>
            </div>
          </div>

          {/* MAIN DASHBOARD CARDS GRID */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 mb-12 sm:mb-16">
            {dashboardCards.map((card, index) => {
              const Icon = card.icon;
              const isActive = hoveredCard === index;

              return (
                <div
                  key={index}
                  className={`relative rounded-2xl sm:rounded-3xl ${getGlassCardClasses(isActive)}`}
                  onClick={() => navigate(card.route)}
                  onMouseEnter={() => setHoveredCard(index)}
                  onMouseLeave={() => setHoveredCard(null)}
                  onMouseMove={(e) => handleMouseMove(e, index)}
                  style={{
                    transform: isActive && window.innerWidth > 768
                      ? `perspective(1000px) rotateX(${mousePosition.y * -0.5}deg) rotateY(${mousePosition.x}deg) scale3d(1.03, 1.03, 1.03) translateY(-8px)`
                      : isActive
                        ? 'scale3d(1.02, 1.02, 1.02) translateY(-4px)'
                        : 'perspective(1000px) rotateX(0) rotateY(0) scale3d(1, 1, 1)'
                  }}
                >
                  {/* Animated background gradient */}
                  <div className={`absolute inset-0 rounded-2xl sm:rounded-3xl ${getCardGradient(card.color)} 
                                 opacity-60 group-hover:opacity-80 transition-opacity duration-500`} />

                  {/* Shimmer effect */}
                  {card.shimmer && <ShimmerEffect color={card.accentColor} />}

                  {/* Particle Effect */}
                  {window.innerWidth > 768 && <ParticleEffect color={card.accentColor} isActive={isActive} />}

                  {/* Floating arrow on hover */}
                  {isActive && (
                    <div className="absolute -top-2 -right-2 sm:-top-3 sm:-right-3 p-1.5 sm:p-2 
                                  bg-white dark:bg-gray-800 rounded-full shadow-lg animate-bounce-slow">
                      <ArrowUpRight className="w-4 h-4 sm:w-5 sm:h-5 text-gray-700 dark:text-gray-300" />
                    </div>
                  )}

                  {/* Card content */}
                  <div className="relative p-5 sm:p-6 lg:p-8">
                    {/* Card header: icon + title + chevron */}
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6 sm:mb-8">
                      <div className="flex items-center">
                        <div className={`p-2.5 sm:p-3 lg:p-4 rounded-xl sm:rounded-2xl bg-gradient-to-br 
                          from-${card.accentColor}-500/15 to-${card.accentColor}-400/10 
                          border border-${card.accentColor}-200 dark:border-${card.accentColor}-800 group-hover:border-${card.accentColor}-300 dark:group-hover:border-${card.accentColor}-700
                          mr-3 sm:mr-4 lg:mr-5 transition-all duration-500 ${isActive ? 'scale-110 rotate-6' : 'group-hover:scale-110 group-hover:rotate-3'}`}>
                          <Icon className={`w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 text-${card.accentColor}-600 dark:text-${card.accentColor}-400 
                            ${isActive ? 'animate-pulse' : ''}`} />
                        </div>
                        <div>
                          <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 dark:text-white mb-1 group-hover:text-gray-800 dark:group-hover:text-gray-200">
                            {card.title}
                          </h3>
                          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300">
                            {card.description}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className={`w-5 h-5 text-gray-400 dark:text-gray-500 transition-all duration-500 self-end sm:self-start
                        ${isActive ? 'translate-x-2 sm:translate-x-3 text-gray-600 dark:text-gray-300' : 'group-hover:translate-x-1 sm:group-hover:translate-x-2 group-hover:text-gray-600 dark:group-hover:text-gray-300'}`} />
                    </div>

                    {/* Stats section: main count + sub counts */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-0 
                                  mt-6 sm:mt-8 lg:mt-10 pt-6 sm:pt-8 border-t border-gray-100/50 dark:border-gray-800/50">

                      {/* Main count */}
                      {card.count !== undefined && (
                        <div className="relative">
                          <div className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-2 sm:mb-3 group-hover:text-gray-800 dark:group-hover:text-gray-200">
                            {(isLoadingArchived && card.route === '/admin/archived') ||
                              (isLoadingUsers && card.title === 'User Monitoring') ||
                              (isLoadingFeedback && card.title === t('core.dashboard.reportsCenter.title')) ? (
                              <span className="inline-block w-12 sm:w-16 h-8 sm:h-10 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></span>
                            ) : (
                              <>
                                {card.count}
                                <span className="text-sm sm:text-base lg:text-xl font-normal text-gray-500 dark:text-gray-400 ml-1 sm:ml-2">
                                  {card.title === t('core.dashboard.userMonitoring.title') ? t('core.dashboard.userMonitoring.item_other') :
                                    card.title === t('core.dashboard.reportsCenter.title') ? 'total reports' :
                                    card.count === 1 ? t('core.dashboard.userMonitoring.item_one') : t('core.dashboard.userMonitoring.item_other')}
                                </span>
                              </>
                            )}
                          </div>

                          {/* Status badge */}
                          <span className={`inline-block px-3 sm:px-4 py-1 sm:py-1.5 rounded-full text-xs font-medium 
                            bg-gradient-to-r from-${card.accentColor}-500/10 to-${card.accentColor}-400/5 
                            border border-${card.accentColor}-200 dark:border-${card.accentColor}-800 text-${card.accentColor}-700 dark:text-${card.accentColor}-300
                            group-hover:border-${card.accentColor}-300 dark:group-hover:border-${card.accentColor}-700 group-hover:bg-gradient-to-r 
                            group-hover:from-${card.accentColor}-500/15 group-hover:to-${card.accentColor}-400/10
                            transition-all duration-300 ${isActive ? 'animate-pulse' : ''}`}>
                            {card.badge}
                          </span>
                        </div>
                      )}

                      {/* Sub counts - different for each card type */}
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-start sm:justify-end gap-3 sm:gap-6 lg:gap-8">

                        {/* Saved Vault: courses + careers breakdown */}
                        {card.subCounts && (
                          <>
                            <div className="text-center">
                              <div className="flex items-center justify-center mb-1 sm:mb-2">
                                <BookOpen className={`w-4 h-4 sm:w-5 h-4 sm:h-5 text-${card.accentColor}-500 dark:text-${card.accentColor}-400 mr-1 sm:mr-2 
                                  ${isActive ? 'animate-bounce' : ''}`} />
                                <span className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
                                  {card.subCounts.courses}
                                </span>
                              </div>
                              <span className="text-xs text-gray-500 dark:text-gray-400">{t('core.dashboard.savedVault.courses')}</span>
                            </div>
                            <div className="text-center">
                              <div className="flex items-center justify-center mb-1 sm:mb-2">
                                <Briefcase className={`w-4 h-4 sm:w-5 h-4 sm:h-5 text-${card.accentColor}-500 dark:text-${card.accentColor}-400 mr-1 sm:mr-2 
                                  ${isActive ? 'animate-bounce' : ''}`} />
                                <span className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
                                  {card.subCounts.careers}
                                </span>
                              </div>
                              <span className="text-xs text-gray-500 dark:text-gray-400">{t('core.dashboard.savedVault.careers')}</span>
                            </div>
                          </>
                        )}

                        {/* Archived Vault: archived courses + careers breakdown */}
                        {card.route === '/admin/archived' && (
                          <>
                            <div className="text-center">
                              <div className="flex items-center justify-center mb-1 sm:mb-2">
                                <BookOpen className="w-4 h-4 sm:w-5 h-4 sm:h-5 text-stone-500 dark:text-stone-400 mr-1 sm:mr-2" />
                                <span className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
                                  {archivedCourses.length}
                                </span>
                              </div>
                              <span className="text-xs text-gray-500 dark:text-gray-400">{t('core.dashboard.savedVault.courses')}</span>
                            </div>
                            <div className="text-center">
                              <div className="flex items-center justify-center mb-1 sm:mb-2">
                                <Briefcase className="w-4 h-4 sm:w-5 h-4 sm:h-5 text-stone-500 dark:text-stone-400 mr-1 sm:mr-2" />
                                <span className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
                                  {archivedCareers.length}
                                </span>
                              </div>
                              <span className="text-xs text-gray-500 dark:text-gray-400">{t('core.dashboard.savedVault.careers')}</span>
                            </div>
                          </>
                        )}

                        {/* User Monitoring: active + suspended + new today */}
                        {card.title === t('core.dashboard.userMonitoring.title') && card.subStats && (
                          <>
                            <div className="text-center">
                              <div className="flex items-center justify-center mb-1 sm:mb-2">
                                <UserCheck className="w-4 h-4 sm:w-5 h-4 sm:h-5 text-green-500 dark:text-green-400 mr-1 sm:mr-2" />
                                <span className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
                                  {card.subStats.active}
                                </span>
                              </div>
                              <span className="text-xs text-gray-500 dark:text-gray-400">{t('core.dashboard.userMonitoring.active')}</span>
                            </div>
                            <div className="text-center">
                              <div className="flex items-center justify-center mb-1 sm:mb-2">
                                <UserX className="w-4 h-4 sm:w-5 h-4 sm:h-5 text-red-500 dark:text-red-400 mr-1 sm:mr-2" />
                                <span className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
                                  {card.subStats.suspended}
                                </span>
                              </div>
                              <span className="text-xs text-gray-500 dark:text-gray-400">{t('core.dashboard.userMonitoring.suspended')}</span>
                            </div>
                            <div className="text-center">
                              <div className="flex items-center justify-center mb-1 sm:mb-2">
                                <UserPlus className="w-4 h-4 sm:w-5 h-4 sm:h-5 text-blue-500 dark:text-blue-400 mr-1 sm:mr-2" />
                                <span className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
                                  {card.subStats.newToday}
                                </span>
                              </div>
                              <span className="text-xs text-gray-500 dark:text-gray-400">{t('core.dashboard.userMonitoring.newToday')}</span>
                            </div>
                          </>
                        )}

                        {/* Report Center: total both + feedback + resources */}
                        {card.title === t('core.dashboard.reportsCenter.title') && card.reportStats && (
                          <>
                            {/* Total Feedback stat */}
                            <div className="text-center">
                              <div className="flex items-center justify-center mb-1 sm:mb-2">
                                <FileText className="w-4 h-4 sm:w-5 h-4 sm:h-5 text-yellow-500 dark:text-yellow-400 mr-1 sm:mr-2" />
                                <span className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
                                  {isLoadingFeedback ? (
                                    <span className="inline-block w-8 h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></span>
                                  ) : (
                                    card.reportStats.feedback
                                  )}
                                </span>
                              </div>
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                Total Feedback
                              </span>
                            </div>

                            {/* Total Resource Reports stat */}
                            <div className="text-center">
                              <div className="flex items-center justify-center mb-1 sm:mb-2">
                                <Flag className="w-4 h-4 sm:w-5 h-4 sm:h-5 text-red-500 dark:text-red-400 mr-1 sm:mr-2" />
                                <span className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
                                  {isLoadingResources ? (
                                    <span className="inline-block w-8 h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></span>
                                  ) : (
                                    card.reportStats.resources
                                  )}
                                </span>
                              </div>
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                Total Resource Reports
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Hover glow effect */}
                  <div className={`absolute inset-0 rounded-2xl sm:rounded-3xl opacity-0 group-hover:opacity-100 
                    transition-opacity duration-500 pointer-events-none 
                    bg-gradient-to-br from-${card.accentColor}-500/10 dark:from-${card.accentColor}-500/20 via-transparent to-transparent`} />

                  {/* Animated border on hover */}
                  <div className={`absolute inset-0 rounded-2xl sm:rounded-3xl border-2 border-transparent 
                    ${isActive ? `border-${card.accentColor}-300/50 dark:border-${card.accentColor}-700/50` : ''} 
                    transition-all duration-500`} />
                </div>
              );
            })}
          </div>

          {/* FOOTER */}
          <div className="text-center text-gray-500 dark:text-gray-400 text-xs sm:text-sm pb-6 sm:pb-8">
            <p className="flex items-center justify-center">
              <Activity className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 text-green-500 dark:text-green-400 animate-pulse" />
              <span className="bg-gradient-to-r from-gray-600 to-gray-800 dark:from-gray-400 dark:to-gray-200 bg-clip-text text-transparent">
                {t('core.dashboard.systemStatus')}
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;