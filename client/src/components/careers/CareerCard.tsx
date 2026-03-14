// Career card component for the career listing page grid
import React, { useState } from 'react';
import { Career } from '../../types';
import { Briefcase, TrendingUp, DollarSign, ArrowRight, Edit, MoreVertical } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import SaveCareerButton from './SaveCareerButton';
import ArchiveButton from '../ui/ArchiveButton';
import { useSavedCareers } from '@/contexts/SavedCareersContext';

interface CareerCardProps {
    career: Career;
    showAdminActions?: boolean;
    onQuickEdit?: (career: Career) => void;
    archived?: boolean;
    onArchiveToggle?: (careerId: string) => void;
}

const CareerCard: React.FC<CareerCardProps> = ({
    career,
    showAdminActions = false,
    onQuickEdit,
    archived,
    onArchiveToggle,
}) => {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [showMenu, setShowMenu] = useState(false);
    const { isHydrated } = useSavedCareers();

    const outlookColor = {
        'High': 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800',
        'Medium': 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800',
        'Low': 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800',
    }[career.demand_level || 'Medium'];

    const formatSalary = (val?: number) => val ? `RM ${val.toLocaleString()}` : 'N/A';

    const handleCardClick = (e: React.MouseEvent) => {
        if ((e.target as HTMLElement).closest('.admin-action')) return;
        navigate(`/careers/${career.id}`);
    };

    const handleQuickEdit = (e: React.MouseEvent) => {
        e.stopPropagation();
        setShowMenu(false);
        onQuickEdit?.(career);
    };

    return (
        <div
            onClick={handleCardClick}
            className="group relative bg-white dark:bg-gray-900 rounded-2xl p-6 border border-slate-200 dark:border-gray-800 shadow-sm hover:shadow-xl dark:hover:shadow-gray-900/50 hover:-translate-y-1 transition-all duration-300 cursor-pointer overflow-hidden"
        >
            {/* Gradient Top Border */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500 dark:from-emerald-400 dark:to-teal-400 opacity-0 group-hover:opacity-100 transition-opacity" />

            <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl text-emerald-600 dark:text-emerald-400">
                    <Briefcase className="w-6 h-6" />
                </div>

                <div className="flex flex-col items-end gap-2">
                    {/* Demand level badge */}
                    <div className={`px-3 py-1 rounded-full text-xs font-semibold border ${outlookColor} flex items-center gap-1`}>
                        <TrendingUp className="w-3 h-3" />
                        {t('recommendations.demandLevel', '{{level}} Demand', { level: career.demand_level ? t(`visuals.demand.${career.demand_level}`, career.demand_level) : '' })}
                    </div>

                    {/* TOP RIGHT SECTION: Save button + Admin menu */}
                    <div className="flex items-center gap-1">
                        {/* Save button for all users */}
                        <div className="admin-action" onClick={(e) => e.stopPropagation()}>
                            <SaveCareerButton
                                careerId={career.id}
                                careerName={career.name}
                                savedCount={career.saved_count ?? 0}
                                disabled={!isHydrated}
                            />
                        </div>

                        {/* Admin menu */}
                        {showAdminActions && (
                            <div className="relative">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setShowMenu(!showMenu);
                                    }}
                                    className="admin-action p-1.5 hover:bg-slate-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                                    aria-label="Career actions"
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
                                            itemId={career.id}
                                            itemType="career"
                                            itemTitle={career.name}
                                            variant="button"
                                            archived={archived} // controlled prop
                                            onArchivedChange={() => onArchiveToggle?.(career.id)} // callback to parent
                                        />
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Industry type and career name */}
            <div className="mb-4">
                <div className="text-xs font-semibold text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                    {career.industry?.[0] ? t(`domains.tags.${career.industry[0].toLowerCase()}`, career.industry[0]) : ''}
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                    {t(`careers.items.${career.id}`, career.name)}
                </h3>
            </div>

            {/* Salary range + RIASEC */}
            <div className="space-y-3 mb-6">
                <div className="flex items-center text-slate-600 dark:text-gray-400 text-sm">
                    <DollarSign className="w-4 h-4 mr-2 text-slate-400 dark:text-gray-500" />
                    {formatSalary(career.salary_low)} - {formatSalary(career.salary_high)}
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 dark:text-gray-400 px-2 py-1 bg-slate-100 dark:bg-gray-800 rounded-md">
                        {t('careers.metrics.riasec', 'RIASEC')}: {career.riasec_code}
                    </span>
                </div>
            </div>

            {/* View details */}
            <div className="flex items-center text-emerald-600 dark:text-emerald-400 font-semibold text-sm group-hover:translate-x-1 transition-transform">
                {t('browsing.courses.viewDetails', 'View Details')} <ArrowRight className="w-4 h-4 ml-1" />
            </div>
        </div>
    );
};

export default CareerCard;