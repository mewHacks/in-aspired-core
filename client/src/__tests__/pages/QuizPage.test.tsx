// QuizPage.test.tsx
// Integration tests for the RIASEC Personality Quiz page
// Verifies question rendering, navigation between questions, progress tracking,
// localStorage-based resume functionality, and final quiz submission to /api/recommend
// Uses a mocked localStorage and global.fetch to isolate component behaviour

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom'; // QuizPage uses useNavigate for post-submission redirect
import QuizPage from '../../pages/QuizPage';
import { ConfirmProvider } from '../../contexts/ConfirmContext';

import { quizQuestions } from '../../data/quizQuestions'; // Actual quiz data used to validate rendered text

// Mock global fetch — intercepts the POST /api/recommend call on quiz completion
global.fetch = vi.fn();

// Mock Navbar to avoid pulling in AuthContext/Router dependencies from the layout
vi.mock('../../components/layout/Navbar', () => ({
    default: () => <div data-testid="mock-navbar">Navbar</div>
}));

// Mock localStorage — provides an in-memory store for quiz progress persistence
const localStorageMock = (function () {
    let store: Record<string, string> = {};
    return {
        getItem: (key: string) => store[key] || null,
        setItem: (key: string, value: string) => { store[key] = value.toString(); },
        removeItem: (key: string) => { delete store[key]; },
        clear: () => { store = {}; }
    };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Main test suite for the QuizPage component
describe('QuizPage Integration', () => {

    // Reset mocks and localStorage before each test for isolation
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
    });

    // Cleanup rendered DOM after each test to prevent state leakage
    afterEach(() => {
        cleanup();
    });

    // Helper — renders QuizPage inside BrowserRouter and ConfirmProvider context
    const renderQuiz = () => {
        render(
            <BrowserRouter>
                <ConfirmProvider>
                    <QuizPage />
                </ConfirmProvider>
            </BrowserRouter>
        );
    };

    // Test 1: On initial load (no saved progress), the first question should render
    it('renders first question initially', () => {
        renderQuiz();
        const firstQ = quizQuestions[0];
        // The scenario text of question 1 must be visible
        expect(screen.getByText(firstQ.scenario)).toBeInTheDocument();
    });

    // Test 2: Progress bar shows current position out of total questions
    it('renders progress bar correctly', () => {
        renderQuiz();
        // Expect "1 / N" format where N is the total number of quiz questions
        expect(screen.getByText(`1 / ${quizQuestions.length}`)).toBeInTheDocument();
    });

    // Test 3: Selecting an option and clicking Next advances to the second question
    it('navigates to next question after selection and click', async () => {
        renderQuiz();

        // Step 1: Click the first option of question 1
        const firstOption = quizQuestions[0].options[0];
        const optionBtn = screen.getByText(firstOption.label);
        fireEvent.click(optionBtn);

        // Step 2: Click the "Next Question" button to advance
        const nextBtn = screen.getByRole('button', { name: /Next Question|Next/i });
        fireEvent.click(nextBtn);

        // Step 3: Verify the second question's scenario text now appears
        const secondQ = quizQuestions[1];
        await waitFor(() => {
            expect(screen.getByText(secondQ.scenario)).toBeInTheDocument();
        });
    });

    // Test 4: Submitting the quiz on the last question sends results to the API
    // Uses localStorage to fast-forward to the last question (avoids clicking through all N questions)
    it('submits quiz on last question', async () => {
        renderQuiz();

        // Mock a successful recommendation API response
        (global.fetch as any).mockResolvedValue({
            ok: true,
            json: async () => ({ topDomains: [], recommendedCourses: [] })
        });

        // Fast-forward to the last question by seeding localStorage with saved progress
        // The guest scoped key is used because AuthContext isn't providing a user ID here
        const userKey = 'personalityTestProgress_guest';

        const lastIndex = quizQuestions.length - 1;
        const fakeState = {
            currentQuestionIndex: lastIndex,
            scores: { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 },
            history: Array(lastIndex).fill(0) // Fill history with placeholder selections
        };

        localStorage.setItem(userKey, JSON.stringify(fakeState));

        // Re-render to pick up the saved progress from localStorage
        renderQuiz();

        // If a "Resume Test" prompt appears, click it to continue from saved state
        const resumeBtn = screen.queryByText(/Resume Test/i);
        if (resumeBtn) {
            fireEvent.click(resumeBtn);
        }

        // Verify the last question is now displayed
        const lastQ = quizQuestions[lastIndex];
        await waitFor(() => {
            expect(screen.getByText(lastQ.scenario)).toBeInTheDocument();
        });

        // Select the first option on the last question
        // SceneSelectionView may render visualLabel instead of label for the final question
        const targetText = lastQ.options[0].visualLabel || lastQ.options[0].label;
        const optionBtn = screen.getByText(targetText);
        fireEvent.click(optionBtn);

        // Click the "Finish" button (replaces "Next Question" on the final question)
        const submitBtn = await screen.findByRole('button', { name: /Finish/i });
        fireEvent.click(submitBtn);

        // Verify the quiz results were submitted to the recommendation API
        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/api/recommend'), expect.any(Object));
        });
    });
});
