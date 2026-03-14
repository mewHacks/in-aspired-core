import React from 'react';
import { Filter, X } from 'lucide-react';
import { RoomLevel, RoomType } from '../../types';
import { DOMAIN_OPTIONS } from '../../data/domains';
import { useTranslation } from 'react-i18next';

// Props passed from parent component
interface RoomFilterSidebarProps {
    filters: RoomFilterState; // Current active filters
    setFilters: (filters: RoomFilterState) => void; // State updater
    isOpen: boolean; // For mobile responsive toggling
    onClose: () => void;
    onReset?: () => void; // Optional callback when filters are reset
}

// Filter state interface
export interface RoomFilterState {
    levels: RoomLevel[]; // Selected difficulty levels
    domains: string[]; // Selected interest domain IDs
    types: RoomType[]; // Selected room access types
}

// Sidebar component
const RoomFilterSidebar: React.FC<RoomFilterSidebarProps> = ({ filters, setFilters, isOpen, onClose, onReset }) => {
    const { t } = useTranslation();

    // Generic toggle function for filters, used K as the filter section key for 'levels' / 'domains' / 'types'
    const toggleFilter = <K extends keyof RoomFilterState>(section: K, value: RoomFilterState[K][number]) => {

        // Get current values for this section
        const current = filters[section] as any[];

        // Toggle logic
        const updated = current.includes(value)
            ? current.filter(item => item !== value) // Remove if already selected
            : [...current, value]; // Add if not selected

        // Update global filter state
        setFilters({ ...filters, [section]: updated });
    };

    // Helper function to check whether a checkbox should be checked
    const isChecked = (section: keyof RoomFilterState, value: string) => {
        return (filters[section] as string[]).includes(value);
    };

    // Define filter options
    const levels: RoomLevel[] = ['Foundation', 'Diploma', 'General Pre-U', 'All Levels'];
    const types: RoomType[] = ['public', 'private'];

    return (
        // Render JSX
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
                            <span>{t('rooms.listing.filter.title', 'Filters')}</span>
                        </div>
                        <button onClick={onClose} className="lg:hidden text-slate-400 dark:text-gray-500 hover:text-slate-600 dark:hover:text-gray-300">
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Filter Sections */}
                    <div className="space-y-8">

                        {/* Domains (Scrollable) */}
                        <section>
                            <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-3 uppercase tracking-wider">{t('rooms.listing.filter.domain', 'Field of Interest')}</h4>
                            <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                                {DOMAIN_OPTIONS.map(domain => (
                                    <label key={domain.id} className="flex items-center gap-3 cursor-pointer group">
                                        <div className="relative flex items-center">
                                            <input
                                                type="checkbox"
                                                className="peer appearance-none w-5 h-5 border-2 border-slate-300 dark:border-gray-600 rounded checked:bg-indigo-600 dark:checked:bg-indigo-500 checked:border-indigo-600 dark:checked:border-indigo-500 transition-colors"
                                                checked={isChecked('domains', domain.id)}
                                                onChange={() => toggleFilter('domains', domain.id)}
                                            />
                                            <svg className="absolute w-3.5 h-3.5 text-white left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 peer-checked:opacity-100 pointer-events-none" viewBox="0 0 14 14" fill="none">
                                                <path d="M3 8L6 11L11 3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                        </div>
                                        <span className="text-slate-600 dark:text-gray-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors text-sm">{t(`core.domains.${domain.id}`, { defaultValue: domain.label })}</span>
                                    </label>
                                ))}
                            </div>
                        </section>

                        {/* Education Level */}
                        <section>
                            <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-3 uppercase tracking-wider">{t('rooms.listing.filter.level', 'Education Level')}</h4>
                            <div className="space-y-2">
                                {levels.map(level => (
                                    <label key={level} className="flex items-center gap-3 cursor-pointer group">
                                        <div className="relative flex items-center">
                                            <input
                                                type="checkbox"
                                                className="peer appearance-none w-5 h-5 border-2 border-slate-300 dark:border-gray-600 rounded checked:bg-indigo-600 dark:checked:bg-indigo-500 checked:border-indigo-600 dark:checked:border-indigo-500 transition-colors"
                                                checked={isChecked('levels', level)}
                                                onChange={() => toggleFilter('levels', level)}
                                            />
                                            <svg className="absolute w-3.5 h-3.5 text-white left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 peer-checked:opacity-100 pointer-events-none" viewBox="0 0 14 14" fill="none">
                                                <path d="M3 8L6 11L11 3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                        </div>
                                        <span className="text-slate-600 dark:text-gray-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors text-sm">{t(`rooms.listing.filter.levels.${level}`, { defaultValue: level })}</span>
                                    </label>
                                ))}
                            </div>
                        </section>

                        {/* Access Type */}
                        <section>
                            <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-3 uppercase tracking-wider">{t('rooms.listing.filter.type', 'Access Type')}</h4>
                            <div className="space-y-2">
                                {types.map(type => (
                                    <label key={type} className="flex items-center gap-3 cursor-pointer group">
                                        <div className="relative flex items-center">
                                            <input
                                                type="checkbox"
                                                className="peer appearance-none w-5 h-5 border-2 border-slate-300 dark:border-gray-600 rounded checked:bg-indigo-600 dark:checked:bg-indigo-500 checked:border-indigo-600 dark:checked:border-indigo-500 transition-colors"
                                                checked={isChecked('types', type)}
                                                onChange={() => toggleFilter('types', type)}
                                            />
                                            <svg className="absolute w-3.5 h-3.5 text-white left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 peer-checked:opacity-100 pointer-events-none" viewBox="0 0 14 14" fill="none">
                                                <path d="M3 8L6 11L11 3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                        </div>
                                        <span className="text-slate-600 dark:text-gray-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors text-sm capitalize">{t(`rooms.listing.filter.types.${type}`, { defaultValue: type })}</span>
                                    </label>
                                ))}
                            </div>
                        </section>

                    </div>

                    {/* Clear Filters Button */}
                    <div className="mt-8 pt-6 border-t border-slate-100 dark:border-gray-800">
                        <button
                            onClick={() => {
                                setFilters({ levels: [], domains: [], types: [] });
                                if (onReset) onReset();
                            }}
                            className="text-sm text-slate-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 font-medium transition-colors w-full text-center"
                        >
                            {t('rooms.listing.filter.reset', 'Reset all filters')}
                        </button>
                    </div>

                </div>
            </aside>
        </>
    );
};

export default RoomFilterSidebar;