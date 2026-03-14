import React, { useState, useMemo, useEffect } from 'react';
import ScrollRevelation from '@/components/ui/ScrollRevelation';
import Navbar from '../components/layout/Navbar';
import { SearchBar } from '../components/ui/SearchBar';
import { Search, Filter as FilterIcon, Briefcase, Sparkles, Flame, Plus } from 'lucide-react';
import CareerCard from '../components/careers/CareerCard';
import CareerFilterSidebar from '../components/careers/CareerFilterSidebar';
import { fetchCareers } from '../services/api';
import { Career } from '../types';
import { useRoles } from '../hooks/useRoles';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { useAuth } from '../contexts/AuthContext';
import QuickEditModal from '../components/careers/QuickEditModal';
import InfographicHeader from '../components/visuals/InfographicHeader';
import { useTranslation } from 'react-i18next';

// Filter categories
interface CareerFilterState {
    domains: string[];
    outlooks: string[];
}

// Main career listing page which displays all the careers
const CareerListingPage: React.FC = () => {
    const { t } = useTranslation();
    // Helper state for API data
    const [careers, setCareers] = useState<Career[]>([]);
    const [loading, setLoading] = useState(true);

    const { user, isLoading: authLoading } = useAuth(); // Get auth loading state
    const { isAdmin: originalIsAdmin } = useRoles();

    const roleString = user?.role?.toString().toLowerCase();
    const isAdmin = originalIsAdmin || roleString === 'admin';

    const [quickEditCareer, setQuickEditCareer] = useState<Career | null>(null);
    const [showQuickEditModal, setShowQuickEditModal] = useState(false);

    // Wait for BOTH careers AND auth to load
    const isDataLoading = loading || authLoading;

    // Stores what is being typed in the search bar
    const [searchTerm, setSearchTerm] = useState('');

    // Controls whether the sidebar is open or not, especially for mobiles
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    // Stores the current filters state, default is no filter []
    const [filters, setFilters] = useState<CareerFilterState>({
        domains: [],
        outlooks: []
    });

    // Fetch careers on mount
    useEffect(() => {
        const loadCareers = async () => {
            try {
                const data = await fetchCareers();
                setCareers(data);
            } catch (error) {
                console.error("Failed to load careers", error);
            } finally {
                setLoading(false);
            }
        };
        loadCareers();
    }, []);

    // Filter logic
    // Memoized computation, recalculates only when searchTerm or filters change
    const filteredCareers = useMemo(() => {
        if (loading) return [];
        // Loops through each career and checks if it matches the search term and filters
        return careers.filter(career => {

            // 1. Text search, check if the search term matches the career name or industry (array)
            const matchesSearch = career.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (career.industry && Array.isArray(career.industry) && career.industry.some(ind => ind.toLowerCase().includes(searchTerm.toLowerCase())));

            // 2. Filter: Domain (Check if any career related_domain matches selected filters)
            const matchesDomain = filters.domains.length === 0 ||
                career.related_domains.some(domainId => filters.domains.includes(domainId));

            // 3. Filter: Outlook (demand_level)
            const matchesOutlook = filters.outlooks.length === 0 ||
                (career.demand_level && filters.outlooks.includes(career.demand_level));

            // Career is only shown when it passes all filters (1-3)
            return matchesSearch && matchesDomain && matchesOutlook;
        });
    }, [searchTerm, filters, loading, careers]); // loading and careers to re-run useMemo hook (responsible for filtering)

    // Function to refresh careers after edit
    const refreshCareers = async () => {
        try {
            const data = await fetchCareers();
            setCareers(data);
        } catch (error) {
            console.error("Failed to refresh careers", error);
        }
    };

    // Handle quick edit from CareerCard
    const handleQuickEdit = (career: Career) => {
        setQuickEditCareer(career);
        setShowQuickEditModal(true);
    };

    // Handle save success
    const handleSaveSuccess = () => {
        refreshCareers(); // Refresh the list
        // Optionally show a toast notification
    };

    // Memoized sorting logic
    const sortedCareers = useMemo(() => {

        // 1. Get User's top domain based on test results from LocalStorage 
        let priorityDomainId: string | null = null;
        try {
            const userStr = localStorage.getItem('user') || sessionStorage.getItem('user');
            const userIdKey = userStr ? JSON.parse(userStr).id || JSON.parse(userStr)._id : 'guest';
            const storageKey = `resultsPersistence_${userIdKey}`;
            const persisted = localStorage.getItem(storageKey);

            if (persisted) {
                const data = JSON.parse(persisted);
                if (data.results?.topDomains?.length > 0) {
                    priorityDomainId = data.results.topDomains[0].id;
                }
            }
        } catch (e) {
            console.warn('Failed to parse results for sorting');
        }

        // 2. Sort filtered careers
        return [...filteredCareers].sort((a, b) => {

            // Group 1: RIASEC match (Priority)
            const aMatch = priorityDomainId && a.related_domains.includes(priorityDomainId);
            const bMatch = priorityDomainId && b.related_domains.includes(priorityDomainId);
            if (aMatch && !bMatch) return -1;
            if (!aMatch && bMatch) return 1;

            // Group 2: Popularity (View Count)
            const aViews = a.view_count || 0;
            const bViews = b.view_count || 0;
            return bViews - aViews; // Descending

        }).map(career => {
            // Determine section type for organizing careers into sections
            let sectionType = 'others';

            if (priorityDomainId && career.related_domains.includes(priorityDomainId)) {
                sectionType = 'recommended';
            } else if ((career.view_count || 0) > 800) { // Threshold for popular careers
                sectionType = 'popular';
            }

            return { ...career, sectionType };
        });
    }, [filteredCareers]);

    // Organize careers into sections
    const sections = useMemo(() => {
        return {
            recommended: sortedCareers.filter(c => c.sectionType === 'recommended'),
            popular: sortedCareers.filter(c => c.sectionType === 'popular'),
            others: sortedCareers.filter(c => c.sectionType === 'others')
        };
    }, [sortedCareers]);

    const hasResults = sortedCareers.length > 0;

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-gray-950 font-sans pt-16">

            {/* Navigation bar */}
            <Navbar />

            {/* Quick Edit Modal */}
            <QuickEditModal
                career={quickEditCareer}
                isOpen={showQuickEditModal}
                onClose={() => {
                    setShowQuickEditModal(false);
                    setQuickEditCareer(null);
                }}
                onSaveSuccess={handleSaveSuccess}
            />

            {/* Show loading spinner while data is loading */}
            {isDataLoading ? (
                <div className="flex items-center justify-center h-64">
                    <div className="text-gray-600 dark:text-gray-400">Loading career data...</div>
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
                                        <div className="inline-flex items-center justify-center p-3 bg-emerald-50 dark:bg-emerald-900/30 rounded-2xl text-emerald-600 dark:text-emerald-400 mb-6">
                                            <Briefcase className="w-8 h-8" />
                                        </div>

                                        {/* Page title */}
                                        <h1 className="text-4xl md:text-5xl font-serif font-bold text-gray-900 dark:text-white mb-4 leading-tight">
                                            {t('browsing.careers.title')}
                                        </h1>

                                        {/* Page subtitle */}
                                        <p className="text-lg text-gray-600 dark:text-gray-400 mb-8" dangerouslySetInnerHTML={{ __html: t('browsing.careers.subtitle', { count: careers.length }) }}>
                                        </p>

                                        {/* Search bar section */}
                                        <div className="relative flex flex-col gap-4">
                                            <div className="flex gap-3">
                                                <div className="flex-1">
                                                    <SearchBar
                                                        value={searchTerm}
                                                        onChange={setSearchTerm}
                                                        placeholder={t('browsing.careers.searchPlaceholder')}
                                                    />
                                                </div>

                                                {/* Create button next to search - only for admins */}
                                                {isAdmin && (
                                                    <Link to="/careers/create">
                                                        <Button className="flex items-center gap-2 whitespace-nowrap h-full">
                                                            <Plus size={16} />
                                                            {t('browsing.careers.createNew')}
                                                        </Button>
                                                    </Link>
                                                )}
                                            </div>

                                            {/* Mobile filter toggle */}
                                            <button
                                                onClick={() => setIsSidebarOpen(true)}
                                                className="lg:hidden flex items-center justify-center px-4 py-3 bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-xl text-slate-700 dark:text-gray-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-gray-700 shadow-sm transition-all"
                                            >
                                                <FilterIcon className="w-4 h-4 mr-2" />
                                                {t('browsing.careers.filterBtn')}
                                            </button>
                                        </div>
                                    </ScrollRevelation>
                                </div>

                                {/* Right Side: Infographic Visuals */}
                                <div className="w-full lg:w-3/5 flex justify-center">
                                    <InfographicHeader
                                        type="careers"
                                        data={filteredCareers}
                                        loading={loading}
                                    />
                                </div>

                            </div>
                        </div>
                    </section >

                    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                        <div className="flex lg:gap-8">

                            {/* Sidebar (Desktop: Static, Mobile: Drawer) */}
                            <div className="hidden lg:block w-72 flex-shrink-0">
                                <CareerFilterSidebar
                                    filters={filters}
                                    setFilters={setFilters}
                                    isOpen={isSidebarOpen}
                                    onClose={() => setIsSidebarOpen(false)}
                                />
                            </div>

                            {/* Mobile drawer instance */}
                            <div className="lg:hidden">
                                <CareerFilterSidebar
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
                                            <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl h-80 animate-pulse border border-slate-200 dark:border-gray-700 p-6 flex flex-col">
                                                <div className="flex justify-between items-start mb-6">
                                                    <div className="w-12 h-12 bg-slate-100 dark:bg-gray-700 rounded-xl" />
                                                    <div className="w-16 h-6 bg-slate-100 dark:bg-gray-700 rounded-full" />
                                                </div>
                                                <div className="space-y-4 flex-1">
                                                    <div className="h-6 bg-slate-100 dark:bg-gray-700 rounded w-3/4" />
                                                    <div className="h-4 bg-slate-100 dark:bg-gray-700 rounded w-full" />
                                                    <div className="h-4 bg-slate-100 dark:bg-gray-700 rounded w-2/3" />
                                                </div>
                                                <div className="flex gap-2 mt-6">
                                                    <div className="h-6 w-20 bg-slate-100 dark:bg-gray-700 rounded-full" />
                                                    <div className="h-6 w-24 bg-slate-100 dark:bg-gray-700 rounded-full" />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : hasResults ? (
                                    <>
                                        {/* Group 1: Recommended */}
                                        {sections.recommended.length > 0 && (
                                            <section>
                                                <div className="flex items-center gap-2 mb-6">
                                                    <div className="p-1.5 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                                                        <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                                                    </div>
                                                    <h2 className="text-xl font-bold text-slate-800 dark:text-white">
                                                        {isAdmin ? t('browsing.careers.sections.recommendedAdmin') : t('browsing.careers.sections.recommendedUser')}
                                                    </h2>
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                                    {sections.recommended.map(career => (
                                                        <CareerCard
                                                            key={career.id}
                                                            career={career}
                                                            showAdminActions={isAdmin}
                                                            onQuickEdit={handleQuickEdit}
                                                        />
                                                    ))}
                                                </div>
                                            </section>
                                        )}

                                        {/* Group 2: Popular */}
                                        {sections.popular.length > 0 && (
                                            <section>
                                                <div className="flex items-center gap-2 mb-6">
                                                    <div className="p-1.5 bg-rose-100 dark:bg-rose-900/30 rounded-lg">
                                                        <Flame className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                                                    </div>
                                                    <h2 className="text-xl font-bold text-slate-800 dark:text-white">{t('browsing.careers.sections.popular')}</h2>
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                                    {sections.popular.map(career => (
                                                        <CareerCard
                                                            key={career.id}
                                                            career={career}
                                                            showAdminActions={isAdmin}
                                                            onQuickEdit={handleQuickEdit}
                                                        />
                                                    ))}
                                                </div>
                                            </section>
                                        )}

                                        {/* Group 3: Others / All */}
                                        {sections.others.length > 0 && (
                                            <section>
                                                {(sections.recommended.length > 0 || sections.popular.length > 0) && (
                                                    <div className="flex items-center gap-2 mb-6 pt-4 border-t border-slate-100 dark:border-gray-800">
                                                        <h2 className="text-xl font-bold text-slate-800 dark:text-white">{t('browsing.careers.sections.others')}</h2>
                                                    </div>
                                                )}
                                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                                    {sections.others.map(career => (
                                                        <CareerCard
                                                            key={career.id}
                                                            career={career}
                                                            showAdminActions={isAdmin}
                                                            onQuickEdit={handleQuickEdit}
                                                        />
                                                    ))}
                                                </div>
                                            </section>
                                        )}
                                    </>
                                ) : (
                                    <div className="text-center py-20">
                                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 dark:bg-gray-800 mb-4">
                                            <Search className="w-8 h-8 text-slate-400 dark:text-gray-500" />
                                        </div>
                                        <h3 className="text-lg font-medium text-slate-900 dark:text-white">{t('browsing.careers.empty.title')}</h3>
                                        <p className="text-slate-500 dark:text-gray-400 mt-2">{t('browsing.careers.empty.desc')}</p>

                                        {/* Clear all filters button to reset everything to default */}
                                        <button
                                            onClick={() => {
                                                setSearchTerm('');
                                                setFilters({ domains: [], outlooks: [] });
                                            }}
                                            className="mt-6 text-emerald-600 dark:text-emerald-400 font-semibold hover:text-emerald-700 dark:hover:text-emerald-300"
                                        >
                                            {t('browsing.careers.empty.clearFilters')}
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

export default CareerListingPage;