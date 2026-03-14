// Saved items page showing bookmarked careers and courses
import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import Navbar from '../components/layout/Navbar';
import ScrollRevelation from '@/components/ui/ScrollRevelation';
import { BookmarkCheck, ChevronRight, Filter, Search, X, ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { Career, Course } from '../types';
import { fetchCareers, fetchCourses } from '../services/api';

import CareerCard from '../components/careers/CareerCard';
import { useSavedCareers } from '@/contexts/SavedCareersContext';

import CourseCard from '@/components/courses/CourseCard';
import { useSavedCourses } from '@/contexts/SavedCoursesContext';
import { useTranslation } from 'react-i18next';

const SavedPage: React.FC = () => {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const { isAdmin, isAuthReady } = useAuth();
  const toast = useToast();
  const { savedIds } = useSavedCareers();
  const { savedIds: savedCourseIds } = useSavedCourses();

  const [activeTab, setActiveTab] = useState<'careers' | 'courses'>('courses');
  const [allCareers, setAllCareers] = useState<Career[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredCareers, setFilteredCareers] = useState<Career[]>([]);
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [filteredCourses, setFilteredCourses] = useState<Course[]>([]);

  const [searchParams] = useSearchParams();

  const navigate = useNavigate();

  const handleBack = () => {
    if (!isAuthReady) return; // safety guard

    if (isAdmin) {
      navigate('/dashboard');
    } else {
      navigate('/');
    }
  };

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'courses') {
      setActiveTab('courses');
    } else if (tab === 'careers') {
      setActiveTab('careers');
    }
  }, [searchParams]);

  // Load ALL careers once
  // Saved ones are derived from savedIds
  useEffect(() => {
    if (!isAuthenticated) return;

    const loadCareers = async () => {
      try {
        const data = await fetchCareers();
        setAllCareers(data);
      } catch (err) {
        console.error(err);
        toast.error('Failed to load careers');
      } finally {
        setLoading(false);
      }
    };

    loadCareers();
  }, [isAuthenticated]);

  // Load ALL courses once
  useEffect(() => {
    if (!isAuthenticated) return;

    const loadCourses = async () => {
      try {
        const data = await fetchCourses();
        setAllCourses(data);
      } catch (err) {
        console.error(err);
        toast.error('Failed to load courses');
      }
    };

    loadCourses();
  }, [isAuthenticated]);

  // Filter saved careers based on search query
  useEffect(() => {
    const savedCareers = allCareers.filter(career =>
      savedIds.has(career.id)
    );

    if (!searchQuery.trim()) {
      setFilteredCareers(savedCareers);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = savedCareers.filter(career => {
      // Use the actual properties from your Career type and ensure they are strings before calling toLowerCase
      const careerName = career.name?.toLowerCase() || '';
      const careerDescription = career.description?.toLowerCase() || '';
      const careerSkills = Array.isArray(career.skills)
        ? career.skills.join(' ').toLowerCase()
        : '';

      return (
        careerName.includes(query) ||
        careerDescription.includes(query) ||
        careerSkills.includes(query)
      );
    });

    setFilteredCareers(filtered);
  }, [allCareers, savedIds, searchQuery]);

  // Filter saved courses based on search query
  useEffect(() => {
    const savedCourses = allCourses.filter(course =>
      savedCourseIds.has(course.id)
    );

    if (!searchQuery.trim()) {
      setFilteredCourses(savedCourses);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = savedCourses.filter(course => {
      const title = course.title?.toLowerCase() || '';
      const description = course.description?.toLowerCase() || '';
      return title.includes(query) || description.includes(query);
    });

    setFilteredCourses(filtered);
  }, [allCourses, savedCourseIds, searchQuery]);

  // Calculate saved counts for display
  const savedCareers = allCareers.filter(career => savedIds.has(career.id));
  const savedCourses = allCourses.filter(course => savedCourseIds.has(course.id));

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-950">
        <Navbar />
        <div className="pt-28 pb-20 px-4">
          <div className="max-w-md mx-auto">
            <div className="p-6 border border-gray-200 dark:border-gray-800 rounded-xl bg-white dark:bg-gray-900">
              <div className="w-14 h-14 bg-red-50 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
                <BookmarkCheck className="h-7 w-7 text-red-500 dark:text-red-400" />
              </div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2 text-center">{t('core.saved.signInRequired.title')}</h1>
              <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 text-center">{t('core.saved.signInRequired.desc')}</p>
              <Button
                onClick={() => window.location.href = '/login'}
                variant="primary"
                className="w-full py-2.5"
              >
                {t('core.saved.signInRequired.button')}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
              <span className="font-medium text-gray-700 dark:text-gray-300">{t('core.saved.header.back')}</span>
            </button>
          </div>

          <ScrollRevelation>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div>
                <div className="inline-flex items-center gap-2 text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 px-3 py-1.5 rounded-full text-xs font-medium mb-3">
                  <BookmarkCheck className="h-3.5 w-3.5" />
                  {t('core.saved.header.badge')}
                </div>
                <h1 className="text-3xl font-serif font-bold text-gray-900 dark:text-gray-100 mb-2">
                  {t('core.saved.header.title')}
                </h1>
                <p className="text-gray-600 dark:text-gray-400 text-sm max-w-2xl">
                  {t('core.saved.header.desc')}
                </p>
              </div>
              {/* Show both course and career counts */}
              <div className="flex gap-3">
                <div className="p-3 bg-white dark:bg-gray-900 rounded-lg border border-indigo-200 dark:border-indigo-800 shadow-sm">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-indigo-700 dark:text-indigo-400 mb-0.5">{savedCourses.length}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">{t('core.saved.header.savedCourses')}</p>
                  </div>
                </div>
                <div className="p-3 bg-white dark:bg-gray-900 rounded-lg border border-emerald-200 dark:border-emerald-800 shadow-sm">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400 mb-0.5">{savedCareers.length}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">{t('core.saved.header.savedCareers')}</p>
                  </div>
                </div>
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
                    {t('core.saved.tabs.courses')}
                  </button>
                  {/* Careers Tab */}
                  <button
                    className={`px-4 py-2 rounded-md font-medium text-sm transition-all ${activeTab === 'careers'
                      ? 'bg-white dark:bg-gray-900 text-emerald-700 dark:text-emerald-400 shadow-sm dark:shadow-gray-900'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                      }`}
                    onClick={() => setActiveTab('careers')}
                  >
                    {t('core.saved.tabs.careers')}
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-gray-400 dark:text-gray-500" />
                    <input
                      type="text"
                      placeholder={activeTab === 'careers' ? t('core.saved.search.placeholderCareers') : t('core.saved.search.placeholderCourses')}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 pr-8 py-1.5 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 dark:focus:ring-amber-400 focus:border-amber-500 dark:focus:border-amber-400 w-full sm:w-56"
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

              {/* Stats Bar - Compact - Updated to be dynamic */}
              <div className="mb-6 p-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 ${activeTab === 'careers' ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-indigo-100 dark:bg-indigo-900/30'} rounded-md`}>
                      <BookmarkCheck className={`h-3.5 w-3.5 ${activeTab === 'careers' ? 'text-emerald-600 dark:text-emerald-400' : 'text-indigo-600 dark:text-indigo-400'}`} />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-gray-100 text-sm">
                        {activeTab === 'careers'
                          ? t('core.saved.search.showingCareers', { filtered: filteredCareers.length, total: savedCareers.length })
                          : t('core.saved.search.showingCourses', { filtered: filteredCourses.length, total: savedCourses.length })
                        }
                      </p>
                    </div>
                  </div>
                  {searchQuery && (
                    <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
                      <Filter className="h-3.5 w-3.5" />
                      {t('core.saved.search.filteredBy', { query: searchQuery })}
                    </div>
                  )}
                </div>
              </div>

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
                            onClick={() => navigate(`/careers/${career.id}`, { state: { from: 'saved' } })}
                          >
                            {/* pointer-events-none so outer div handles navigation */}
                            <div className="pointer-events-none">
                              <CareerCard
                                career={career}
                                showAdminActions={false}
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
                          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">{t('core.saved.empty.noMatchCareersTitle')}</h3>
                          <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 max-w-md mx-auto">
                            {t('core.saved.empty.noMatchCareersDesc', { query: searchQuery })}
                          </p>
                          <Button
                            variant="outline"
                            onClick={() => setSearchQuery('')}
                            className="flex items-center gap-1.5 py-1.5 px-3 text-sm border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                          >
                            <X className="h-3.5 w-3.5" />
                            {t('core.saved.search.clear')}
                          </Button>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-12 border border-dashed border-gray-300 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                      <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
                        <BookmarkCheck className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">{t('core.saved.empty.careersTitle')}</h3>
                      <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 max-w-md mx-auto">
                        {t('core.saved.empty.careersDesc')}
                      </p>
                      <Button
                        onClick={() => window.location.href = '/careers'}
                        variant="primary"
                        className="flex items-center gap-1.5 py-2 px-4 text-sm bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-700"
                      >
                        {t('core.saved.empty.exploreCareers')}
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </>
              )}

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
                            onClick={() => navigate(`/courses/${course.id}`, { state: { from: 'saved' } })}
                          >
                            {/* pointer-events-none so outer div handles navigation */}
                            <div className="pointer-events-none">
                              <CourseCard course={course} />
                            </div>
                          </div>
                        ))}
                      </div>
                      {searchQuery && filteredCourses.length === 0 && (
                        <div className="text-center py-12">
                          <div className="w-14 h-14 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-3">
                            <Search className="h-6 w-6 text-gray-400 dark:text-gray-500" />
                          </div>
                          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">{t('core.saved.empty.noMatchCoursesTitle')}</h3>
                          <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 max-w-md mx-auto">
                            {t('core.saved.empty.noMatchCoursesDesc', { query: searchQuery })}
                          </p>
                          <Button
                            variant="outline"
                            onClick={() => setSearchQuery('')}
                            className="flex items-center gap-1.5 py-1.5 px-3 text-sm border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                          >
                            <X className="h-3.5 w-3.5" />
                            {t('core.saved.search.clear')}
                          </Button>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-12 border border-dashed border-gray-300 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                      <div className="w-14 h-14 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
                        <BookmarkCheck className="h-7 w-7 text-indigo-600 dark:text-indigo-400" />
                      </div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">{t('core.saved.empty.coursesTitle')}</h3>
                      <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 max-w-md mx-auto">
                        {t('core.saved.empty.coursesDesc')}
                      </p>
                      <Button
                        onClick={() => window.location.href = '/courses'}
                        variant="primary"
                        className="flex items-center gap-1.5 py-2 px-4 text-sm bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-700"
                      >
                        {t('core.saved.empty.exploreCourses')}
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Button>
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

export default SavedPage;