import React from 'react';
import { Briefcase, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { DOMAIN_OPTIONS } from '../../data/domains';

// Props interface for CareerCard component
interface CareerCardProps {
    career: {
        id: string;
        name: string;
        riasec_code: string;
        related_domains?: string[];
        demand_level?: string;
    };
    similarity?: number; // 0-1 scale
}

/**
 * Compact career card for horizontal slider
 * Shows: Career Name, Field of Interest, RIASEC Code badge
 * Features corner bracket hover effect
 */
const CareerCard: React.FC<CareerCardProps> = ({ career, similarity }) => {

    // Navigation hook for respective career details
    const navigate = useNavigate();
    const { t } = useTranslation();

    // Get match percentage display
    const matchPercent = similarity ? Math.round(similarity * 100) : null;

    // Get demand level color
    const getDemandColor = (level?: string) => {
        switch (level) {
            case 'High': return 'text-green-600 dark:text-green-400';
            case 'Medium': return 'text-yellow-600 dark:text-yellow-400';
            case 'Low': return 'text-gray-500 dark:text-gray-500';
            default: return 'text-gray-500 dark:text-gray-500';
        }
    };

    return (
        // Return JSX for career card
        <div
            onClick={() => navigate(`/careers/${career.id}`)}
            className="career-card flex-shrink-0 w-72 min-h-[180px] bg-white dark:bg-gray-900 rounded-xl border-2 border-gray-200 dark:border-gray-700 p-5 hover:shadow-lg dark:hover:shadow-gray-900/50 transition-all duration-300 cursor-pointer relative flex flex-col"
        >
            {/* Corner brackets - appear on hover */}
            <div className="corner-brackets opacity-0 transition-opacity duration-300">
                {/* Top-left */}
                <span className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-purple-500 dark:border-purple-400 rounded-tl-lg" />
                {/* Top-right */}
                <span className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-purple-500 dark:border-purple-400 rounded-tr-lg" />
                {/* Bottom-left */}
                <span className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-purple-500 dark:border-purple-400 rounded-bl-lg" />
                {/* Bottom-right */}
                <span className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-purple-500 dark:border-purple-400 rounded-br-lg" />
            </div>

            {/* Match Badge */}
            {matchPercent && (
                <div className={`absolute top-3 right-3 px-2 py-0.5 rounded-full text-xs font-bold ${matchPercent >= 80
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                    : matchPercent >= 60
                        ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                    }`}>
                    {t('recommendations.matchPercent', '{{percent}}% Match', { percent: matchPercent })}
                </div>
            )}

            {/* RIASEC Code Badge */}
            <div className="inline-flex items-center gap-1.5 w-fit px-2.5 py-1 rounded-lg bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 text-xs font-bold mb-3">
                <span className="tracking-wider">{career.riasec_code}</span>
            </div>

            {/* Career Name */}
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-3 line-clamp-2 pr-16">
                {t(`careers.items.${career.id}`, career.name)}
            </h3>

            {/* Field of Interest (from related_domains) */}
            {career.related_domains && career.related_domains.length > 0 && (
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-2">
                    <Briefcase className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                    <span>
                        {career.related_domains
                            .slice(0, 3)
                            .map(d => {
                                // Find matching domain option by label (case-insensitive)
                                const match = DOMAIN_OPTIONS.find(
                                    opt => opt.label.toLowerCase() === d.trim().toLowerCase()
                                );
                                // Use the translation key if found, otherwise show raw string
                                return match
                                    ? t(`core.domains.${match.id}`, match.label)
                                    : d.trim();
                            })
                            .join(', ')}
                    </span>
                </div>
            )}


            {/* Demand Level */}
            <div className="mt-auto">
                {career.demand_level && (
                    <div className={`flex items-center gap-2 text-sm ${getDemandColor(career.demand_level)}`}>
                        <TrendingUp className="w-3.5 h-3.5 flex-shrink-0" />
                        <span>{t('recommendations.demandLevel', '{{level}} Demand', { level: t(`visuals.demand.${career.demand_level}`, career.demand_level) })}</span>
                    </div>
                )}
            </div>

            {/* Hover styles */}
            <style>{`
                .career-card:hover .corner-brackets {
                    opacity: 1;
                }
            `}</style>
        </div>
    );
};

export default CareerCard;