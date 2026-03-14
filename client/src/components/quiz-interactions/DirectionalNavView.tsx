import React, { useState } from 'react';
import { InteractionProps } from './types';
import { Button } from '../ui/Button';
import { ChevronRight, ArrowUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';

// Directional navigation view for question 10
const DirectionalNavView: React.FC<InteractionProps> = ({
    question,
    onOptionSelect,
    selectedOptionIndex,
    onNext,
    onBack,
    isFirstQuestion,
    isLastQuestion
}) => {
    const { t } = useTranslation();

    // Tracks which option is currently hovered
    // Used to visually link hanging signs with floor arrows
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

    // Define sign styles for each option
    const signs = [
        {
            // Left sign (Art/Fiction)
            position: "left-[10%] top-[35%]",
            rotate: "rotate-[-3deg]",
            fallbackColor: "bg-orange-50 dark:bg-orange-950 text-orange-900 dark:text-orange-200 border-orange-200 dark:border-orange-800",
            arrowPosition: "left-[30%] bottom-[15%]",
            arrowTransform: "rotateX(78deg) rotateZ(-25deg) scale(0.9)"
        },
        {
            // Center sign (Tech/Mechanics)
            position: "left-1/2 -translate-x-1/2 top-[25%]",
            rotate: "rotate-0",
            fallbackColor: "bg-blue-50 dark:bg-blue-950 text-blue-900 dark:text-blue-200 border-blue-200 dark:border-blue-800",
            arrowPosition: "left-1/2 -translate-x-1/2 bottom-[10%]",
            arrowTransform: "rotateX(75deg) rotateZ(0deg)"
        },
        {
            // Right sign (Business/Law)
            position: "right-[10%] top-[35%]",
            rotate: "rotate-[3deg]",
            fallbackColor: "bg-emerald-50 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800",
            arrowPosition: "right-[30%] bottom-[15%]",
            arrowTransform: "rotateX(78deg) rotateZ(25deg) scale(0.9)"
        }
    ];

    return (
        <div className="w-full max-w-5xl aspect-[3/4] sm:aspect-video relative rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl bg-gray-900 dark:bg-gray-950 ring-1 ring-white/10 dark:ring-gray-800/50 mx-auto select-none group/scene">

            {/* Background layer */}
            <div className="absolute inset-0 z-0">
                <img
                    src={question.visualContext?.bgImage || "/assets/quiz/bookstore/scene_bookstore_aisle.webp"}
                    alt="Bookstore Aisle"
                    className="w-full h-full object-cover transition-transform duration-[30s] ease-linear scale-100 hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 dark:from-black/80 via-transparent to-black/10 dark:to-black/20" />
            </div>

            {/* Floor arrows layer (Perspective) */}
            <div className="absolute inset-x-0 bottom-0 h-1/3 z-20 pointer-events-none perspective-[1000px]">
                {question.options.map((_, idx) => {
                    const style = signs[idx] || signs[1];
                    const isHovered = hoveredIndex === idx;
                    const isSelected = selectedOptionIndex === idx;
                    const isActive = isHovered || isSelected;

                    return (
                        <button
                            key={`arrow-${idx}`}
                            onClick={() => onOptionSelect(idx)}
                            onMouseEnter={() => setHoveredIndex(idx)}
                            onMouseLeave={() => setHoveredIndex(null)}
                            className={`
                                absolute pointer-events-auto transition-all duration-500 ease-out
                                ${style.arrowPosition}
                                ${isActive ? 'scale-110 z-30' : 'scale-100 opacity-70 hover:opacity-100 z-20'}
                            `}
                        >
                            <div
                                className="flex flex-col items-center justify-center transition-all duration-500 origin-bottom"
                                style={{ transform: style.arrowTransform }}
                            >
                                <div className={`absolute inset-0 rounded-full blur-xl transition-all duration-500
                                    ${isActive ? 'bg-red-600/30 dark:bg-red-500/40 opacity-100 scale-150' : 'bg-transparent opacity-0'}
                                `} />

                                <ArrowUp
                                    size={100}
                                    strokeWidth={2.5}
                                    className={`
                                        transition-all duration-300 select-none
                                        ${isActive
                                            ? 'text-red-600 dark:text-red-500 drop-shadow-[0_0_15px_rgba(220,38,38,0.8)] dark:drop-shadow-[0_0_15px_rgba(239,68,68,0.8)] opacity-100'
                                            : 'text-black/30 dark:text-white/20 mix-blend-overlay dark:mix-blend-lighten opacity-50 hover:opacity-100 hover:text-black/50 dark:hover:text-white/40'
                                        }
                                    `}
                                />
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* Hanging signs layer */}
            <div className="absolute inset-0 z-10 w-full h-full pointer-events-none">
                {question.options.map((option, idx) => {
                    const style = signs[idx] || signs[1];
                    const isHovered = hoveredIndex === idx;
                    const isSelected = selectedOptionIndex === idx;
                    const isActive = isHovered || isSelected;

                    return (
                        // Clickable sign
                        <button
                            key={idx}
                            onClick={() => onOptionSelect(idx)}
                            onMouseEnter={() => setHoveredIndex(idx)}
                            onMouseLeave={() => setHoveredIndex(null)}
                            className={`
                                absolute transform transition-all duration-300 group pointer-events-auto
                                ${style.position}
                                ${isActive ? 'z-30' : 'z-20'}
                            `}
                        >
                            <div className="relative flex flex-col items-center">

                                {/* Hanging strings */}
                                <div className="absolute w-full h-40 -top-40 pointer-events-none">
                                    <div className="h-full w-0.5 bg-gray-300/80 dark:bg-gray-600/80 absolute right-[75%] shadow-sm" />
                                    <div className="h-full w-0.5 bg-gray-300/80 dark:bg-gray-600/80 absolute left-[75%] shadow-sm" />
                                </div>

                                {/* Sign board */}
                                <div className={`
                                    transform transition-all duration-300 origin-top
                                    ${style.rotate}
                                    ${isActive ? 'scale-110 drop-shadow-[0_0_25px_rgba(255,255,255,0.6)] dark:drop-shadow-[0_0_25px_rgba(255,255,255,0.3)]' : 'hover:scale-105 hover:drop-shadow-[0_0_15px_rgba(255,255,255,0.3)] dark:hover:drop-shadow-[0_0_15px_rgba(255,255,255,0.15)]'}
                                `}>
                                    {/* Use image if provided */}
                                    {option.visualImage ? (
                                        <img
                                            src={option.visualImage}
                                            alt={option.visualLabel}
                                            className="w-40 sm:w-64 md:w-80 h-auto object-contain drop-shadow-xl dark:brightness-95"
                                        />
                                    ) : ( // If not, use text as fallback
                                        <div className={`
                                            w-32 sm:w-56 md:w-72 px-4 sm:px-6 py-6 sm:py-10 rounded-xl shadow-2xl border-[4px] sm:border-[6px] flex flex-col items-center justify-center gap-1 sm:gap-2 backdrop-blur-md
                                            ${style.fallbackColor}
                                            ${isActive ? 'bg-white dark:bg-gray-800 border-white dark:border-gray-700 scale-105 ring-4 ring-white/50 dark:ring-gray-700/50' : ''}
                                        `}>
                                            <span className="text-lg sm:text-2xl md:text-3xl font-serif font-bold text-center leading-tight">
                                                {option.visualLabel}
                                            </span>
                                        </div>
                                    )}

                                    {/* Glow overlay when selected/hovered */}
                                    {isActive && (
                                        <div className="absolute inset-0 bg-white/20 dark:bg-white/10 blur-xl rounded-lg -z-10 animate-pulse" />
                                    )}
                                </div>
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* Text & navigation buttons layer */}
            <div className="absolute inset-0 z-20 flex flex-col p-8 md:p-12 pointer-events-none">

                {/* Question text at top left */}
                <div className="max-w-full sm:max-w-lg text-left pointer-events-auto bg-black/40 dark:bg-black/60 backdrop-blur-md p-4 sm:p-6 rounded-xl sm:rounded-2xl border border-white/10 dark:border-white/5 shadow-lg">
                    <h2 className="text-lg sm:text-xl md:text-3xl font-serif text-white leading-tight mb-1 sm:mb-2 drop-shadow-md">
                        {question.scenario}
                    </h2>
                    <p className="text-white/80 dark:text-white/70 text-xs sm:text-sm md:text-base font-light italic">
                        {t('core.quiz.nav.followArrows')}
                    </p>
                </div>

                {/* Navigation buttons at bottom right */}
                <div className="mt-auto flex justify-end gap-3 items-center pointer-events-auto">
                    {!isFirstQuestion && (

                        // Back button 
                        <Button
                            variant="ghost"
                            onClick={onBack}
                            className="text-white/80 dark:text-white hover:text-white dark:hover:text-white hover:bg-white/10 dark:hover:bg-white/20"
                        >
                            {t('core.quiz.nav.back')}
                        </Button>
                    )}

                    {/* Next button */}
                    <Button
                        variant="primary"
                        onClick={onNext}
                        disabled={selectedOptionIndex === null}
                        className={`
                            bg-indigo-600 hover:bg-indigo-500 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white font-bold px-6 py-2.5 rounded-full shadow-lg shadow-indigo-900/50 dark:shadow-indigo-950/50 transition-all 
                            ${selectedOptionIndex !== null ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}
                        `}
                    >
                        {isLastQuestion ? t('core.quiz.nav.finish') : t('core.quiz.nav.next')} <ChevronRight className="ml-2 w-4 h-4" />
                    </Button>
                </div>
            </div>

        </div>
    );
};

export default DirectionalNavView;