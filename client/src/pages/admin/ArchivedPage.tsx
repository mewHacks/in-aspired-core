// Admin archived items page with tabs for courses, careers, and resources
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Navbar from '@/components/layout/Navbar';
import ScrollRevelation from '@/components/ui/ScrollRevelation';
import { Archive, Search, X, ArrowLeft, Filter, Clock, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { httpClient } from '@/services/httpClient';
import { Career, Course } from '@/types';
import CareerCard from '@/components/careers/CareerCard';
import CourseCard from '@/components/courses/CourseCard';
import ArchiveButton from '@/components/ui/ArchiveButton';
import { useTranslation } from 'react-i18next';

const ArchivedPage: React.FC = () => {

  // Get authentication information
  const { isAuthenticated, isAdmin, isAuthReady } = useAuth();

  // Translation helper
  const { t } = useTranslation();

  // Toast notification helper
  const toast = useToast();

  // Navigation helper
  const navigate = useNavigate();

  // Access query parameters from URL
  const [searchParams] = useSearchParams();

  // ---------------- STATE VARIABLES ----------------
  // Which tab is active: courses or careers
  const [activeTab, setActiveTab] = useState<'courses' | 'careers'>('courses');

  // Archived courses list
  const [courses, setCourses] = useState<Course[]>([]);

  // Archived careers list
  const [careers, setCareers] = useState<Career[]>([]);

  // Loading state while API is fetching data
  const [loading, setLoading] = useState(true);

  // Search input value
  const [searchQuery, setSearchQuery] = useState('');

  // Last time the data was updated
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Used to show refresh animation
  const [refreshing, setRefreshing] = useState(false);



  // ---------------- TIME FORMATTER ----------------
  // Converts the lastUpdated timestamp into human friendly text
  const formatLastUpdated = (date: Date): string => {

    const now = new Date();

    // Calculate difference between current time and last update
    const diffMs = now.getTime() - date.getTime();

    // Convert milliseconds to minutes
    const diffMins = Math.floor(diffMs / 60000);

    // Less than 1 minute
    if (diffMins < 1) return t('admin.archived.time.justNow', 'Just now');

    // Less than 60 minutes
    if (diffMins < 60)
      return t('admin.archived.time.mAgo', { count: diffMins, defaultValue: `${diffMins}m ago` });

    // Convert minutes to hours
    const diffHours = Math.floor(diffMins / 60);

    if (diffHours < 24) // Less than 24 hours
      return t('admin.archived.time.hAgo', { count: diffHours, defaultValue: `${diffHours}h ago` });

    // Convert hours → days
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays === 1) return t('admin.archived.time.yesterday', 'Yesterday'); // Special case for 1 day ago

    if (diffDays < 7) // Less than 7 days
      return t('admin.archived.time.dAgo', { count: diffDays, defaultValue: `${diffDays}d ago` });

    // If older than 7 days → show formatted date
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };


  // ---------------- BACK BUTTON ----------------
  // Navigate back to dashboard
  const handleBack = () => {

    // Prevent navigation until auth state is ready
    if (!isAuthReady) return;

    navigate('/dashboard');
  };


  /* ---------------- URL TAB CONTROL ---------------- */

  // When page loads, check URL parameter
  // Example:
  // /archived?tab=careers
  // This will automatically switch to careers tab
  useEffect(() => {

    const tab = searchParams.get('tab');

    if (tab === 'courses' || tab === 'careers') {
      setActiveTab(tab);
    }

  }, [searchParams]);


  /* ---------------- FETCH ARCHIVED DATA ---------------- */

  // Fetch archived courses and careers from backend
  const loadArchived = async () => {

    // Only admin users can access archived data
    if (!isAuthenticated || !isAdmin) {
      setLoading(false);
      return;
    }

    try {

      // Enable refresh spinner
      setRefreshing(true);

      // Fetch both APIs at the same time
      const [coursesRes, careersRes] = await Promise.all([
        httpClient('/api/courses/archived'),
        httpClient('/api/careers/archived'),
      ]);

      // If any API fails → throw error
      if (!coursesRes.ok || !careersRes.ok) {
        throw new Error('Failed to fetch archived data');
      }

      // Convert responses into JSON
      const coursesData = await coursesRes.json();
      const careersData = await careersRes.json();

      // Save results into state
      setCourses(coursesData);
      setCareers(careersData);

      // Update last updated time
      const now = new Date();
      setLastUpdated(now);

      // Save timestamp into localStorage
      // This persists even if page reloads
      localStorage.setItem('archivedPageLastUpdate', now.toISOString());

    } catch (err) {

      // Log error for debugging
      console.error(err);

      // Show error toast to user
      toast.error(t('admin.archived.toast.fetchError', 'Failed to load archived content'));

    } finally {

      // Stop loading states
      setLoading(false);
      setRefreshing(false);
    }
  };


  /* ---------------- INITIAL PAGE LOAD ---------------- */
  useEffect(() => {

    // Try restore last update timestamp from localStorage
    const storedTime = localStorage.getItem('archivedPageLastUpdate');

    if (storedTime) {
      setLastUpdated(new Date(storedTime));
    }

    // Fetch archived content
    loadArchived();

  }, [isAuthenticated, isAdmin]);


  /* ---------------- AUTO UPDATE TIMER ---------------- */
  // Re-renders the timestamp every 60 seconds
  // This keeps "5 minutes ago" accurate
  useEffect(() => {

    if (!lastUpdated) return;

    const interval = setInterval(() => {

      // Force re-render by setting same date
      setLastUpdated(new Date(lastUpdated));

    }, 60000);

    return () => clearInterval(interval);

  }, [lastUpdated]);


  /* ---------------- MANUAL REFRESH ---------------- */
  // Refresh button handler
  const handleRefresh = () => {
    loadArchived();
  };


  /* ---------------- SEARCH FILTERS ---------------- */
  // Filter archived courses by search query
  const filteredCourses = useMemo(() => {

    // If search box empty → return all courses
    if (!searchQuery.trim()) return courses;

    const q = searchQuery.toLowerCase();

    // Filter by title or description
    return courses.filter(c =>
      c.title?.toLowerCase().includes(q) ||
      c.description?.toLowerCase().includes(q)
    );

  }, [courses, searchQuery]);


  // Filter archived careers
  const filteredCareers = useMemo(() => {

    if (!searchQuery.trim()) return careers;

    const q = searchQuery.toLowerCase();

    return careers.filter(c =>
      c.name?.toLowerCase().includes(q) ||
      c.description?.toLowerCase().includes(q)
    );

  }, [careers, searchQuery]);


  /* ---------------- Guards ---------------- */
  if (!isAuthenticated) { // Not signed in
    return (
      <div className="min-h-screen bg-white dark:bg-gray-950">
        <Navbar />
        <div className="pt-28 pb-20 px-4">
          <div className="max-w-md mx-auto">
            <div className="p-6 border border-gray-200 dark:border-gray-800 rounded-xl bg-white dark:bg-gray-900">
              <div className="inline-flex items-center gap-2 text-stone-700 dark:text-stone-400 bg-stone-100 dark:bg-stone-900/30 px-3 py-1.5 rounded-full text-xs font-medium mb-3">
                <Archive className="h-3.5 w-3.5" /> {t('admin.archived.auth.adminArchive', 'Admin Archive')}
              </div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2 text-center">{t('admin.archived.auth.signInReq', 'Sign In Required')}</h1>
              <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 text-center">{t('admin.archived.auth.signInDesc', 'Please sign in to access archived content.')}</p>
              <Button
                onClick={() => window.location.href = '/login'}
                variant="primary"
                className="w-full py-2.5"
              >
                {t('admin.archived.auth.signIn', 'Sign In')}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!isAdmin) { // Signed in but not admin
    return (
      <div className="min-h-screen bg-white dark:bg-gray-950">
        <Navbar />
        <div className="pt-28 pb-20 px-4">
          <div className="max-w-md mx-auto">
            <div className="p-6 border border-gray-200 dark:border-gray-800 rounded-xl bg-white dark:bg-gray-900">
              <div className="w-14 h-14 bg-stone-50 dark:bg-stone-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
                <Archive className="h-7 w-7 text-stone-600 dark:text-stone-400" />
              </div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2 text-center">{t('admin.archived.auth.adminReq', 'Admin Access Required')}</h1>
              <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 text-center">{t('admin.archived.auth.adminDesc', 'This page is only accessible to administrators.')}</p>
              <Button
                onClick={() => navigate('/dashboard')}
                variant="primary"
                className="w-full py-2.5"
              >
                {t('admin.archived.auth.backDashboard', 'Back to Dashboard')}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ---------------- UI ----------------
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <Navbar />

      {/* Hero Header - Compact */}
      <section className="pt-28 pb-6 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Back Button */}
          <div className="mb-4">
            <button
              onClick={handleBack}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm rounded-xl shadow-lg border border-gray-100 dark:border-gray-800 hover:shadow-xl hover:bg-white dark:hover:bg-gray-800 transition-all duration-200 group hover:scale-[1.02] active:scale-95"
            >
              <ArrowLeft className="h-5 w-5 text-gray-700 dark:text-gray-300 group-hover:-translate-x-0.5 transition-transform" />
              <span className="font-medium text-gray-700 dark:text-gray-300">{t('admin.archived.header.back', 'Back')}</span>
            </button>
          </div>

          <ScrollRevelation>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div>
                <div className="inline-flex items-center gap-2 text-stone-700 dark:text-stone-400 bg-stone-100 dark:bg-stone-900/30 px-3 py-1.5 rounded-full text-xs font-medium mb-3">
                  <Archive className="h-3.5 w-3.5" />
                  {t('admin.archived.auth.adminArchive', 'Admin Archive')}
                </div>
                <h1 className="text-3xl font-serif font-bold text-gray-900 dark:text-gray-100 mb-2">
                  {t('admin.archived.header.title', 'Archived Vault')}
                </h1>
                <p className="text-gray-600 dark:text-gray-400 text-sm max-w-2xl flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                  {lastUpdated ? (
                    <>{t('admin.archived.header.lastUpdated', 'Last updated')}: {formatLastUpdated(lastUpdated)}</>
                  ) : (
                    t('admin.archived.header.loading', 'Loading...')
                  )}
                </p>
              </div>

              {/* Stats + Refresh Button */}
              <div className="flex gap-3">
                <div className="p-3 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-indigo-700 dark:text-indigo-400 mb-0.5">{courses.length}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">{t('admin.archived.header.coursesCount', 'Courses')}</p>
                  </div>
                </div>
                <div className="p-3 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400 mb-0.5">{careers.length}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">{t('admin.archived.header.careersCount', 'Careers')}</p>
                  </div>
                </div>
                <button
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="p-3 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-md transition-all group disabled:opacity-50"
                  title="Refresh archived data"
                >
                  <RefreshCw className={`w-5 h-5 text-gray-600 dark:text-gray-400 group-hover:text-stone-600 dark:group-hover:text-stone-400 transition-colors ${refreshing ? 'animate-spin' : 'group-hover:rotate-180'} transition-transform duration-500`} />
                </button>
              </div>
            </div>
          </ScrollRevelation>
        </div>
      </section>

      {/* Main Content */}
      <section className="pb-16 px-4">
        <div className="max-w-7xl mx-auto">
          <ScrollRevelation delay={0.1}>
            <Card className="p-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
              {/* Tabs Header - Compact */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
                  {/* Courses Tab */}
                  <button
                    className={`px-4 py-2 rounded-md font-medium text-sm transition-all ${activeTab === 'courses'
                      ? 'bg-white dark:bg-gray-900 text-indigo-700 dark:text-indigo-400 shadow-sm dark:shadow-gray-900'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                      }`}
                    onClick={() => setActiveTab('courses')}
                  >
                    {t('admin.archived.tabs.courses', 'Archived Courses')}
                  </button>
                  {/* Careers Tab */}
                  <button
                    className={`px-4 py-2 rounded-md font-medium text-sm transition-all ${activeTab === 'careers'
                      ? 'bg-white dark:bg-gray-900 text-emerald-700 dark:text-emerald-400 shadow-sm dark:shadow-gray-900'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                      }`}
                    onClick={() => setActiveTab('careers')}
                  >
                    {t('admin.archived.tabs.careers', 'Archived Careers')}
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-gray-400 dark:text-gray-500" />
                    <input
                      type="text"
                      placeholder={t('admin.archived.tabs.search', { type: activeTab, defaultValue: `Search archived ${activeTab}...` })}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 pr-8 py-1.5 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg text-sm focus:ring-2 focus:ring-gray-500 dark:focus:ring-gray-400 focus:border-gray-500 dark:focus:border-gray-400 w-full sm:w-56"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="absolute right-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Stats Bar - Compact */}
              <div className="mb-6 p-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-stone-100 dark:bg-stone-900/30 rounded-md">
                      <Archive className={`h-3.5 w-3.5 ${activeTab === 'careers' ? 'text-emerald-600 dark:text-emerald-400' : 'text-indigo-600 dark:text-indigo-400'}`} />
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 dark:text-gray-400">{t('admin.archived.tabs.showing', 'Showing')}</p>
                      <p className="font-medium text-gray-900 dark:text-gray-100 text-sm">
                        {activeTab === 'courses'
                          ? t('admin.archived.tabs.ofCourses', { count: filteredCourses.length, total: courses.length, defaultValue: `${filteredCourses.length} of ${courses.length} archived courses` })
                          : t('admin.archived.tabs.ofCareers', { count: filteredCareers.length, total: careers.length, defaultValue: `${filteredCareers.length} of ${careers.length} archived careers` })
                        }
                      </p>
                    </div>
                  </div>
                  {searchQuery && (
                    <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
                      <Filter className="h-3.5 w-3.5" />
                      {t('admin.archived.tabs.filteredBy', 'Filtered by:')} "{searchQuery}"
                    </div>
                  )}
                </div>
              </div>

              {/* Courses Tab Content */}
              {activeTab === 'courses' && (
                <>
                  {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                      {[1, 2, 3, 4, 5, 6].map(i => (
                        <div
                          key={i}
                          className="bg-gray-100 dark:bg-gray-800 rounded-xl h-72 animate-pulse border dark:border-gray-700"
                        />
                      ))}
                    </div>
                  ) : filteredCourses.length > 0 ? (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                        {filteredCourses.map(course => (
                          <div
                            key={course.id}
                            className="group relative cursor-pointer"
                            onClick={() => navigate(`/courses/${course.id}`, { state: { from: 'archived' } })}
                          >
                            {/* pointer-events-none so outer div handles navigation */}
                            <div className="pointer-events-none">
                              <CourseCard
                                course={course}
                                showAdminActions={false}
                              />
                            </div>

                            {/* Archived badge top left */}
                            <div className="absolute top-3 left-3 bg-gray-800 dark:bg-gray-700 text-white text-xs px-2 py-1 rounded z-10 pointer-events-none">
                              {t('admin.archived.tabs.archivedBadge', 'Archived')}
                            </div>

                            {/* Unarchive button bottom right */}
                            <div className="absolute bottom-5 right-5 z-10 pointer-events-auto">
                              <ArchiveButton
                                itemId={course.id}
                                itemType="course"
                                itemTitle={course.title}
                                variant="button"
                                archived={true}
                                onArchivedChange={() => setCourses(prev => prev.filter(c => c.id !== course.id))}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                      {searchQuery && filteredCourses.length === 0 && (
                        <div className="text-center py-12">
                          <div className="w-14 h-14 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-3">
                            <Search className="h-6 w-6 text-gray-400 dark:text-gray-500" />
                          </div>
                          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">{t('admin.archived.empty.noMatchCourses', 'No matching courses found')}</h3>
                          <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 max-w-md mx-auto">
                            {t('admin.archived.empty.noMatchCoursesDesc', { query: searchQuery, defaultValue: `No archived courses match your search for "${searchQuery}".` })}
                          </p>
                          <Button
                            variant="outline"
                            onClick={() => setSearchQuery('')}
                            className="flex items-center gap-1.5 py-1.5 px-3 text-sm border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                          >
                            <X className="h-3.5 w-3.5" />
                            {t('admin.archived.empty.clearSearch', 'Clear Search')}
                          </Button>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-12 border border-dashed border-gray-300 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                      <div className="w-14 h-14 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Archive className="h-7 w-7 text-indigo-700 dark:text-indigo-400" />
                      </div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">{t('admin.archived.empty.noCourses', 'No archived courses')}</h3>
                      <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 max-w-md mx-auto">
                        {t('admin.archived.empty.noCoursesDesc', 'No courses have been archived yet. Archived courses will appear here.')}
                      </p>
                    </div>
                  )}
                </>
              )}

              {/* Careers Tab Content */}
              {activeTab === 'careers' && (
                <>
                  {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                      {[1, 2, 3, 4, 5, 6].map(i => (
                        <div
                          key={i}
                          className="bg-gray-100 dark:bg-gray-800 rounded-xl h-72 animate-pulse border dark:border-gray-700"
                        />
                      ))}
                    </div>
                  ) : filteredCareers.length > 0 ? (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                        {filteredCareers.map(career => (
                          <div
                            key={career.id}
                            className="group relative cursor-pointer"
                            onClick={() => navigate(`/careers/${career.id}`, { state: { from: 'archived' } })}
                          >
                            {/* pointer-events-none so outer div handles navigation */}
                            <div className="pointer-events-none">
                              <CareerCard
                                career={career}
                                showAdminActions={false}
                              />
                            </div>

                            {/* Archived badge top left */}
                            <div className="absolute top-3 left-3 bg-gray-800 dark:bg-gray-700 text-white text-xs px-2 py-1 rounded z-10 pointer-events-none">
                              {t('admin.archived.tabs.archivedBadge', 'Archived')}
                            </div>

                            {/* Unarchive button bottom right */}
                            <div className="absolute bottom-5 right-5 z-10 pointer-events-auto">
                              <ArchiveButton
                                itemId={career.id}
                                itemType="career"
                                itemTitle={career.name}
                                variant="button"
                                archived={true}
                                onArchivedChange={() => setCareers(prev => prev.filter(c => c.id !== career.id))}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                      {searchQuery && filteredCareers.length === 0 && (
                        <div className="text-center py-12">
                          <div className="w-14 h-14 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-3">
                            <Search className="h-6 w-6 text-gray-400 dark:text-gray-500" />
                          </div>
                          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">{t('admin.archived.empty.noMatchCareers', 'No matching careers found')}</h3>
                          <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 max-w-md mx-auto">
                            {t('admin.archived.empty.noMatchCareersDesc', { query: searchQuery, defaultValue: `No archived careers match your search for "${searchQuery}".` })}
                          </p>
                          <Button
                            variant="outline"
                            onClick={() => setSearchQuery('')}
                            className="flex items-center gap-1.5 py-1.5 px-3 text-sm border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                          >
                            <X className="h-3.5 w-3.5" />
                            {t('admin.archived.empty.clearSearch', 'Clear Search')}
                          </Button>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-12 border border-dashed border-gray-300 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                      <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Archive className="h-7 w-7 text-emerald-700 dark:text-emerald-400" />
                      </div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">{t('admin.archived.empty.noCareers', 'No archived careers')}</h3>
                      <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 max-w-md mx-auto">
                        {t('admin.archived.empty.noCareersDesc', 'No careers have been archived yet. Archived careers will appear here.')}
                      </p>
                    </div>
                  )}
                </>
              )}
            </Card>
          </ScrollRevelation>
        </div>
      </section>
    </div>
  );
};

export default ArchivedPage;