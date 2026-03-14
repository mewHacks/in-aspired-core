// Filter sidebar for narrowing course listings by level, cost, type, etc.
import React from 'react';
import { Filter, X } from 'lucide-react';
import { EducationLevel } from '../../types';
import { DOMAIN_OPTIONS } from '../../data/domains';
import { useTranslation } from 'react-i18next';

interface FilterSidebarProps {
    filters: FilterState;
    setFilters: (filters: FilterState) => void;
    isOpen: boolean; // For mobile responsive toggling
    onClose: () => void;
}

export interface FilterState {
    levels: EducationLevel[];
    domains: string[];
    costLevels: string[];
    types: string[]; // Public/Private
}
const CourseFilterSidebar: React.FC<FilterSidebarProps> = ({ filters, setFilters, isOpen, onClose }) => {
    const { t } = useTranslation();

    const toggleFilter = (section: keyof FilterState, value: string) => {
        const current = filters[section] as string[];
        const updated = current.includes(value)
            ? current.filter(item => item !== value)
            : [...current, value];

        setFilters({ ...filters, [section]: updated });
    };

    const isChecked = (section: keyof FilterState, value: string) => {
        return (filters[section] as string[]).includes(value);
    };

    // Filter Options Data
    const levels: EducationLevel[] = ['Foundation', 'Diploma', 'General Pre-U'];
    const costs = ['< RM 20k', 'RM 20k - 50k', '> RM 50k'];
    const types = ['Public', 'Private'];

    return (
        <>
            {/* Backdrop for Mobile */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 dark:bg-black/70 z-40 lg:hidden"
                    onClick={onClose}
                />
            )}

            {/* Sidebar Container */}
            <aside className={`
                fixed top-0 left-0 bottom-0 z-[60] w-72 bg-white dark:bg-gray-900 border-r border-slate-200 dark:border-gray-800 transform transition-transform duration-300 ease-in-out overflow-y-auto
                lg:translate-x-0 lg:static lg:h-auto lg:shadow-none
                ${isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}
            `}>
                <div className="p-6">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-2 text-slate-800 dark:text-white font-bold text-lg">
                            <Filter className="w-5 h-5" />
                            <span>{t('filters.title', 'Filters')}</span>
                        </div>
                        <button onClick={onClose} className="lg:hidden text-slate-400 dark:text-gray-500 hover:text-slate-600 dark:hover:text-gray-300">
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Filter Sections */}
                    <div className="space-y-8">

                        {/* Domains (Scrollable) */}
                        <section>
                            <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-3 uppercase tracking-wider">{t('filters.fieldOfStudy', 'Field of Study')}</h4>
                            <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                                {DOMAIN_OPTIONS.map(domain => (
                                    <label key={domain.id} className="flex items-center gap-3 cursor-pointer group">
                                        <div className="relative flex items-center">
                                            <input
                                                type="checkbox"
                                                className="peer appearance-none w-5 h-5 border-2 border-slate-300 dark:border-gray-600 rounded checked:bg-indigo-600 checked:border-indigo-600 dark:checked:bg-indigo-500 dark:checked:border-indigo-500 transition-colors"
                                                checked={isChecked('domains', domain.id)}
                                                onChange={() => toggleFilter('domains', domain.id)}
                                            />
                                            <svg className="absolute w-3.5 h-3.5 text-white left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 peer-checked:opacity-100 pointer-events-none" viewBox="0 0 14 14" fill="none">
                                                <path d="M3 8L6 11L11 3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                        </div>
                                        <span className="text-slate-600 dark:text-gray-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors text-sm">{t(`domains.${domain.id}`, domain.label)}</span>
                                    </label>
                                ))}
                            </div>
                        </section>

                        {/* Education Level */}
                        <section>
                            <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-3 uppercase tracking-wider">{t('filters.level', 'Level')}</h4>
                            <div className="space-y-2">
                                {levels.map(level => (
                                    <label key={level} className="flex items-center gap-3 cursor-pointer group">
                                        <div className="relative flex items-center">
                                            <input
                                                type="checkbox"
                                                className="peer appearance-none w-5 h-5 border-2 border-slate-300 dark:border-gray-600 rounded checked:bg-indigo-600 checked:border-indigo-600 dark:checked:bg-indigo-500 dark:checked:border-indigo-500 transition-colors"
                                                checked={isChecked('levels', level)}
                                                onChange={() => toggleFilter('levels', level)}
                                            />
                                            <svg className="absolute w-3.5 h-3.5 text-white left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 peer-checked:opacity-100 pointer-events-none" viewBox="0 0 14 14" fill="none">
                                                <path d="M3 8L6 11L11 3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                        </div>
                                        <span className="text-slate-600 dark:text-gray-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors text-sm">{t(`filters.levels.${level}`, level)}</span>
                                    </label>
                                ))}
                            </div>
                        </section>

                        {/* Cost */}
                        <section>
                            <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-3 uppercase tracking-wider">{t('filters.cost', 'Cost (Total)')}</h4>
                            <div className="space-y-2">
                                {costs.map(cost => (
                                    <label key={cost} className="flex items-center gap-3 cursor-pointer group">
                                        <div className="relative flex items-center">
                                            <input
                                                type="checkbox"
                                                className="peer appearance-none w-5 h-5 border-2 border-slate-300 dark:border-gray-600 rounded checked:bg-indigo-600 checked:border-indigo-600 dark:checked:bg-indigo-500 dark:checked:border-indigo-500 transition-colors"
                                                checked={isChecked('costLevels', cost)}
                                                onChange={() => toggleFilter('costLevels', cost)}
                                            />
                                            <svg className="absolute w-3.5 h-3.5 text-white left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 peer-checked:opacity-100 pointer-events-none" viewBox="0 0 14 14" fill="none">
                                                <path d="M3 8L6 11L11 3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                        </div>
                                        <span className="text-slate-600 dark:text-gray-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors text-sm">{t(`filters.costs.${cost}`, cost)}</span>
                                    </label>
                                ))}
                            </div>
                        </section>

                        {/* Institution Type */}
                        <section>
                            <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-3 uppercase tracking-wider">{t('filters.type', 'Type')}</h4>
                            <div className="space-y-2">
                                {types.map(type => (
                                    <label key={type} className="flex items-center gap-3 cursor-pointer group">
                                        <div className="relative flex items-center">
                                            <input
                                                type="checkbox"
                                                className="peer appearance-none w-5 h-5 border-2 border-slate-300 dark:border-gray-600 rounded checked:bg-indigo-600 checked:border-indigo-600 dark:checked:bg-indigo-500 dark:checked:border-indigo-500 transition-colors"
                                                checked={isChecked('types', type)}
                                                onChange={() => toggleFilter('types', type)}
                                            />
                                            <svg className="absolute w-3.5 h-3.5 text-white left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 peer-checked:opacity-100 pointer-events-none" viewBox="0 0 14 14" fill="none">
                                                <path d="M3 8L6 11L11 3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                        </div>
                                        <span className="text-slate-600 dark:text-gray-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors text-sm">{t(`filters.types.${type}`, type)}</span>
                                    </label>
                                ))}
                            </div>
                        </section>

                    </div>

                    {/* Clear Filters */}
                    <div className="mt-8 pt-6 border-t border-slate-100 dark:border-gray-800">
                        <button
                            onClick={() => setFilters({ levels: [], domains: [], costLevels: [], types: [] })}
                            className="text-sm text-slate-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 font-medium transition-colors w-full text-center"
                        >
                            {t('filters.resetAll', 'Reset all filters')}
                        </button>
                    </div>

                </div>
            </aside>
        </>
    );
};

export default CourseFilterSidebar;