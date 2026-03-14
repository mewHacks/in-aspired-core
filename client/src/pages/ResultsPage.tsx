import React, { useState, useEffect } from 'react';
import { useLocation, Navigate, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import { InterestDomain, Course, RiasecScore } from '../types';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Briefcase, BookOpen, ChevronDown, ChevronUp } from 'lucide-react';
import ScrollRevelation from '@/components/ui/ScrollRevelation';
import RiasecRadar from '@/components/visuals/RiasecRadar';
import { httpClient } from '../services/httpClient';
import HorizontalSlider from '../components/ui/HorizontalSlider';
import CourseCard from '../components/recommendations/CourseCard';
import CareerCard from '../components/recommendations/CareerCard';
import PremiumAnalysisSection from '../components/recommendations/PremiumAnalysisSection';
import { useTranslation } from 'react-i18next';

// Defines the core result payload from quiz logic
interface ResultsState {
    rankedDomains: (InterestDomain & { affinityScore: number })[];
    topDomains: InterestDomain[];
    recommendedCourses: Course[];
}

// Defines the complete payload the page needs to render
interface LocationState {
    results: ResultsState;
    scores: RiasecScore[];
}

// Main result page component that loads results
const ResultsPage: React.FC = () => {
    const { t } = useTranslation();
    const location = useLocation();
    const navigate = useNavigate();

    // Creates a user-specific localStorage key to prevent data collision between users
    const getUserStorageKey = () => {
        try {
            const userStr = localStorage.getItem('user') || sessionStorage.getItem('user');
            if (userStr) {
                const user = JSON.parse(userStr);
                return `resultsPersistence_${user.id || user._id}`;
            }
        } catch (e) {
            console.warn('Failed to parse user for storage key');
        }
        return 'resultsPersistence_guest'; // Fallback to a guest key
    };

    // 1. State initialization (lazy initializer, runs once on mount)
    // We try to find the results in 3 places, in this order (a to c):
    // a. Navigation state (fresh quiz result)
    // b. LocalStorage (if user refreshed or revisit the page) - scoped by user ID
    // c. MongoDB (if user logged in on a new device) - handled in effect below
    const [state, setState] = useState<LocationState | null>(() => {

        // a. Navigation state, which is fastest source 
        if (location.state && (location.state as LocationState).results) {
            return location.state as LocationState;
        }

        // b. LocalStorage fallback, which handles user page refreshes and revisits
        const storageKey = getUserStorageKey();
        const persisted = localStorage.getItem(storageKey);

        // If cannot find return null so it can trigger backend fetch in MongoDB later
        if (persisted) {
            try {
                return JSON.parse(persisted);
            } catch (e) {
                console.error('Failed to parse persisted results', e);
                return null;
            }
        }
        return null; // Will trigger fetch in useEffect
    });

    const [showRetakeModal, setShowRetakeModal] = useState(false);

    // Matched careers state (from RIASEC vector matching)
    const [matchedCareers, setMatchedCareers] = useState<Array<{
        career: {
            id: string;
            name: string;
            riasec_code: string;
            related_domains?: string[];
            demand_level?: string;
        };
        similarity: number;
    }>>([]);
    const [careersLoading, setCareersLoading] = useState(false);

    // Loading state
    const [isLoading, setIsLoading] = useState(!state); // If data is not found immediately, show loading state

    // 2. Data fetching effect from backend (MongoDB fallback)
    // If we still don't have state (e.g. clear cache), try hitting the DB
    React.useEffect(() => { // Only runs if state is missing
        const initializeData = async () => {

            if (!state) {
                // c. MongoDB fallback, which supports cross-device login
                try {
                    console.log('ResultsPage: Fetching from DB...');
                    const res = await httpClient('/api/latest');
                    if (res.ok) {
                        const data = await res.json();
                        // Data shape: { results: {...}, scores: [...] }
                        setState(data);
                        // Cache it immediately so refreshes are fast
                        const storageKey = getUserStorageKey();
                        localStorage.setItem(storageKey, JSON.stringify(data));
                    } else {
                        console.log('ResultsPage: No results found in DB (or not logged in)');
                    }
                } catch (err) {
                    console.error('Failed to fetch from DB', err);
                }

                // Done loading attempt
                setIsLoading(false);

            } else if (location.state) { // Immediate caching on navigation
                // If we just arrived, save to localStorage immediately
                const storageKey = getUserStorageKey();
                localStorage.setItem(storageKey, JSON.stringify(location.state));
                setIsLoading(false);
            }
        };

        if (!state) {
            initializeData();
        }
    }, [location.state, state]);

    // Sync effect to keep cache updated so any state update stays persisted
    React.useEffect(() => {
        if (state) {
            const storageKey = getUserStorageKey();
            localStorage.setItem(storageKey, JSON.stringify(state));
        }
    }, [state]);

    // Fetch matched careers when scores are available
    useEffect(() => {
        const fetchMatchedCareers = async () => {

            // If no scores, do nothing
            if (!state?.scores || state.scores.length === 0) return;

            // Set loading state
            setCareersLoading(true);

            try {
                // Fetch matched careers from backend
                const res = await httpClient('/api/careers/match', {
                    method: 'POST',
                    body: JSON.stringify({ scores: state.scores })
                });

                // If successful, update state
                if (res.ok) {
                    const data = await res.json();
                    setMatchedCareers(data.careers || []);
                }
            } catch (error) { // Error handling
                console.error('Failed to fetch matched careers:', error);
            } finally { // Always clear loading indicator
                setCareersLoading(false);
            }
        };

        // Fetch matched careers
        fetchMatchedCareers();

    }, [state?.scores]);

    // Guard clauses to prevent broken UI

    // Show loading screen while loading

    if (isLoading) {
        return (
            <div className="min-h-screen bg-white dark:bg-gray-950 flex flex-col">
                <Navbar />
                <div className="flex-1 flex items-center justify-center">
                    <div className="animate-pulse flex flex-col items-center">
                        <div className="h-12 w-12 bg-gray-200 dark:bg-gray-800 rounded-full mb-4"></div>
                        <div className="h-4 w-48 bg-gray-200 dark:bg-gray-800 rounded"></div>
                    </div>
                </div>
            </div>
        );
    }

    // Redirect to personality test if no result data found
    if (!state || !state.results) {
        return <Navigate to="/personality-test" replace />;
    }

    const { topDomains, recommendedCourses } = state.results;
    const scores = state.scores;

    // Set up expandable explanation below each domain
    const ExplanationText = ({ text, domainId }: { text?: string, domainId: string }) => {
        const [isExpanded, setIsExpanded] = useState(false);

        if (!text) {
            return null;
        }

        return (
            <div className={`transition-all duration-300 ${isExpanded ? 'bg-indigo-50/50 dark:bg-indigo-900/20 p-4 rounded-xl' : ''}`}>

                {/* Expandable button, click to show more explanation for each domain */}
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="flex items-center gap-2 text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 transition-colors w-full group"
                >
                    {isExpanded ? (
                        <>{t('results.hideAnalysis', 'Hide Analysis')} <ChevronUp className="w-4 h-4" /></>
                    ) : (
                        <>
                            <span className="border-b border-indigo-200 dark:border-indigo-800 group-hover:border-indigo-500 dark:group-hover:border-indigo-400">
                                {t('results.whyThisFits', 'Why this fits you')}
                            </span>
                            <ChevronDown className="w-4 h-4" />
                        </>
                    )}
                </button>

                <div className={`overflow-hidden transition-all duration-300 ${isExpanded ? 'max-h-40 opacity-100 mt-3' : 'max-h-0 opacity-0'}`}>
                    <p className="text-sm text-indigo-900 dark:text-indigo-300 italic leading-relaxed">
                        "{t(`core.domains.matchExplanation.${domainId}`, text)}"
                    </p>
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-white dark:bg-gray-950 relative">
            {/* Confirmation Modal */}
            <AnimatePresence>
                {showRetakeModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 dark:bg-black/70 backdrop-blur-sm p-4"
                        onClick={() => setShowRetakeModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            onClick={(e: React.MouseEvent) => e.stopPropagation()}
                            className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-8 max-w-sm w-full text-center border border-gray-100 dark:border-gray-800"
                        >
                            <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Briefcase className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                            </div>
                            <h3 className="text-xl font-serif font-bold text-gray-900 dark:text-gray-100 mb-2">
                                {t('results.retakeModalTitle', 'Retake Assessment?')}
                            </h3>
                            <p className="text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">
                                {t('results.retakeModalDesc', 'This will start a fresh personality test. Your current results will be replaced if you save the new ones.')}
                            </p>
                            <div className="flex flex-col gap-3">
                                <Button
                                    variant="primary"
                                    onClick={() => navigate('/personality-test', { state: { retake: true } })}
                                    className="w-full justify-center"
                                >
                                    {t('results.retakeConfirm', 'Yes, Start Over')}
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => setShowRetakeModal(false)}
                                    className="w-full justify-center border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                                >
                                    {t('results.cancel', 'Cancel')}
                                </Button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <Navbar />

            <main className="pt-32 pb-24">

                {/* Header */}
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-12 text-center">
                    <ScrollRevelation>
                        <h1 className="text-4xl md:text-5xl font-serif font-bold text-gray-900 dark:text-gray-100 mb-6">
                            {t('results.title', 'Your Personalised Roadmap')}
                        </h1>
                        <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto mb-8">
                            {t('results.subtitle', "Based on your personality profile, here are the fields and courses where you'll naturally thrive.")}
                        </p>

                        {/* Radar chart section */}
                        <div className="max-w-3xl mx-auto bg-white dark:bg-gray-900 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-800 p-8 mb-12">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-6">
                                {t('results.personalityProfile', 'Your Personality Profile')}
                            </h3>
                            {scores && <RiasecRadar scores={scores} />}
                        </div>
                    </ScrollRevelation>
                </div>

                {/* Top interests section */}
                <section className="mb-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <ScrollRevelation delay={0.1}>
                        <HorizontalSlider
                            title={t('results.topDomains', 'Your Top Interest Domains')}
                            titleColor="bg-indigo-500 dark:bg-indigo-600"
                        >
                            {topDomains.map((domain, index) => (
                                <Card
                                    key={domain.id}
                                    className="flex-shrink-0 w-[280px] xs:w-80 md:w-96 relative p-6 xs:p-8 h-full flex flex-col hover:-translate-y-1 transition-all duration-300 hover:shadow-2xl border-t-4 border-t-indigo-500 dark:border-t-indigo-400 bg-white dark:bg-gray-900 group whitespace-normal"
                                >
                                    <div className="absolute top-4 right-4 text-xs font-bold tracking-wider text-indigo-300 dark:text-indigo-600 group-hover:text-indigo-500 dark:group-hover:text-indigo-400 transition-colors">
                                        {t('results.match', 'MATCH #{{num}}', { num: index + 1 })}
                                    </div>

                                    <h3 className="text-2xl font-serif font-bold text-gray-900 dark:text-gray-100 mb-4 mt-2 group-hover:text-indigo-700 dark:group-hover:text-indigo-400 transition-colors">
                                        {t(`domains.${domain.id}`, domain.label.replace(/&/g, 'and'))}
                                    </h3>

                                    <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-6 flex-grow">
                                        {t(`core.domains.desc.${domain.id}`, domain.description)}
                                    </p>

                                    <div className="border-t border-gray-100 dark:border-gray-800 pt-4 mt-auto">
                                        <ExplanationText text={domain.matchExplanation} domainId={domain.id} />
                                    </div>
                                </Card>
                            ))}
                        </HorizontalSlider>
                    </ScrollRevelation>
                </section>

                {/* Recommended Courses Section - Horizontal Slider */}
                <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-16">
                    <ScrollRevelation delay={0.2}>
                        <HorizontalSlider
                            title={t('results.recommendedCourses', 'Recommended Courses')}
                            titleColor="bg-blue-500 dark:bg-blue-600"
                            viewMoreLink="/courses"
                            viewMoreText={t('results.viewMoreCourses', 'Want to view more courses?')}
                        >
                            {recommendedCourses.length > 0 ? (
                                recommendedCourses.slice(0, 6).map((course) => (
                                    <CourseCard key={course.id} course={course} />
                                ))
                            ) : (
                                <div className="flex-shrink-0 w-full text-center py-12 bg-gray-50 dark:bg-gray-800/50 rounded-xl border-dashed border-2 border-gray-200 dark:border-gray-700">
                                    <BookOpen className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                                        {t('results.noCoursesTitle', 'No specific courses found just yet.')}
                                    </h3>
                                    <p className="text-gray-500 dark:text-gray-400">
                                        {t('results.noCoursesDesc', 'Try adjusting your profile or explore our full catalog.')}
                                    </p>
                                </div>
                            )}
                        </HorizontalSlider>
                    </ScrollRevelation>
                </section>

                {/* Top Careers Section - Horizontal Slider */}
                <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-16">
                    <ScrollRevelation delay={0.3}>
                        <HorizontalSlider
                            title={t('results.topCareers', 'Top Careers For You')}
                            titleColor="bg-purple-500 dark:bg-purple-600"
                            viewMoreLink="/careers"
                            viewMoreText={t('results.viewMoreCareers', 'Want to view more careers?')}
                        >
                            {careersLoading ? (
                                <div className="flex gap-5">
                                    {[1, 2, 3].map((i) => (
                                        <div key={i} className="flex-shrink-0 w-72 h-40 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
                                    ))}
                                </div>
                            ) : matchedCareers.length > 0 ? (
                                matchedCareers.map(({ career, similarity }) => (
                                    <CareerCard key={career.id} career={career} similarity={similarity} />
                                ))
                            ) : (
                                <div className="flex-shrink-0 w-full text-center py-12 bg-gray-50 dark:bg-gray-800/50 rounded-xl border-dashed border-2 border-gray-200 dark:border-gray-700">
                                    <Briefcase className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                                        {t('results.noCareersTitle', 'No matched careers yet.')}
                                    </h3>
                                    <p className="text-gray-500 dark:text-gray-400">
                                        {t('results.noCareersDesc', 'Complete the personality test to see career recommendations.')}
                                    </p>
                                </div>
                            )}
                        </HorizontalSlider>
                    </ScrollRevelation>
                </section>

                {/* Premium Analysis Section */}
                <PremiumAnalysisSection />

                {/* Retake personality test button */}
                <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12">
                    <div className="text-center">
                        <Button
                            variant="outline"
                            size="lg"
                            onClick={() => setShowRetakeModal(true)}
                            className="border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 hover:border-gray-400 dark:hover:border-gray-600 transition-all"
                        >
                            {t('results.retakeTest', 'Retake Personality Test')}
                        </Button>
                    </div>
                </section>
            </main>

            <Footer />
        </div>
    );
};

export default ResultsPage;