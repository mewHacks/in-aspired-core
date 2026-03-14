import React from 'react';
import { InteractionProps } from './types';
import { Button } from '../ui/Button';
import { ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

// Scene selection view for user to choose between three clickable objects
// used in question 11, 21, 22, 36
const SceneSelectionView: React.FC<InteractionProps> = ({
    question,
    onOptionSelect,
    selectedOptionIndex,
    onNext,
    onBack,
    isFirstQuestion,
    isLastQuestion
}) => {
    const { t } = useTranslation();

    return (
        // Responsive aspect ratio: 3:4 for vertical mobile, 16:9 for larger screens
        <div className="w-full max-w-5xl aspect-[3/4] sm:aspect-video relative rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl bg-gray-900 dark:bg-gray-950 ring-1 ring-white/10 dark:ring-gray-800/50 mx-auto">

            {/* Background layer */}
            {question.visualContext?.bgImage && (
                <div className="absolute inset-0 z-0 h-full w-full">

                    {/* Background image */}
                    <img
                        src={question.visualContext.bgImage}
                        alt="Scene Background"
                        className="w-full h-full object-cover transition-transform duration-[20s] ease-linear scale-105 hover:scale-110"
                    />

                    {/* Dark gradient for better contrast */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 dark:from-black/80 via-transparent to-black/50 dark:to-black/60 pointer-events-none" />

                </div>
            )}

            {/* Interactive layer (clickable objects) */}
            <div className="absolute inset-0 z-10 w-full h-full pointer-events-none">
                {question.options.map((option, idx) => {

                    // x and y- coordinates for object placement
                    // Fallbacks ensure objects still render if coords are missing
                    const x = option.coordinates?.x ?? (20 + (idx * 30));
                    const y = option.coordinates?.y ?? 60;

                    return (
                        // Each option is a clickable object placed in the scene
                        <button
                            key={idx}
                            onClick={() => onOptionSelect(idx)}
                            // Ensure pointer-events-auto is on the button
                            className={`absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-300 group pointer-events-auto flex flex-col items-center justify-end
                                ${selectedOptionIndex === idx ? 'scale-110 z-30' : 'hover:scale-105 z-20'}
                            `}
                            style={{ left: `${x}%`, top: `${y}%` }}
                        >
                            <div className="relative flex flex-col items-center justify-center">
                                {/* Glow effect on selection */}
                                <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-indigo-500/40 dark:bg-indigo-500/60 rounded-full blur-3xl transition-opacity duration-500 pointer-events-none
                                    ${selectedOptionIndex === idx ? 'opacity-100' : 'opacity-0'}
                                `} />

                                {/* Object image (main clickable prop) */}
                                {option.visualImage ? (
                                    <>
                                        <img
                                            src={option.visualImage}
                                            alt={option.visualLabel}
                                            // Enlarge image props significantly, smaller on mobile to prevent overlap
                                            className={`w-32 sm:w-48 md:w-72 lg:w-96 h-auto object-contain drop-shadow-2xl dark:brightness-95 relative z-10 transition-all duration-300
                                                ${selectedOptionIndex === idx ? 'brightness-110 dark:brightness-125 scale-110' : ''}
                                            `}
                                            style={{ transform: `scale(${option.scale ?? 1})` }}
                                        />

                                        {/* Shadow */}
                                        <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-3/4 h-4 bg-black/40 dark:bg-black/60 blur-xl rounded-[100%] z-0" />
                                    </>
                                ) : ( // Fallback placeholder if no image exists
                                    <div className="w-32 h-32 rounded-full bg-white/20 dark:bg-white/10 backdrop-blur-md border border-white/50 dark:border-white/20 flex items-center justify-center shadow-lg animate-pulse">
                                        <span className="text-4xl text-white dark:text-gray-300">?</span>
                                    </div>
                                )}

                                {/* Label above the object */}
                                <div className={`
                                    absolute left-1/2 -translate-x-1/2 -top-10
                                    px-4 py-2 rounded-xl backdrop-blur-xl border text-sm md:text-base font-medium whitespace-nowrap transition-all duration-300 z-20
                                    ${selectedOptionIndex === idx
                                        ? 'bg-indigo-600 dark:bg-indigo-600 border-indigo-400 dark:border-indigo-500 text-white shadow-lg opacity-100 translate-y-0 scale-100'
                                        : 'bg-black/60 dark:bg-gray-900/80 border-white/10 dark:border-gray-700 text-white/90 dark:text-gray-300 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 scale-95'
                                    }
                                `}>
                                    {option.visualLabel || option.label}
                                </div>
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* Text and navigation buttons */}
            <div className="absolute inset-0 z-20 flex flex-col p-8 md:p-12 pointer-events-none">

                {/* Question text at top left */}
                <div className="max-w-full sm:max-w-xl text-left pointer-events-auto">
                    <h2 className="text-lg sm:text-2xl md:text-4xl font-serif text-white leading-tight mb-1 sm:mb-2 drop-shadow-md">
                        {question.scenario}
                    </h2>
                    <p className="text-white/80 dark:text-white/70 text-sm sm:text-base md:text-lg font-bold italic">
                        {t('core.quiz.nav.selectItem')}
                    </p>
                </div>

                {/* Navigation buttons at bottom right */}
                <div className="mt-auto flex justify-end gap-3 items-center pointer-events-auto">
                    {!isFirstQuestion && (

                        // Back button
                        <Button
                            variant="ghost"
                            onClick={onBack}
                            className="text-white/80 dark:text-white/70 hover:text-white dark:hover:text-white hover:bg-white/10 dark:hover:bg-gray/10"
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
                        {isLastQuestion ? t('core.quiz.nav.finish') : t('core.quiz.nav.next')}
                        <ChevronRight className="ml-2 w-4 h-4" />
                    </Button>
                </div>
            </div>

        </div>
    );
};

export default SceneSelectionView;