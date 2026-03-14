import React, { useState } from 'react';
import { Course } from '../../types';
import { MapPin, Clock, DollarSign, ArrowRight, BookOpen, MoreVertical, Edit } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import SaveCourseButton from './SaveCourseButton';
import ArchiveButton from '../ui/ArchiveButton';
import { useSavedCourses } from '@/contexts/SavedCoursesContext';
import { useTranslation } from 'react-i18next';

// Course card for listing page

interface CourseCardProps {
    course: Course;
    showAdminActions?: boolean;
    onQuickEdit?: (course: Course) => void;
    archived?: boolean;
    onArchiveToggle?: (courseId: string) => void; // callback when toggled
}

const CourseCard: React.FC<CourseCardProps> = ({
    course,
    showAdminActions = false,
    onQuickEdit,
    archived,
    onArchiveToggle,
}) => {
    const navigate = useNavigate();
    const [showMenu, setShowMenu] = useState(false);
    const { isHydrated } = useSavedCourses();
    const { t } = useTranslation();

    // Helper to format cost color/badge based on level
    const costColor = (level: string) => {
        if (level.includes('<')) return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30';
        if (level.includes('>')) return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30';
        return 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/30';
    };

    const handleCardClick = (e: React.MouseEvent) => {
        // Don't navigate if clicking save button
        if ((e.target as HTMLElement).closest('.admin-action')) {
            return;
        }
        navigate(`/courses/${course.id}`);
    };

    // Quick Edit Handler
    const handleQuickEdit = (e: React.MouseEvent) => {
        e.stopPropagation();
        setShowMenu(false);
        onQuickEdit?.(course);
    };

    return (
        <div
            onClick={handleCardClick}
            className="group relative bg-white dark:bg-gray-900 rounded-2xl p-6 border border-slate-200 dark:border-gray-800 shadow-sm hover:shadow-xl dark:hover:shadow-gray-900/50 hover:-translate-y-1 transition-all duration-300 cursor-pointer overflow-hidden flex flex-col h-full"
        >
            {/* Gradient Top Border */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 to-violet-500 dark:from-indigo-400 dark:to-violet-400 opacity-0 group-hover:opacity-100 transition-opacity" />

            {/* Header: Icon + Badge + Save */}
            <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl text-indigo-600 dark:text-indigo-400">
                    <BookOpen className="w-6 h-6" />
                </div>

                <div className="flex flex-col items-end gap-2">
                    <div className={`px-3 py-1 rounded-full text-xs font-semibold border flex items-center gap-1 ${costColor(course.cost_level)}`}>
                        <DollarSign className="w-3 h-3" />
                        {t(`filters.costs.${course.cost_level}`, course.cost_level)}
                    </div>

                    <div className="flex items-center gap-1">
                        {/* Save button */}
                        <div className="admin-action" onClick={(e) => e.stopPropagation()}>
                            <SaveCourseButton
                                courseId={course.id}
                                courseName={course.title}
                                disabled={!isHydrated}
                            />
                        </div>

                        {/* ADMIN ACTIONS MENU - ONLY Quick Edit + Archive */}
                        {showAdminActions && (
                            <div className="relative">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setShowMenu(!showMenu);
                                    }}
                                    className="admin-action p-1.5 hover:bg-slate-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                                    aria-label="Course actions"
                                >
                                    <MoreVertical className="w-4 h-4 text-slate-500 dark:text-gray-400" />
                                </button>

                                {showMenu && (
                                    <div
                                        className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-slate-200 dark:border-gray-800 py-2 z-10"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        {/* Quick Edit Option */}
                                        <button
                                            onClick={handleQuickEdit}
                                            className="w-full flex items-center gap-3 px-4 py-3 text-slate-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors text-left"
                                        >
                                            <Edit size={16} />
                                            <span>Quick Edit</span>
                                        </button>

                                        {/* Archive/Restore Option */}
                                        <ArchiveButton
                                            itemId={course.id}
                                            itemType="course"
                                            itemTitle={course.title}
                                            variant="button"
                                            archived={archived} // controlled by prop
                                            onArchivedChange={() => onArchiveToggle?.(course.id)} // call parent toggle
                                        />
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Title Section */}
            <div className="mb-4 flex-1">
                <div className="text-xs font-semibold text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-1 line-clamp-1">
                    {course.institutionId}
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white group-hover:text-indigo-700 dark:group-hover:text-indigo-400 transition-colors line-clamp-2">
                    {course.title}
                </h3>
            </div>

            {/* Details Section */}
            <div className="space-y-3 mb-6">
                <div className="flex items-center text-slate-600 dark:text-gray-400 text-sm">
                    <Clock className="w-4 h-4 mr-2 text-slate-400 dark:text-gray-500" />
                    {/^\d+(\.\d+)?$/.test(String(course.duration_year).trim())
                        ? t('browsing.courses.durationYears', '{{count}} years', { count: Number(course.duration_year) })
                        : course.duration_year}
                </div>
                <div className="flex items-center text-slate-600 dark:text-gray-400 text-sm">
                    <MapPin className="w-4 h-4 mr-2 text-slate-400 dark:text-gray-500" />
                    <span className="line-clamp-1">{course.campuses.join(', ')}</span>
                </div>
                <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs text-slate-500 dark:text-gray-400 px-2 py-1 bg-slate-100 dark:bg-gray-800 rounded-md">
                        {t(`filters.levels.${course.level}`, course.level)}
                    </span>
                </div>
            </div>

            {/* Footer Action */}
            <div className="flex items-center text-indigo-600 dark:text-indigo-400 font-semibold text-sm group-hover:translate-x-1 transition-transform mt-auto">
                {t('browsing.courses.viewDetails', 'View Details')} <ArrowRight className="w-4 h-4 ml-1" />
            </div>
        </div>
    );
};

export default CourseCard;