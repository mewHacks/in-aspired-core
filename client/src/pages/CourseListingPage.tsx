import React, { useState, useMemo, useEffect } from 'react';
import ScrollRevelation from '@/components/ui/ScrollRevelation';
import Navbar from '../components/layout/Navbar';
import { SearchBar } from '../components/ui/SearchBar';
import { Search, Filter as FilterIcon, BookOpen, Sparkles, Star, Flame, Plus } from 'lucide-react';
import CourseCard from '../components/courses/CourseCard';
import CourseFilterSidebar, { FilterState } from '../components/courses/CourseFilterSidebar';
import { fetchCourses } from '../services/api';
import { Course } from '../types';
import { Button } from '@/components/ui/Button';
import { useAuth } from '../contexts/AuthContext';
import { useRoles } from '../hooks/useRoles';
import { Link } from 'react-router-dom';
import QuickEditModal from '@/components/courses/QuickEditModal';
import InfographicHeader from '../components/visuals/InfographicHeader';
import { useTranslation } from 'react-i18next';

// Main course listing page which displays all the courses in Malaysia
const CourseListingPage: React.FC = () => {
    const { t } = useTranslation();

    // Helper state for API data
    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);

    const { user, isLoading: authLoading } = useAuth(); // Get auth loading state
    const { isAdmin: originalIsAdmin } = useRoles();

    const roleString = user?.role?.toString().toLowerCase();
    const isAdmin = originalIsAdmin || roleString === 'admin';

    const [quickEditCourse, setQuickEditCourse] = useState<Course | null>(null);
    const [showQuickEditModal, setShowQuickEditModal] = useState(false);

    // Wait for BOTH courses AND auth to load
    const isDataLoading = loading || authLoading;

    // Stores what is being typed in the search bar
    const [searchTerm, setSearchTerm] = useState('');

    // Controls whether the sidebar is open or not, especially for mobiles
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    // Stores the current filters state, default is no filter []
    const [filters, setFilters] = useState<FilterState>({
        levels: [],
        domains: [],
        costLevels: [],
        types: []
    });

    // Fetch courses on mount
    useEffect(() => {
        const loadCourses = async () => {
            try {
                const data = await fetchCourses();
                setCourses(data);
            } catch (error) {
                console.error("Failed to load courses", error);
            } finally {
                setLoading(false);
            }
        };
        loadCourses();
    }, []);

    // Filter logic
    // Memoized computation, recalculates only when searchTerm or filters change
    const filteredCourses = useMemo(() => {
        if (loading) return [];
        // Loops through each course and checks if it matches the search term and filters
        return courses.filter(course => {

            // 1. Text search, check if the search term matches the course title or institution ID/name
            const matchesSearch = course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                course.institutionId.includes(searchTerm.toLowerCase());

            // 2. Filter: Type, check if the course type matches the selected types
            const matchesType = filters.types.length === 0 || filters.types.includes(course.type);

            // 3. Filter: Level, check if the course level matches the selected levels
            const matchesLevel = filters.levels.length === 0 || filters.levels.includes(course.level);

            // 4. Filter: Domain, check if the course domain matches the selected domains
            const matchesDomain = filters.domains.length === 0 ||
                course.domainIds.some(id => filters.domains.includes(id));

            // 5. Filter: Cost, check if the course cost level matches the selected cost levels
            const matchesCost = filters.costLevels.length === 0 || filters.costLevels.includes(course.cost_level);

            // Course is only shown when it passes all filters (1-5)
            return matchesSearch && matchesLevel && matchesDomain && matchesCost && matchesType;
        });
    }, [searchTerm, filters, loading, courses]); // loading and courses to re-run useMemo hook (responsible for filtering)

    // Function to refresh careers after edit
    const refreshCareers = async () => {
        try {
            const data = await fetchCourses();
            setCourses(data);
        } catch (error) {
            console.error("Failed to refresh courses", error);
        }
    };

    // Handle quick edit from CourseCard
    const handleQuickEdit = (course: Course) => {
        setQuickEditCourse(course);
        setShowQuickEditModal(true);
    };

    // Handle save success
    const handleSaveSuccess = () => {
        refreshCareers(); // Refresh the list
        // Optionally show a toast notification
    };

    // Memoized sorting logic
    // Now uses server-provided matchScore from RIASEC personality matching
    const sortedCourses = useMemo(() => {

        // Creates a copy and sort it
        return [...filteredCourses].sort((a, b) => {

            // Group 1: RIASEC match (server-provided)
            const aMatch = a.isRecommended && (a.matchScore || 0) > 0;
            const bMatch = b.isRecommended && (b.matchScore || 0) > 0;
            if (aMatch && !bMatch) return -1;
            if (!aMatch && bMatch) return 1;
            // Within recommended, sort by matchScore descending
            if (aMatch && bMatch) return (b.matchScore || 0) - (a.matchScore || 0);

            // Group 2: Featured, check if the course is featured
            if (a.is_featured && !b.is_featured) return -1;
            if (!a.is_featured && b.is_featured) return 1;

            // Group 3: Popular, determined by view count
            const aViews = a.view_count || 0;
            const bViews = b.view_count || 0;
            return bViews - aViews; // In descending order

        }).map(course => { // Adds UI metadata

            // Determine section type for organizing courses into sections later
            let sectionType = '';

            if (course.isRecommended && (course.matchScore || 0) > 0) {
                sectionType = 'recommended';
            } else if (course.is_featured) {
                sectionType = 'featured';
            } else if ((course.view_count || 0) > 500) { // Threshold for "Popular"
                sectionType = 'popular';
            } else {
                sectionType = 'others';
            }

            // Returns enhanced course object with section type
            return { ...course, sectionType };
        });
    }, [filteredCourses]);

    // Organize courses into sections
    const sections = useMemo(() => {
        return {
            recommended: sortedCourses.filter(c => c.sectionType === 'recommended'),
            featured: sortedCourses.filter(c => c.sectionType === 'featured'),
            popular: sortedCourses.filter(c => c.sectionType === 'popular'),
            others: sortedCourses.filter(c => c.sectionType === 'others')
        };
    }, [sortedCourses]);

    // Check if there are any results to show appropriate message
    const hasResults = sortedCourses.length > 0;

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-gray-950 font-sans pt-16">
            <Navbar />

            {/* Quick Edit Modal */}
            <QuickEditModal
                course={quickEditCourse}
                isOpen={showQuickEditModal}
                onClose={() => {
                    setShowQuickEditModal(false);
                    setQuickEditCourse(null);
                }}
                onSaveSuccess={handleSaveSuccess}
            />

            {/* Show loading spinner while data is loading */}
            {isDataLoading ? (
                <div className="flex items-center justify-center h-64">
                    <div className="text-gray-600 dark:text-gray-400">Loading course data...</div>
                </div>
            ) : (
                <>
                    {/* Header with split-view layout */}
                    <section className="pt-12 pb-12 px-4 bg-white dark:bg-gray-900 relative border-b border-slate-100 dark:border-gray-800 overflow-hidden">
                        <div className="max-w-5xl mx-auto relative z-10">
                            <div className="flex flex-col lg:flex-row gap-16 items-center justify-center">

                                {/* Left Side: Title & Search */}
                                <div className="w-full lg:w-2/5 text-center lg:text-left">
                                    <ScrollRevelation>
                                        {/* Icon badge */}
                                        <div className="inline-flex items-center justify-center p-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl text-indigo-600 dark:text-indigo-400 mb-6">
                                            <BookOpen className="w-8 h-8" />
                                        </div>

                                        {/* Page title */}
                                        <h1 className="text-4xl md:text-5xl font-serif font-bold text-gray-900 dark:text-white mb-4 leading-tight">
                                            {t('browsing.courses.title')}
                                        </h1>

                                        {/* Page subtitle */}
                                        <p className="text-lg text-gray-600 dark:text-gray-400 mb-8" dangerouslySetInnerHTML={{ __html: t('browsing.courses.subtitle', { count: courses.length }) }}>
                                        </p>

                                        {/* Centered search bar */}
                                        <div className="relative flex flex-col gap-4">
                                            <div className="flex gap-3">
                                                <div className="flex-1">
                                                    <SearchBar
                                                        value={searchTerm}
                                                        onChange={setSearchTerm}
                                                        placeholder={t('browsing.courses.searchPlaceholder')}
                                                    />
                                                </div>

                                                {/* Create button next to search - only for admins */}
                                                {isAdmin && (
                                                    <Link to="/courses/create">
                                                        <Button className="flex items-center gap-2 whitespace-nowrap h-full">
                                                            <Plus size={16} />
                                                            {t('browsing.courses.createNew')}
                                                        </Button>
                                                    </Link>
                                                )}
                                            </div>

                                            {/* Mobile filter toggle - centered below search bar */}
                                            <button
                                                onClick={() => setIsSidebarOpen(true)}
                                                className="lg:hidden flex items-center justify-center px-4 py-3 bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-xl text-slate-700 dark:text-gray-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-gray-700 shadow-sm transition-all"
                                            >
                                                <FilterIcon className="w-4 h-4 mr-2" />
                                                {t('browsing.courses.filterBtn')}
                                            </button>
                                        </div>
                                    </ScrollRevelation>
                                </div>

                                {/* Right Side: Infographic Visuals */}
                                <div className="w-full lg:w-3/5 flex justify-center">
                                    <InfographicHeader
                                        type="courses"
                                        data={filteredCourses}
                                        loading={loading}
                                    />
                                </div>
                            </div>
                        </div>
                    </section>

                    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                        <div className="flex lg:gap-8">

                            {/* Sidebar (Desktop: Static, Mobile: Drawer) */}
                            <div className="hidden lg:block w-72 flex-shrink-0">
                                <CourseFilterSidebar
                                    filters={filters}
                                    setFilters={setFilters}
                                    isOpen={isSidebarOpen}
                                    onClose={() => setIsSidebarOpen(false)}
                                />
                            </div>

                            {/* Mobile drawer instance */}
                            <div className="lg:hidden">
                                <CourseFilterSidebar
                                    filters={filters}
                                    setFilters={setFilters}
                                    isOpen={isSidebarOpen}
                                    onClose={() => setIsSidebarOpen(false)}
                                />
                            </div>

                            {/* Results section */}
                            <div className="flex-1 space-y-12">
                                {loading ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                        {[1, 2, 3, 4, 5, 6].map((i) => (
                                            <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl h-96 animate-pulse border border-slate-200 dark:border-gray-700 p-6 flex flex-col">
                                                <div className="flex justify-between items-start mb-4">
                                                    <div className="w-12 h-12 bg-slate-100 dark:bg-gray-700 rounded-xl" />
                                                    <div className="w-20 h-6 bg-slate-100 dark:bg-gray-700 rounded-full" />
                                                </div>
                                                <div className="space-y-3 mb-6 flex-1">
                                                    <div className="h-4 bg-slate-100 dark:bg-gray-700 rounded w-1/3" />
                                                    <div className="h-6 bg-slate-100 dark:bg-gray-700 rounded w-3/4" />
                                                    <div className="h-4 bg-slate-100 dark:bg-gray-700 rounded w-1/2" />
                                                </div>
                                                <div className="h-10 bg-slate-100 dark:bg-gray-700 rounded-xl w-full mt-auto" />
                                            </div>
                                        ))}
                                    </div>
                                ) : hasResults ? ( // If there are results, show them
                                    <>
                                        {/* Group 1: Recommended */}
                                        {sections.recommended.length > 0 && (
                                            <section>
                                                <div className="flex items-center gap-2 mb-6">
                                                    <div className="p-1.5 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                                                        <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                                                    </div>
                                                    <h2 className="text-xl font-bold text-slate-800 dark:text-white">{t('browsing.courses.sections.recommended')}</h2>
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                                    {sections.recommended.map(course => (
                                                        <CourseCard
                                                            key={course.id}
                                                            course={course}
                                                            showAdminActions={isAdmin}
                                                            onQuickEdit={handleQuickEdit}
                                                        />
                                                    ))}
                                                </div>
                                            </section>
                                        )}

                                        {/* Group 2: Featured */}
                                        {sections.featured.length > 0 && (
                                            <section>
                                                <div className="flex items-center gap-2 mb-6">
                                                    <div className="p-1.5 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                                                        <Star className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                                                    </div>
                                                    <h2 className="text-xl font-bold text-slate-800 dark:text-white">{t('browsing.courses.sections.featured')}</h2>
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                                    {sections.featured.map(course => (
                                                        <CourseCard
                                                            key={course.id}
                                                            course={course}
                                                            showAdminActions={isAdmin}
                                                            onQuickEdit={handleQuickEdit}
                                                        />
                                                    ))}
                                                </div>
                                            </section>
                                        )}

                                        {/* Group 3: Popular */}
                                        {sections.popular.length > 0 && (
                                            <section>
                                                <div className="flex items-center gap-2 mb-6">
                                                    <div className="p-1.5 bg-rose-100 dark:bg-rose-900/30 rounded-lg">
                                                        <Flame className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                                                    </div>
                                                    <h2 className="text-xl font-bold text-slate-800 dark:text-white">{t('browsing.courses.sections.popular')}</h2>
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                                    {sections.popular.map(course => (
                                                        <CourseCard
                                                            key={course.id}
                                                            course={course}
                                                            showAdminActions={isAdmin}
                                                            onQuickEdit={handleQuickEdit}
                                                        />
                                                    ))}
                                                </div>
                                            </section>
                                        )}

                                        {/* Group 4: Others / All */}
                                        {sections.others.length > 0 && (
                                            <section>
                                                {/* Show header only if we have other sections above, to separate them */}
                                                {(sections.recommended.length > 0 || sections.featured.length > 0 || sections.popular.length > 0) && (
                                                    <div className="flex items-center gap-2 mb-6 pt-4 border-t border-slate-100 dark:border-gray-800">
                                                        <h2 className="text-xl font-bold text-slate-800 dark:text-white">{t('browsing.courses.sections.others')}</h2>
                                                    </div>
                                                )}
                                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                                    {sections.others.map(course => (
                                                        <CourseCard
                                                            key={course.id}
                                                            course={course}
                                                            showAdminActions={isAdmin}
                                                            onQuickEdit={handleQuickEdit}
                                                        />
                                                    ))}
                                                </div>
                                            </section>
                                        )}
                                    </>
                                ) : ( // If no results, show "No courses found" message
                                    <div className="text-center py-20">
                                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 dark:bg-gray-800 mb-4">
                                            <Search className="w-8 h-8 text-slate-400 dark:text-gray-500" />
                                        </div>
                                        <h3 className="text-lg font-medium text-slate-900 dark:text-white">{t('browsing.courses.empty.title')}</h3>
                                        <p className="text-slate-500 dark:text-gray-400 mt-2">{t('browsing.courses.empty.desc')}</p>

                                        {/* Clear all filters button to reset everything to default */}
                                        <button
                                            onClick={() => {
                                                setSearchTerm('');
                                                setFilters({ levels: [], domains: [], costLevels: [], types: [] });
                                            }}
                                            className="mt-6 text-indigo-600 dark:text-indigo-400 font-semibold hover:text-indigo-700 dark:hover:text-indigo-300"
                                        >
                                            {t('browsing.courses.empty.clearFilters')}
                                        </button>
                                    </div>
                                )}
                            </div>

                        </div>
                    </main>
                </>
            )}
        </div>
    );
};

export default CourseListingPage;