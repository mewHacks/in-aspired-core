import React from 'react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { ChevronRight } from 'lucide-react';
import { InteractionProps } from './types';
import { useTranslation } from 'react-i18next';

// Standard card view which handles most of the normal questions
// For readability and simplicity to not confuse users
const StandardCardView: React.FC<InteractionProps> = ({
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
        <Card className="p-8 md:p-12 shadow-sm border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 max-w-2xl w-full mx-auto relative z-10 rounded-2xl">

            {/* Question text */}
            <h2 className="text-2xl md:text-3xl font-serif font-medium text-gray-900 dark:text-white mb-8 leading-snug">
                {question.scenario}
            </h2>

            {/* Option text (or image buttons if visualContext is present)*/}
            <div className="space-y-3">
                {question.options.map((option, idx) => (
                    <button
                        key={idx}
                        onClick={() => onOptionSelect(idx)}
                        className={`w-full text-left p-5 rounded-xl border transition-all duration-200 flex items-center justify-between group
                            ${selectedOptionIndex === idx
                                ? 'border-indigo-600 dark:border-indigo-500 bg-indigo-50/50 dark:bg-indigo-900/30 text-indigo-900 dark:text-indigo-100 shadow-sm'
                                : 'border-gray-100 dark:border-gray-700 bg-gray-50/30 dark:bg-gray-800/50 hover:border-indigo-200 dark:hover:border-indigo-700 hover:bg-white dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300'
                            }
                        `}
                    >
                        <span className="text-base md:text-lg">{option.label}</span>
                    </button>
                ))}
            </div>

            <div className="mt-12 flex justify-end gap-4">

                {/* Back button */}
                {!isFirstQuestion && (
                    <Button
                        variant="ghost"
                        onClick={onBack}
                        className="text-gray-500 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30"
                    >
                        {t('core.quiz.nav.back')}
                    </Button>
                )}

                {/* Next button or Finish button if last question */}
                <Button
                    variant="primary"
                    size="lg"
                    className="rounded-xl px-8 py-4 text-base shadow-lg shadow-indigo-100 dark:shadow-indigo-950/30 font-medium"
                    onClick={onNext}
                    disabled={selectedOptionIndex === null}
                >
                    {isLastQuestion ? t('core.quiz.nav.finish') : t('core.quiz.nav.next')}
                    <ChevronRight className="ml-2 w-5 h-5" />
                </Button>
            </div>
        </Card>
    );
};

export default StandardCardView;