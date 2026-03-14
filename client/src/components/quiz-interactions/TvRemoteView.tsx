import React from 'react';
import { InteractionProps } from './types';
import { Button } from '../ui/Button';
import { useTranslation } from 'react-i18next';

// TV remote view for question 9
const TvRemoteView: React.FC<InteractionProps> = ({
    question,
    onOptionSelect,
    selectedOptionIndex,
    onNext,
    onBack,
    isLastQuestion
}) => {
    const { t } = useTranslation();
    const activeImage = selectedOptionIndex !== null
        ? question.options[selectedOptionIndex].visualImage
        : null;

    return (
        <div className="w-full max-w-5xl aspect-[9/16] sm:aspect-video relative rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl bg-black dark:bg-black ring-1 ring-white/10 dark:ring-white/5 mx-auto group select-none">

            {/* Background image */}
            <div className="absolute inset-0 z-0">
                <img
                    src="/assets/quiz/tv/scene_tv_room_bg.webp"
                    alt="TV Room Background"
                    className="w-full h-full object-cover blur-sm brightness-50 dark:brightness-40"
                />
                <div className="absolute inset-0 bg-black/40 dark:bg-black/60" />
            </div>

            {/* Question text overlay */}
            <div className="absolute top-4 left-4 sm:top-8 sm:left-12 z-20 max-w-[80%] sm:max-w-lg pointer-events-none">
                <h2 className="text-lg sm:text-2xl md:text-3xl font-serif text-white leading-tight mb-1 sm:mb-2 drop-shadow-md">
                    {question.scenario}
                </h2>
            </div>

            {/* TV screen content */}
            <div className="absolute inset-0 z-10 flex items-center justify-center p-8 md:p-12 pb-20">
                <div className="w-full max-w-2xl aspect-video bg-black dark:bg-black relative overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.8)] dark:shadow-[0_0_50px_rgba(0,0,0,0.9)] rounded-lg border-[12px] border-gray-900 dark:border-gray-900 ring-1 ring-gray-700 dark:ring-gray-800">

                    {/* Screen glow*/}
                    <div className="absolute inset-0 z-20 pointer-events-none bg-gradient-to-tr from-transparent via-white/5 to-white/10 dark:via-white/5 dark:to-white/5" />

                    {/* Display active image or no signal depending on selected state */}
                    {activeImage ? (
                        <img
                            src={activeImage}
                            alt="Channel"
                            className="w-full h-full object-cover animate-in fade-in duration-700"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-[#1a1a1a] dark:bg-[#111111]">
                            <div className="absolute inset-0 opacity-20 dark:opacity-10 bg-[url('https://media.giphy.com/media/oEI9uBYSzLpBK/giphy.gif')] bg-cover mix-blend-overlay" />
                            <p className="text-white/20 dark:text-white/10 font-mono text-xl z-10 animate-pulse">{t('core.quiz.nav.noSignal')}</p>
                        </div>
                    )}

                    {/* Scanlines effect */}
                    <div className="absolute inset-0 z-30 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] dark:bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.35)_50%),linear-gradient(90deg,rgba(255,0,0,0.03),rgba(0,255,0,0.01),rgba(0,0,255,0.03))] bg-[length:100%_4px,3px_100%] opacity-20 dark:opacity-30" />
                </div>
            </div>

            {/* Hand holding remote control like FPS - Hidden on very small screens to avoid clutter */}
            <div className="absolute -bottom-12 sm:-bottom-16 -left-12 sm:-left-16 z-30 pointer-events-none transition-transform duration-500 ease-out group-hover:-translate-y-4 hidden xs:block">
                <img
                    src="/assets/quiz/tv/ui_remote_hand.webp"
                    alt="Hand holding remote"
                    className="w-[280px] sm:w-[400px] md:w-[600px] object-contain transform rotate-12 drop-shadow-2xl brightness-90 dark:brightness-75 contrast-125"
                />
            </div>

            {/* Controls / Navigation (Bottom Right of Card) */}
            <div className="absolute bottom-6 right-6 md:right-10 z-40 flex flex-col items-end gap-3">

                {/* Channels */}
                <div className="flex flex-col gap-2 mb-2">
                    {question.options.map((option, idx) => (
                        <button
                            key={idx}
                            onClick={() => onOptionSelect(idx)}
                            className={`
                                group/btn flex items-center justify-end gap-3 transition-all duration-300
                                ${selectedOptionIndex === idx ? 'translate-x-0 opacity-100' : 'translate-x-2 opacity-70 hover:opacity-100'}
                            `}
                        >
                            <span className={`
                                px-3 py-1.5 rounded-full font-medium shadow-lg backdrop-blur-md transition-colors text-right text-sm
                                ${selectedOptionIndex === idx
                                    ? 'bg-indigo-600 dark:bg-indigo-600 text-white'
                                    : 'bg-black/60 dark:bg-gray-900/80 text-white/80 dark:text-white/70 group-hover/btn:bg-indigo-900/80 dark:group-hover/btn:bg-indigo-900'}
                            `}>
                                {option.label}
                            </span>
                            <div className={`
                                w-10 h-10 rounded-full flex items-center justify-center shadow-lg border-2 transition-all
                                ${selectedOptionIndex === idx
                                    ? 'bg-indigo-600 dark:bg-indigo-600 border-indigo-400 dark:border-indigo-400 scale-110'
                                    : 'bg-black/80 dark:bg-gray-800 border-white/20 dark:border-gray-600 group-hover/btn:border-indigo-400 dark:group-hover/btn:border-indigo-500'}
                            `}>
                                <span className="text-white dark:text-white font-bold text-sm">{idx + 1}</span>
                            </div>
                        </button>
                    ))}
                </div>

                {/* Navigation buttons */}
                <div className="flex gap-3">

                    {/* Back button */}
                    <Button
                        variant="ghost"
                        onClick={onBack}
                        className="text-white/60 dark:text-white/50 hover:text-white dark:hover:text-white bg-black/40 dark:bg-black/60 hover:bg-black/60 dark:hover:bg-black/70 backdrop-blur-sm"
                    >
                        {t('core.quiz.nav.back')}
                    </Button>

                    {/* Next button */}
                    <Button
                        variant="primary"
                        onClick={onNext}
                        disabled={selectedOptionIndex === null}
                        className={`
                            bg-indigo-600 hover:bg-indigo-500 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white font-bold px-6 py-2.5 rounded-full shadow-lg transition-all
                            ${selectedOptionIndex !== null ? 'opacity-100 translate-y-0' : 'opacity-50 translate-y-2 pointer-events-none'}
                        `}
                    >
                        {isLastQuestion ? t('core.quiz.nav.finish') : t('core.quiz.nav.next')}
                    </Button>

                </div>
            </div>

        </div>
    );
};

export default TvRemoteView;