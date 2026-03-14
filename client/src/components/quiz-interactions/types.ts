// Shared TypeScript interface for quiz interaction view components
import { QuizQuestion } from '../../data/quizQuestions';

export interface InteractionProps {
    question: QuizQuestion;
    onOptionSelect: (index: number) => void;
    selectedOptionIndex: number | null;
    onNext: () => void;
    onBack: () => void;
    isFirstQuestion: boolean;
    isLastQuestion: boolean;
}
