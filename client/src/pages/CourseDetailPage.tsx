import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import Navbar from '../components/layout/Navbar';
import { DollarSign, BookOpen, ArrowLeft, Edit, Trash2, ArrowRight, Clock, MapPin, Calendar, Tag, Award, Archive } from 'lucide-react';
import QuickEditModal from '../components/courses/QuickEditModal';
import { fetchCourseById, fetchCareers, deleteCourse } from '../services/api';
import { Career, Course } from '../types';
import { useRoles } from '../hooks/useRoles';
import { useToast } from '../contexts/ToastContext';
import SaveCourseButton from '../components/courses/SaveCourseButton';
import ArchiveButton from '@/components/ui/ArchiveButton';
import { useTranslation } from 'react-i18next';
import { useConfirm } from '@/contexts/ConfirmContext';

// Course detail page which displays a single course
const CourseDetailPage: React.FC = () => {
    const { t } = useTranslation();
    const { confirm: confirmAction } = useConfirm();

    // Read URL and navigate 
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const { isAdmin } = useRoles();
    const toast = useToast();

    // Check where user came from
    const fromArchived = location.state?.from === 'archived';
    const fromSaved = location.state?.from === 'saved';

    // Derive back button destination and label
    const backTo = fromArchived ? '/admin/archived?tab=courses' : fromSaved ? '/saved?tab=courses' : '/courses';
    const backLabel = fromArchived ? t('courseDetail.backLabels.archived') : fromSaved ? t('courseDetail.backLabels.saved') : t('courseDetail.backLabels.courses');

    const [course, setCourse] = useState<Course | null>(null);
    const [careers, setCareers] = useState<Career[]>([]);
    const [loading, setLoading] = useState(true);

    // Modal states
    const [showQuickEditModal, setShowQuickEditModal] = useState(false);
    const [deleting] = useState(false);

    // Load career and courses data
    useEffect(() => {
        const loadData = async () => {
            if (!id) return;
            try {
                // Fetch course and all careers (for linking) in parallel
                const [courseData, careersData] = await Promise.all([
                    fetchCourseById(id),
                    fetchCareers()
                ]);
                setCourse(courseData);
                setCareers(careersData);
            } catch (error) {
                console.error("Failed to load data", error);
                toast.error(t('courseDetail.toast.loadFail'));
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [id]);

    const handleDeleteCourse = async () => {
        if (!id || !isAdmin) return;

        const confirmed = await confirmAction({
            title: t('common.warning'),
            message: t('courseDetail.confirmDelete', { title: course?.title }),
            variant: 'danger',
            confirmLabel: t('courseDetail.actions.delete')
        });

        if (confirmed) {
            try {
                await deleteCourse(id);
                toast.success(t('courseDetail.toast.deleteSuccess'));
                navigate('/courses');
            } catch (error) {
                console.error('Failed to delete course', error);
                toast.error(t('courseDetail.toast.deleteFail'));
            }
        }
    };

    // Refresh career data after quick edit
    const refreshCourseData = async () => {
        if (!id) return;
        try {
            const courseData = await fetchCourseById(id);
            setCourse(courseData);
        } catch (error) {
            console.error('Failed to refresh course data', error);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-gray-950 flex items-center justify-center pt-16">
                <div className="animate-pulse flex flex-col items-center">
                    <div className="h-4 w-32 bg-slate-200 dark:bg-gray-700 rounded mb-4"></div>
                    <div className="h-4 w-48 bg-slate-200 dark:bg-gray-700 rounded"></div>
                </div>
            </div>
        );
    }

    // If course not found, redirect to course listing page
    if (!course) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-gray-950 flex items-center justify-center">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{t('courseDetail.notFound.title')}</h2>
                    <button onClick={() => navigate('/courses')} className="mt-4 text-indigo-600 dark:text-indigo-400 hover:align-baseline">
                        {t('courseDetail.notFound.backBtn')}
                    </button>
                </div>
            </div>
        );
    }

    // Helper to format dates
    const formatDate = (dateStr?: string) => {
        if (!dateStr) return 'N/A';
        return new Date(dateStr).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    };

    return (
        <div className={`min-h-screen bg-slate-50 dark:bg-gray-950 font-sans pt-16 ${course.isArchived ? 'opacity-70' : ''}`}>

            {/* Navigation bar */}
            <Navbar />

            {/* Archived Banner */}
            {course.isArchived && (
                <div className="bg-gray-800 dark:bg-gray-900 text-white text-center py-2 text-sm font-medium flex items-center justify-center gap-2">
                    <Archive className="w-4 h-4" />
                    {t('courseDetail.archivedBanner')}
                </div>
            )}

            {/* Header backdrop */}
            <div className="bg-slate-900 dark:bg-gray-950 text-white pt-12 pb-24 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 to-slate-900 dark:from-indigo-950 dark:to-gray-950 opacity-90" />
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">

                    {/* TOP ACTION BAR */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                        {/* Back button - dynamic label and destination based on where user came from */}
                        <Link
                            to={backTo}
                            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm rounded-xl shadow-lg border border-gray-100 dark:border-gray-800 hover:shadow-xl hover:bg-white dark:hover:bg-gray-800 transition-all duration-200 group hover:scale-[1.02] active:scale-95"
                        >
                            <ArrowLeft className="h-5 w-5 text-gray-700 dark:text-gray-300 group-hover:-translate-x-0.5 transition-transform" />
                            <span className="font-medium text-gray-700 dark:text-gray-300">{backLabel}</span>
                        </Link>

                        {/* Right side buttons */}
                        <div className="flex flex-wrap gap-3">
                            {/* Save button for ALL users - disabled when archived */}
                            <SaveCourseButton
                                courseId={course.id}
                                courseName={course.title}
                                variant="button"
                                disabled={course.isArchived}
                            />

                            {/* Admin buttons on right - Only show if admin */}
                            {isAdmin && (
                                <div className="flex gap-3">
                                    {/* QUICK EDIT BUTTON - disabled when archived */}
                                    <button
                                        onClick={() => !course.isArchived && setShowQuickEditModal(true)}
                                        disabled={course.isArchived}
                                        className="flex items-center gap-2 px-4 py-2.5 text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-800 rounded-xl hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <Edit size={18} />
                                        {t('courseDetail.actions.quickEdit')}
                                    </button>

                                    {/* DELETE BUTTON */}
                                    <button
                                        onClick={handleDeleteCourse}
                                        disabled={deleting}
                                        className="flex items-center gap-2 px-4 py-2.5 text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/30 hover:bg-rose-100 dark:hover:bg-rose-900/50 border border-rose-200 dark:border-rose-800 rounded-xl hover:border-rose-300 dark:hover:border-rose-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                                    >
                                        {deleting ? (
                                            <>
                                                <div className="w-4 h-4 border-2 border-rose-700 dark:border-rose-400 border-t-transparent rounded-full animate-spin"></div>
                                                {t('courseDetail.actions.deleting')}
                                            </>
                                        ) : (
                                            <>
                                                <Trash2 size={18} />
                                                {t('courseDetail.actions.delete')}
                                            </>
                                        )}
                                    </button>

                                    {/* ARCHIVE BUTTON */}
                                    <ArchiveButton
                                        itemId={course.id}
                                        itemType="course"
                                        itemTitle={course.title}
                                        variant="button"
                                        archived={course.isArchived}
                                        onArchivedChange={() => navigate('/courses')}
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Course header info */}
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <span className="bg-indigo-500/20 dark:bg-indigo-500/30 text-indigo-200 dark:text-indigo-300 border border-indigo-500/30 dark:border-indigo-500/40 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide">
                                    {course.level}
                                </span>
                                <span className="text-slate-400 dark:text-slate-500 text-sm font-medium border-l border-slate-700 dark:border-slate-700 pl-3">
                                    {course.mqa_code ? t('courseDetail.labels.mqa', { code: course.mqa_code }) : t('courseDetail.labels.mqa', { code: t('courseDetail.labels.na') })}
                                </span>
                            </div>
                            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">{course.title}</h1>
                            <p className="text-xl text-slate-300 dark:text-slate-400 font-medium">{course.institutionId.toUpperCase()}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main content card */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-16 pb-20 relative z-20">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* Left column: Main info */}
                    <div className="lg:col-span-2 space-y-8">

                        {/* Overview card */}
                        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-slate-200 dark:border-gray-800 p-8">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center">
                                <BookOpen className="w-5 h-5 mr-2 text-indigo-600 dark:text-indigo-400" />
                                {t('courseDetail.labels.overview')}
                            </h2>
                            <p className="text-slate-600 dark:text-gray-400 leading-relaxed text-lg">
                                {t(`courses.descriptions.${course.id}`, course.description)}
                            </p>

                            <div className="mt-8 pt-8 border-t border-slate-100 dark:border-gray-800">
                                <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wide mb-4">{t('courseDetail.labels.learnAbout')}</h3>
                                <div className="flex flex-wrap gap-2">
                                    {course.domainIds.map((domain) => (
                                        <span key={domain} className="px-3 py-1.5 bg-slate-100 dark:bg-gray-800 text-slate-700 dark:text-gray-300 rounded-lg text-sm font-medium capitalize">
                                            {t(`domains.tags.${domain.toLowerCase()}`, domain.replace('_', ' '))}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Career pathways card with clickable career names */}
                        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-slate-200 dark:border-gray-800 p-8">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center">
                                <Award className="w-5 h-5 mr-2 text-indigo-600 dark:text-indigo-400" />
                                {t('courseDetail.labels.careerOpps')}
                            </h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {course.careers.map((careerName, idx) => {
                                    // Try to find a matching career in the database
                                    // Use case-insensitive matching for robustness
                                    const matchedCareer = careers.find(c =>
                                        c.name.toLowerCase() === careerName.toLowerCase() ||
                                        // Also try matching part of the name if exact match fails
                                        c.name.toLowerCase().includes(careerName.toLowerCase()) ||
                                        careerName.toLowerCase().includes(c.name.toLowerCase())
                                    );

                                    return matchedCareer ? (
                                        <Link
                                            key={idx}
                                            to={`/careers/${matchedCareer.id}`}
                                            className="flex items-center p-3 bg-indigo-50/50 dark:bg-indigo-900/20 rounded-lg border border-indigo-100 dark:border-indigo-800 text-indigo-900 dark:text-indigo-300 font-medium hover:bg-indigo-100/80 dark:hover:bg-indigo-900/40 hover:border-indigo-200 dark:hover:border-indigo-700 hover:shadow-sm transition-all group"
                                        >
                                            <div className="w-2 h-2 rounded-full bg-indigo-500 dark:bg-indigo-400 mr-3 group-hover:bg-indigo-600 dark:group-hover:bg-indigo-300 transition-colors" />
                                            {t(`careers.items.${matchedCareer.id}`, matchedCareer.name)}
                                            <ArrowRight className="w-3.5 h-3.5 ml-auto text-indigo-400 dark:text-indigo-500 group-hover:text-indigo-600 dark:group-hover:text-indigo-300 opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
                                        </Link>
                                    ) : (
                                        <div key={idx} className="flex items-center p-3 bg-indigo-50/50 dark:bg-indigo-900/20 rounded-lg border border-indigo-100 dark:border-indigo-800 text-indigo-900 dark:text-indigo-300 font-medium opacity-80">
                                            <div className="w-2 h-2 rounded-full bg-slate-400 dark:bg-slate-600 mr-3" />
                                            {t(`careers.unmatched.${careerName}`, careerName)}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                    </div>

                    {/* Right column: Key details sidebar */}
                    <div className="lg:col-span-1 space-y-6">

                        {/* Program details card */}
                        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg border border-slate-100 dark:border-gray-800 overflow-hidden">
                            <div className="p-6 bg-slate-50 dark:bg-gray-800 border-b border-slate-100 dark:border-gray-700">
                                <h3 className="font-bold text-slate-900 dark:text-white">{t('courseDetail.labels.programDetails')}</h3>
                            </div>
                            <div className="p-6 space-y-6">

                                <div className="flex items-start">
                                    <Clock className="w-5 h-5 text-slate-400 dark:text-gray-500 mt-0.5 mr-3" />
                                    <div>
                                        <p className="text-sm text-slate-500 dark:text-gray-400 font-medium">{t('courseDetail.labels.duration')}</p>
                                        <p className="text-slate-900 dark:text-white font-semibold">
                                            {/^\d+(\.\d+)?$/.test(String(course.duration_year).trim())
                                                ? t('courseDetail.labels.year', { count: Number(course.duration_year) })
                                                : course.duration_year}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-start">
                                    <DollarSign className="w-5 h-5 text-slate-400 dark:text-gray-500 mt-0.5 mr-3" />
                                    <div>
                                        <p className="text-sm text-slate-500 dark:text-gray-400 font-medium">{t('courseDetail.labels.cost')}</p>
                                        <p className="text-slate-900 dark:text-white font-semibold">{course.cost_level}</p>
                                    </div>
                                </div>

                                <div className="flex items-start">
                                    <MapPin className="w-5 h-5 text-slate-400 dark:text-gray-500 mt-0.5 mr-3" />
                                    <div>
                                        <p className="text-sm text-slate-500 dark:text-gray-400 font-medium">{t('courseDetail.labels.campuses')}</p>
                                        <p className="text-slate-900 dark:text-white font-semibold">{course.campuses.join(', ')}</p>
                                    </div>
                                </div>

                                <div className="flex items-start">
                                    <Calendar className="w-5 h-5 text-slate-400 dark:text-gray-500 mt-0.5 mr-3" />
                                    <div>
                                        <p className="text-sm text-slate-500 dark:text-gray-400 font-medium">{t('courseDetail.labels.accreditation')}</p>
                                        <p className="text-sm text-slate-900 dark:text-white">{formatDate(course.accredited_from)} - {formatDate(course.accredited_to)}</p>
                                    </div>
                                </div>

                                <div className="pt-6 border-t border-slate-100 dark:border-gray-800">
                                    {/* Apply Now - disabled when archived */}
                                    <button
                                        onClick={() => !course.isArchived && window.open(course.apply_url || '#', '_blank')}
                                        disabled={course.isArchived}
                                        className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors shadow-lg shadow-indigo-200 dark:shadow-indigo-950/30 disabled:cursor-not-allowed"
                                    >
                                        {t('courseDetail.labels.applyNow')}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Tags card */}
                        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-slate-200 dark:border-gray-800 p-6">
                            <h3 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center text-sm uppercase tracking-wide">
                                <Tag className="w-4 h-4 mr-2" />
                                {t('courseDetail.labels.highlights')}
                            </h3>
                            <div className="flex flex-wrap gap-2">
                                {course.tags.map((tag, idx) => (
                                    <span key={idx} className="bg-slate-100 dark:bg-gray-800 text-slate-600 dark:text-gray-400 px-3 py-1 rounded-full text-sm font-medium">
                                        {t(`courses.tags.${tag}`, tag)}
                                    </span>
                                ))}
                            </div>
                        </div>

                    </div>
                </div>
            </main>

            {/* QUICK EDIT MODAL */}
            {isAdmin && (
                <QuickEditModal
                    course={course}
                    isOpen={showQuickEditModal}
                    onClose={() => setShowQuickEditModal(false)}
                    onSaveSuccess={() => {
                        refreshCourseData();
                        toast.success(t('courseDetail.toast.updateSuccess'));
                    }}
                />
            )}
        </div>
    );
};

export default CourseDetailPage;