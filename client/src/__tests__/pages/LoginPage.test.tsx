// LoginPage.test.tsx
// Integration tests for the Login Page (Form validation, API authentication calls and routing behavior) 

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LoginPage from '../../pages/LoginPage';
import { BrowserRouter } from 'react-router-dom';
import { ConfirmProvider } from '../../contexts/ConfirmContext';


// Mock auth actions
const mockLogin = vi.fn();
const mockGoogleLogin = vi.fn();

// Mock navigation
const mockNavigate = vi.fn();

// Mock ConfirmContext alert
const mockAlertAction = vi.fn();


// Mock AuthContext
vi.mock('../../contexts/AuthContext', () => ({
    useAuth: () => ({
        login: mockLogin,
        googleLogin: mockGoogleLogin,
    }),
}));

// Mock ConfirmContext
vi.mock('../../contexts/ConfirmContext', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../../contexts/ConfirmContext')>();
    return {
        ...actual,
        useConfirm: () => ({
            confirm: vi.fn(),
            alert: mockAlertAction,
        }),
    };
});


// Mock react-router-dom
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => mockNavigate,
    };
});

// Mock Google OAuth Login Hook
vi.mock('@react-oauth/google', () => ({
    useGoogleLogin: (config: any) => {

        // Return mock login function
        return vi.fn(() => {
            // Simulate success callback for testing
            if (config.onSuccess) {
                config.onSuccess({ access_token: 'fake-token' });
            }
        });
    }
}));

// Main test suite for LoginPage
describe('LoginPage Integration', () => {

    // Clear all mocks before each test
    beforeEach(() => {
        vi.clearAllMocks();
    });

    // Helper function to render page with Router context
    const renderPage = () => {
        render(
            <BrowserRouter>
                <ConfirmProvider>
                    <LoginPage />
                </ConfirmProvider>
            </BrowserRouter>
        );

    };

    // Test 1: Basic form elements render
    it('should render login form elements', () => {
        renderPage();
        expect(screen.getByPlaceholderText('john@example.com')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Enter your password')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Sign In/i })).toBeInTheDocument();
        expect(screen.getByText('Welcome Back')).toBeInTheDocument();
    });

    // Test 2: Invalid email triggers validation errors, disable submit
    it('should show validation errors for invalid email', () => {

        // Render page and find email input
        renderPage();
        const emailInput = screen.getByPlaceholderText('john@example.com');

        // Simulate invalid email input and blur to trigger validation
        fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
        fireEvent.blur(emailInput);

        // Assert that specific validation error message is displayed
        expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();

        // Submit button should be disabled due to validation error
        expect(screen.getByRole('button', { name: /Sign In/i })).toBeDisabled();
    });

    // Test 3: Valid credentials trigger successful login
    it('should call login with correct credentials on submission', async () => {

        // Render page and find form elements
        renderPage();
        const emailInput = screen.getByPlaceholderText('john@example.com');
        const passwordInput = screen.getByPlaceholderText('Enter your password');
        const submitButton = screen.getByRole('button', { name: /Sign In/i });

        // Simulate valid email and password input
        fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
        fireEvent.change(passwordInput, { target: { value: 'Password123!' } });

        // Wait for validation effects (if any)
        await waitFor(() => {
            expect(submitButton).not.toBeDisabled();
        });

        // Submit form
        fireEvent.click(submitButton);

        // Assert that login was called with correct credentials
        expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'Password123!', false);
    });

    // Test 4: Successful login triggers navigation
    it('should navigate to home on successful login', async () => {

        // Mock successful login
        mockLogin.mockResolvedValueOnce(undefined);

        // Render page and find form elements
        renderPage();
        const emailInput = screen.getByPlaceholderText('john@example.com');
        const passwordInput = screen.getByPlaceholderText('Enter your password');
        const submitButton = screen.getByRole('button', { name: /Sign In/i });

        // Simulate valid email and password input
        fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
        fireEvent.change(passwordInput, { target: { value: 'Password123!' } });

        // Wait for validation effects (if any)
        await waitFor(() => expect(submitButton).not.toBeDisabled());

        // Submit form
        fireEvent.click(submitButton);

        // Wait for navigation side effect
        await waitFor(() => {
            expect(mockNavigate).toHaveBeenCalledWith('/');
        });
    });

    // Test 5: Handle login failure
    it('should handle login failure', async () => {

        // Mock login failure
        mockLogin.mockRejectedValueOnce(new Error('Invalid credentials'));

        // Render page and find form elements

        renderPage();
        const emailInput = screen.getByPlaceholderText('john@example.com');
        const passwordInput = screen.getByPlaceholderText('Enter your password');
        const submitButton = screen.getByRole('button', { name: /Sign In/i });

        // Simulate invalid email and password input
        fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
        fireEvent.change(passwordInput, { target: { value: 'WrongPass!' } });

        // Wait for validation effects (if any)
        await waitFor(() => expect(submitButton).not.toBeDisabled());

        // Submit form
        fireEvent.click(submitButton);

        // Wait for alert side effect
        await waitFor(() => {
            expect(mockAlertAction).toHaveBeenCalledWith(expect.objectContaining({
                message: 'Invalid credentials',
                variant: 'danger'
            }));
        });
    });
});

