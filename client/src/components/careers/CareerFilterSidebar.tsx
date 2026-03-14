// Filter sidebar for narrowing career listings by industry, demand, education, etc.
import React from 'react';
import { Filter, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { DOMAIN_OPTIONS } from '../../data/domains';

interface CareerFilterState {
    domains: string[];
    outlooks: string[];
}

interface FilterSidebarProps {
    filters: CareerFilterState;
    setFilters: (filters: CareerFilterState) => void;
    isOpen: boolean; // For mobile responsive toggling
    onClose: () => void;
}

const CareerFilterSidebar: React.FC<FilterSidebarProps> = ({ filters, setFilters, isOpen, onClose }) => {
    const { t } = useTranslation();

    const toggleFilter = (section: keyof CareerFilterState, value: string) => {
        const current = filters[section];
        const updated = current.includes(value)
            ? current.filter(item => item !== value)
            : [...current, value];

        setFilters({ ...filters, [section]: updated });
    };

    const isChecked = (section: keyof CareerFilterState, value: string) => {
        return filters[section].includes(value);
    };

    const outlooks = ['High', 'Medium', 'Low'];

    return (
        <>
            {/* Mobile Backdrop */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 dark:bg-black/70 z-40 lg:hidden"
                    onClick={onClose}
                />
            )}

            <aside className={`
                fixed top-0 left-0 bottom-0 z-[60] w-72 bg-white dark:bg-gray-900 border-r border-slate-200 dark:border-gray-800 transform transition-transform duration-300 ease-in-out overflow-y-auto
                lg:translate-x-0 lg:static lg:h-auto lg:shadow-none
                ${isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}
            `}>
                <div className="p-6">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-2 text-slate-800 dark:text-white font-bold text-lg">
                            <Filter className="w-5 h-5" />
                            <span>{t('careers.filter.title', 'Filters')}</span>
                        </div>
                        <button onClick={onClose} className="lg:hidden text-slate-400 dark:text-gray-500 hover:text-slate-600 dark:hover:text-gray-300">
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    <div className="space-y-8">
                        {/* Domain/Industry Filter */}
                        <section>
                            <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-3 uppercase tracking-wider">{t('careers.filter.domain', 'Field of Interest')}</h4>
                            <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                                {DOMAIN_OPTIONS.map(domain => (
                                    <label key={domain.id} className="flex items-center gap-3 cursor-pointer group">
                                        <div className="relative flex items-center">
                                            <input
                                                type="checkbox"
                                                className="peer appearance-none w-5 h-5 border-2 border-slate-300 dark:border-gray-600 rounded checked:bg-emerald-600 dark:checked:bg-emerald-500 checked:border-emerald-600 dark:checked:border-emerald-500 transition-colors"
                                                checked={isChecked('domains', domain.id)}
                                                onChange={() => toggleFilter('domains', domain.id)}
                                            />
                                            <svg className="absolute w-3.5 h-3.5 text-white left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 peer-checked:opacity-100 pointer-events-none" viewBox="0 0 14 14" fill="none">
                                                <path d="M3 8L6 11L11 3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                        </div>
                                        <span className="text-slate-600 dark:text-gray-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors text-sm">{t(`core.domains.${domain.id}`, domain.label)}</span>
                                    </label>
                                ))}
                            </div>
                        </section>

                        {/* Outlook Filter */}
                        <section>
                            <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-3 uppercase tracking-wider">{t('careers.filter.outlook', 'Market Outlook')}</h4>
                            <div className="space-y-2">
                                {outlooks.map(outlook => (
                                    <label key={outlook} className="flex items-center gap-3 cursor-pointer group">
                                        <div className="relative flex items-center">
                                            <input
                                                type="checkbox"
                                                className="peer appearance-none w-5 h-5 border-2 border-slate-300 dark:border-gray-600 rounded checked:bg-emerald-600 dark:checked:bg-emerald-500 checked:border-emerald-600 dark:checked:border-emerald-500 transition-colors"
                                                checked={isChecked('outlooks', outlook)}
                                                onChange={() => toggleFilter('outlooks', outlook)}
                                            />
                                            <svg className="absolute w-3.5 h-3.5 text-white left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 peer-checked:opacity-100 pointer-events-none" viewBox="0 0 14 14" fill="none">
                                                <path d="M3 8L6 11L11 3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                        </div>
                                        <span className="text-slate-600 dark:text-gray-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors text-sm">{t(`visuals.demand.${outlook}`, outlook)}</span>
                                    </label>
                                ))}
                            </div>
                        </section>
                    </div>

                    <div className="mt-8 pt-6 border-t border-slate-100 dark:border-gray-800">
                        <button
                            onClick={() => setFilters({ domains: [], outlooks: [] })}
                            className="text-sm text-slate-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 font-medium transition-colors w-full text-center"
                        >
                            {t('careers.filter.reset', 'Reset all filters')}
                        </button>
                    </div>
                </div>
            </aside>
        </>
    );
};

export default CareerFilterSidebar;