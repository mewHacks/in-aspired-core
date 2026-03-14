import React from 'react';
import { InteractionProps } from './types';
import { Button } from '../ui/Button';
import { ChevronRight, MessageCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

// Dialogue choice view for social and value theme (used in question 13-18)
// Designed for emotional and reflective purposes 
const DialogueChoiceView: React.FC<InteractionProps> = ({
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
        <div className="w-full h-full flex flex-col items-center justify-center relative overflow-hidden">

            {/* Background layer which is soft and emotional */}
            <div className="absolute inset-0 z-0 bg-indigo-50 dark:bg-gray-950">
                <div className="absolute top-0 left-0 w-96 h-96 bg-purple-200 dark:bg-purple-600/20 rounded-full filter blur-3xl opacity-30 dark:opacity-15 animate-blob will-change-transform transform-gpu" />
                <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-200 dark:bg-indigo-400/20 rounded-full filter blur-3xl opacity-30 dark:opacity-15 animate-blob animation-delay-2000 will-change-transform transform-gpu" />
                <div className="absolute -bottom-8 left-20 w-96 h-96 bg-pink-200 dark:bg-pink-100/20 rounded-full filter blur-3xl opacity-30 dark:opacity-15 animate-blob animation-delay-4000 will-change-transform transform-gpu" />
            </div>

            <div className="max-w-3xl w-full mx-auto relative z-10 px-6 py-12 flex flex-col h-full justify-center">

                {/* Scenario bubble (The prompt) */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-12 text-center"
                >
                    <div className="inline-block bg-white/60 dark:bg-gray-800/80 backdrop-blur-md border border-indigo-100 dark:border-gray-700 rounded-2xl px-8 py-6 shadow-sm">
                        <h2 className="text-2xl md:text-3xl font-serif text-indigo-950 dark:text-gray-200 leading-snug">
                            {question.scenario}
                        </h2>
                    </div>
                </motion.div>

                {/* Options bubbles (The response) */}
                <div className="space-y-4 w-full max-w-xl mx-auto">
                    {question.options.map((option, idx) => (
                        <motion.button
                            key={idx}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.15 + 0.3 }}
                            onClick={() => onOptionSelect(idx)}
                            className={`w-full text-left p-5 rounded-2xl border transition-all duration-300 relative group flex items-center gap-4
                                ${selectedOptionIndex === idx
                                    ? 'bg-indigo-600 dark:bg-indigo-700 text-white shadow-xl shadow-indigo-200 dark:shadow-indigo-950 border-indigo-600 dark:border-indigo-700 transform scale-[1.02]'
                                    : 'bg-white dark:bg-gray-800/80 text-gray-700 dark:text-gray-300 border-indigo-50 dark:border-gray-700 hover:border-indigo-200 dark:hover:border-indigo-600 hover:shadow-md hover:bg-indigo-50/50 dark:hover:bg-gray-700/50'
                                }
                            `}
                        >
                            {/* Message icon */}
                            <div className={`p-2 rounded-full flex-shrink-0 transition-colors
                                ${selectedOptionIndex === idx
                                    ? 'bg-white/20 dark:bg-white/15 text-white'
                                    : 'bg-indigo-50 dark:bg-gray-700 text-indigo-400 dark:text-indigo-300 group-hover:bg-indigo-100 dark:group-hover:bg-gray-600'
                                }
                            `}>
                                <MessageCircle className="w-5 h-5" />
                            </div>

                            {/* Option label */}
                            <span className={`text-lg font-medium leading-relaxed ${selectedOptionIndex === idx
                                    ? 'text-white'
                                    : 'text-gray-700 dark:text-gray-300'
                                }`}>
                                {option.label}
                            </span>
                        </motion.button>
                    ))}
                </div>

                {/* Navigation buttons */}
                <div className="mt-12 flex justify-between items-end gap-4 w-full max-w-xl mx-auto">

                    {/* Back button */}
                    <Button
                        variant="ghost"
                        onClick={onBack}
                        disabled={isFirstQuestion}
                        className="text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20"
                    >
                        {t('core.quiz.nav.back')}
                    </Button>

                    {/* Next button */}
                    <Button
                        variant="primary"
                        className={`shadow-lg transition-all duration-300 ${selectedOptionIndex !== null
                                ? 'opacity-100 translate-y-0'
                                : 'opacity-0 translate-y-4'
                            }`}
                        onClick={onNext}
                        disabled={selectedOptionIndex === null}
                    >
                        {isLastQuestion ? t('core.quiz.nav.finish') : t('core.quiz.nav.next')}
                        <ChevronRight className="ml-2 w-4 h-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default DialogueChoiceView;