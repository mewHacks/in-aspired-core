import React from 'react';
import { MapPin, BookOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

// Props interface for CourseCard component
interface CourseCardProps {
    course: {
        id: string;
        title: string;
        level?: string;
        field_of_study?: string;
        institution?: {
            name: string;
        };
    };
}

/**
 * Compact course card for horizontal slider
 * Shows: Course Name, Field of Study, Institution
 * Features corner bracket hover effect
 */
const CourseCard: React.FC<CourseCardProps> = ({ course }) => {

    // Navigation hook for respective course details
    const navigate = useNavigate();
    const { t } = useTranslation();

    return (
        // Return JSX for course card
        <div
            onClick={() => navigate(`/courses/${course.id}`)}
            className="course-card flex-shrink-0 w-72 min-h-[180px] bg-white dark:bg-gray-900 rounded-xl border-2 border-gray-200 dark:border-gray-700 p-5 hover:shadow-lg dark:hover:shadow-gray-900/50 transition-all duration-300 cursor-pointer flex flex-col relative"
        >
            {/* Corner brackets - appear on hover */}
            <div className="corner-brackets opacity-0 transition-opacity duration-300">
                {/* Top-left */}
                <span className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-blue-500 dark:border-blue-400 rounded-tl-lg" />
                {/* Top-right */}
                <span className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-blue-500 dark:border-blue-400 rounded-tr-lg" />
                {/* Bottom-left */}
                <span className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-blue-500 dark:border-blue-400 rounded-bl-lg" />
                {/* Bottom-right */}
                <span className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-blue-500 dark:border-blue-400 rounded-br-lg" />
            </div>

            {/* Level Badge */}
            {course.level && (
                <span className={`inline-block w-fit px-2.5 py-0.5 rounded-full text-xs font-medium mb-3 ${
                    course.level === 'Foundation' 
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' 
                        : course.level === 'Diploma' 
                            ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400' 
                            : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                    }`}>
                    {t(`filters.levels.${course.level}`, course.level)}
                </span>
            )}

            {/* Course Title */}
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-3 line-clamp-2">
                {course.title.replace(/&/g, 'and')}
            </h3>

            {/* Field of Study */}
            {course.field_of_study && (
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-2">
                    <BookOpen className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                    <span className="line-clamp-1">{t(`domains.${course.field_of_study}`, course.field_of_study)}</span>
                </div>
            )}

            {/* Institution */}
            <div className="mt-auto">
                {course.institution && (
                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                        <MapPin className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                        <span className="line-clamp-1">{course.institution.name}</span>
                    </div>
                )}
            </div>

            {/* Hover styles */}
            <style>{`
                .course-card:hover .corner-brackets {
                    opacity: 1;
                }
            `}</style>
        </div>
    );
};

export default CourseCard;