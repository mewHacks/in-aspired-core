// RIASEC personality quiz page with themed interaction views and persistence
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { quizQuestions } from '../data/quizQuestions';
import { RiasecType, RiasecScore } from '../types';
import QuestionRenderer from '../components/quiz-interactions/QuestionRenderer';
import Navbar from '../components/layout/Navbar';
import { API_BASE_URL } from '../config';
import { httpClient } from '../services/httpClient';
import { useTranslation } from 'react-i18next';
import { useConfirm } from '@/contexts/ConfirmContext';

const QuizPage: React.FC = () => {
    const { t } = useTranslation();
    const { alert: alertAction } = useConfirm();
    const navigate = useNavigate();
    const location = useLocation();

    // --- 1. PERSISTENCE LOGIC ---
    const getScopedKey = (base: string) => {
        try {
            const userStr = localStorage.getItem('user') || sessionStorage.getItem('user');
            if (userStr) {
                const user = JSON.parse(userStr);
                return `${base}_${user.id || user._id}`;
            }
        } catch (e) {
            console.warn('Failed to parse user for storage key');
        }
        return `${base}_guest`;
    };

    const resultsKey = getScopedKey('resultsPersistence');
    const progressKey = getScopedKey('personalityTestProgress');

    const resultsPersistence = localStorage.getItem(resultsKey);
    const isRetaking = location.state?.retake;
    const hasUnfinishedProgress = !!localStorage.getItem(progressKey);

    const [isRestarting, setIsRestarting] = useState(false);

    // Initial load logic
    const savedProgress = !isRetaking ? JSON.parse(localStorage.getItem(progressKey) || 'null') : null;

    // --- 2. STATE ---
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(savedProgress?.currentQuestionIndex || 0);
    const [selectedOptionIndex, setSelectedOptionIndex] = useState<number | null>(null);
    const [history, setHistory] = useState<number[]>(savedProgress?.history || []);
    const [scores, setScores] = useState<Record<RiasecType, number>>(savedProgress?.scores || {
        R: 0, I: 0, A: 0, S: 0, E: 0, C: 0
    });

    const [showResumePrompt, setShowResumePrompt] = useState(!!savedProgress && !isRetaking);

    // --- 3. EFFECTS ---
    // Redirect if results exist and not retaking
    useEffect(() => {
        if (resultsPersistence && !isRetaking && !hasUnfinishedProgress && !isRestarting) {
            navigate('/results', { replace: true });
        }
    }, [resultsPersistence, isRetaking, hasUnfinishedProgress, isRestarting, navigate]);

    // Save progress
    useEffect(() => {
        const isDefaultState = currentQuestionIndex === 0 && Object.values(scores).every(s => s === 0);
        if (isDefaultState) return;

        localStorage.setItem(progressKey, JSON.stringify({
            currentQuestionIndex,
            scores,
            history
        }));
    }, [currentQuestionIndex, scores, history, progressKey]);


    const currentQuestionBase = quizQuestions[currentQuestionIndex];

    // Enrich with translations
    const currentQuestion = {
        ...currentQuestionBase,
        scenario: t(`core.quiz.q${currentQuestionBase.id}.scenario`, currentQuestionBase.scenario),
        options: currentQuestionBase.options.map((opt, i) => {
            const label = t(`core.quiz.q${currentQuestionBase.id}.o${i + 1}`, opt.label);
            const visualLabelKey = `core.quiz.q${currentQuestionBase.id}.o${i + 1}_v`;
            const visualLabel = t(visualLabelKey);

            return {
                ...opt,
                label,
                // Only use the translation if it's not just returning the key (meaning it exists)
                visualLabel: visualLabel !== visualLabelKey ? visualLabel : opt.visualLabel
            };
        })
    };

    // Theme Logic
    const getThemeBackground = (theme?: string) => {
        switch (theme) {
            case 'workspace':
                return 'bg-gradient-to-br from-slate-100 to-gray-200 dark:from-slate-900 dark:to-gray-800';
            case 'lifestyle':
                return 'bg-gradient-to-br from-slate-50 to-indigo-50 dark:from-slate-900 dark:to-indigo-950';
            case 'social':
                return 'bg-gradient-to-br from-purple-50 via-fuchsia-50 to-yellow-50 dark:bg-gray-950 dark:bg-gradient-to-br dark:from-purple-700/20 dark:via-fuchsia-700/20 dark:to-yellow-700/20';
            case 'environment':
                return 'bg-gradient-to-br from-emerald-50 to-pink-100 dark:from-emerald-950 dark:to-pink-950';
            case 'deep-dive':
                return 'bg-gradient-to-br from-gray-100 to-purple-200 dark:from-gray-900 dark:to-purple-900';
            case 'future':
                return 'bg-gradient-to-br from-blue-50 to-orange-100 dark:from-blue-950 dark:to-orange-950';
            default:
                return 'bg-gradient-to-br from-indigo-50 to-blue-100 dark:from-indigo-950 dark:to-blue-900';
        }
    };

    const currentThemeClass = getThemeBackground(currentQuestion.visualContext?.theme);

    // --- 4. HANDLERS ---

    // Check next question for persistence
    useEffect(() => {
        // When question index changes, if we have history for this index, load it.
        if (history[currentQuestionIndex] !== undefined) {
            setSelectedOptionIndex(history[currentQuestionIndex]);
        } else {
            setSelectedOptionIndex(null);
        }
    }, [currentQuestionIndex]); // Dependency on index change

    const handleOptionSelect = (index: number) => {
        setSelectedOptionIndex(index);
    };

    const handleNext = async () => {
        if (selectedOptionIndex === null) return;

        // Update Score
        const selectedOption = currentQuestion.options[selectedOptionIndex];
        const newScores = { ...scores };
        newScores[selectedOption.value] += selectedOption.score;
        setScores(newScores);

        // Update History
        const newHistory = [...history];
        newHistory[currentQuestionIndex] = selectedOptionIndex;
        setHistory(newHistory);

        // Navigate or Submit
        if (currentQuestionIndex < quizQuestions.length - 1) {
            const nextIndex = currentQuestionIndex + 1;
            setCurrentQuestionIndex(nextIndex);

            // Note: The Effect above will handle loading the selectedOptionIndex for the next question
        } else {
            await handleSubmit(newScores);
        }
    };

    const handleBack = () => {
        if (currentQuestionIndex === 0) return;

        // Save current selection before leaving
        if (selectedOptionIndex !== null) {
            const tempHistory = [...history];
            tempHistory[currentQuestionIndex] = selectedOptionIndex;
            setHistory(tempHistory);
        }

        const prevIndex = currentQuestionIndex - 1;
        const prevAnswerIndex = history[prevIndex];

        // Undo Score (Backtrack logic)
        // We need to subtract the score of the option that was selected for the PREVIOUS question
        // because that score is currently in 'scores'.
        const prevQuestion = quizQuestions[prevIndex];
        // Safety check
        if (prevAnswerIndex !== undefined) {
            const prevOption = prevQuestion.options[prevAnswerIndex];
            const newScores = { ...scores };
            newScores[prevOption.value] -= prevOption.score;
            setScores(newScores);
        }

        setCurrentQuestionIndex(prevIndex);
        // The Effect will handle setting the selectedOptionIndex
    };

    const handleSubmit = async (finalScores: Record<RiasecType, number>) => {
        const formattedScores: RiasecScore[] = Object.entries(finalScores).map(([key, val]) => ({
            type: key as RiasecType, score: val
        }));

        try {
            // 1. Get Recommendations
            const response = await fetch(`${API_BASE_URL}/api/recommend`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ scores: formattedScores })
            });

            if (!response.ok) throw new Error('Failed to fetch recommendations');
            const data = await response.json();

            // 2. Save Result (if logged in)
            // We use standard API call which handles cookies automatically
            try {
                // Determine if user is logged in via context or try anyway (backend handles 401)
                await httpClient(`/api/save`, {
                    method: 'POST',
                    body: JSON.stringify({
                        scores: formattedScores,
                        topDomains: data.topDomains,
                        recommendedCourses: data.recommendedCourses
                    })
                });
            } catch (saveError) {
                // If it fails because user is not logged in (401), we just ignore it
                console.log('Result save skipped or failed (User might be guest)');
            }

            // 3. Cleanup
            localStorage.removeItem(progressKey);

            // 4. Navigate
            navigate('/results', { state: { results: data, scores: formattedScores } });

        } catch (error) {
            console.error('Quiz submission error:', error);
            alertAction({
                title: t('common.error'),
                message: t('quiz.alerts.error'),
                variant: 'danger'
            });
        }
    };

    const handleResume = () => {
        setShowResumePrompt(false);
    };

    const handleRestart = () => {
        setIsRestarting(true);
        localStorage.removeItem(progressKey);
        setCurrentQuestionIndex(0);
        setScores({ R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 });
        setHistory([]);
        setShowResumePrompt(false);
    };

    // --- 5. RENDER ---
    return (
        <div className={`min-h-screen ${currentThemeClass} transition-colors duration-700 flex flex-col relative overflow-hidden`}>

            {/* Resume Overlay */}
            {/* ... (Keep existing resume overlay code if not changing, but I need to match context) */}
            <AnimatePresence>
                {showResumePrompt && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 dark:bg-black/70 backdrop-blur-sm p-4"
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-8 max-w-md w-full text-center border border-gray-200 dark:border-gray-700"
                        >
                            <h3 className="text-2xl font-serif font-bold text-gray-900 dark:text-gray-100 mb-4">
                                {t('core.quiz.resumePrompt.title')}
                            </h3>
                            <p className="text-gray-600 dark:text-gray-400 mb-8">
                                {t('core.quiz.resumePrompt.desc')}
                            </p>
                            <div className="flex flex-col gap-3">
                                <Button variant="primary" onClick={handleResume} className="w-full justify-center">
                                    {t('core.quiz.resumePrompt.resumeBtn')}
                                </Button>
                                <Button 
                                    variant="outline" 
                                    onClick={handleRestart} 
                                    className="w-full justify-center border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                                >
                                    {t('core.quiz.resumePrompt.restartBtn')}
                                </Button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Navbar (Global) */}
            <Navbar />

            {/* Progress Bar (Below Navbar) */}
            <div className="pt-24 px-6 max-w-2xl mx-auto w-full relative z-40">
                <div className="flex items-center gap-4 bg-white/50 dark:bg-gray-900/50 backdrop-blur-md p-4 rounded-2xl shadow-sm border border-white/20 dark:border-gray-700/20">
                    <div className="w-full h-3 bg-gray-200/50 dark:bg-gray-700/50 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-indigo-500 dark:bg-indigo-400 transition-all duration-500 ease-out"
                            style={{ width: `${((currentQuestionIndex + 1) / quizQuestions.length) * 100}%` }}
                        />
                    </div>
                    <span className="text-sm font-medium whitespace-nowrap text-gray-500 dark:text-gray-400">
                        {currentQuestionIndex + 1} / {quizQuestions.length}
                    </span>
                </div>
            </div>

            {/* Main Stage */}
            <main className={`flex-1 flex flex-col justify-center items-center p-6 relative ${showResumePrompt ? 'blur-sm pointer-events-none' : ''}`}>
                <QuestionRenderer
                    question={currentQuestion}
                    onOptionSelect={handleOptionSelect}
                    selectedOptionIndex={selectedOptionIndex}
                    onNext={handleNext}
                    onBack={handleBack}
                    isFirstQuestion={currentQuestionIndex === 0}
                    isLastQuestion={currentQuestionIndex === quizQuestions.length - 1}
                />
            </main>
        </div>
    );
};

export default QuizPage;