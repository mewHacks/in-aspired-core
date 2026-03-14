// SignupPage.test.tsx
// Integration tests for the User Sign Up Page (Verifies form interactions, field validation (email/password) and API submission)
// Mocks window.fetch to simulate backend responses

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SignUpPage from '../../pages/SignupPage';
import { BrowserRouter } from 'react-router-dom';
import { ConfirmProvider } from '../../contexts/ConfirmContext';


// Mock google login handler from AuthContext and navigation 
const mockGoogleLogin = vi.fn();
const mockNavigate = vi.fn();

// Mock ConfirmContext alert
const mockAlertAction = vi.fn();


// Mock AuthContext
vi.mock('../../contexts/AuthContext', () => ({
    useAuth: () => ({
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

    // Import actual router to preserve other exports
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        // Replace useNavigate with mock
        useNavigate: () => mockNavigate,
    };
});

// Mock Google OAuth Login Hook
vi.mock('@react-oauth/google', () => ({
    useGoogleLogin: () => vi.fn(),
}));

// Main test suite for sign up page
describe('SignUpPage Integration', () => {

    // Preserve original fetch so we can restore it after tests
    const originalFetch = global.fetch;

    // Mock fetch
    const mockFetch = vi.fn();


    // Setup mocks before each test 
    beforeEach(() => {
        // Clear all mocks
        vi.clearAllMocks();

        // Replace global fetch with mock
        global.fetch = mockFetch;
    });


    // Restore original fetch after each test
    afterEach(() => {
        global.fetch = originalFetch;
    });

    // Helper function to render page with Router context
    const renderPage = () => {
        render(
            <BrowserRouter>
                <ConfirmProvider>
                    <SignUpPage />
                </ConfirmProvider>
            </BrowserRouter>
        );

    };

    // Test 1: Render signup form elements
    it('should render signup form elements', () => {

        // Render page and check form elements
        renderPage();
        expect(screen.getByPlaceholderText('John Doe')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('john@example.com')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Create a strong password')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Re-enter your password')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Create Account/i })).toBeInTheDocument();
    });

    // Test 2: Validate inputs and enable submit button
    it('should valid inputs and enable submit button', async () => {

        // Render page and get form elements
        renderPage();
        const nameInput = screen.getByPlaceholderText('John Doe');
        const emailInput = screen.getByPlaceholderText('john@example.com');
        const passwordInput = screen.getByPlaceholderText('Create a strong password');
        const confirmInput = screen.getByPlaceholderText('Re-enter your password');
        const termsCheckbox = screen.getByRole('checkbox', { name: /I agree to the/i });
        const submitButton = screen.getByRole('button', { name: /Create Account/i });

        // Initially disabled
        expect(submitButton).toBeDisabled();

        // Fill form and check terms checkbox
        fireEvent.change(nameInput, { target: { value: 'Test User' } });
        fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
        fireEvent.change(passwordInput, { target: { value: 'StrongPass1!' } });
        fireEvent.change(confirmInput, { target: { value: 'StrongPass1!' } });
        fireEvent.click(termsCheckbox);

        // Should be enabled now
        await waitFor(() => {
            expect(submitButton).not.toBeDisabled();
        });
    });

    // Test 3: Show validation errors
    it('should show validation errors', () => {

        // Render page and get email input
        renderPage();
        const emailInput = screen.getByPlaceholderText('john@example.com');

        // Change value to invalid email
        fireEvent.change(emailInput, { target: { value: 'invalid-email' } });

        // Error should appear immediately due to handleChange logic in SignUpPage
        expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();
    });

    // Test 4: Submit form and show success alert
    it('should submit form and show success alert on successful signup', async () => {

        // Mock successful API response
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ message: 'Success' }),
        });

        // Render page
        renderPage();

        // Fill form and check terms checkbox
        fireEvent.change(screen.getByPlaceholderText('John Doe'), { target: { value: 'Test User' } });
        fireEvent.change(screen.getByPlaceholderText('john@example.com'), { target: { value: 'newuser@example.com' } });
        fireEvent.change(screen.getByPlaceholderText('Create a strong password'), { target: { value: 'StrongPass1!' } });
        fireEvent.change(screen.getByPlaceholderText('Re-enter your password'), { target: { value: 'StrongPass1!' } });
        fireEvent.click(screen.getByRole('checkbox', { name: /I agree to the/i }));
        const submitButton = screen.getByRole('button', { name: /Create Account/i });

        // Wait for submit button to become enabled
        await waitFor(() => expect(submitButton).not.toBeDisabled());

        // Click submit button
        fireEvent.click(submitButton);

        // Wait for side effects
        await waitFor(() => {

            // Assert correct API call
            expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/api/auth/signup'), expect.objectContaining({
                method: 'POST',
                body: JSON.stringify({
                    name: 'Test User',
                    email: 'newuser@example.com',
                    password: 'StrongPass1!'
                })
            }));

            // Assert success feedback
            expect(mockAlertAction).toHaveBeenCalledWith(expect.objectContaining({
                message: 'Registration successful. Please check your email to verify your account before logging in.',
                variant: 'info'
            }));
        });
    });


    // Test 5: Handle signup failure
    it('should handle signup failure', async () => {

        // Mock failed API response
        mockFetch.mockResolvedValueOnce({
            ok: false,
            json: async () => ({ message: 'Email already exists' }),
        });

        // Render page
        renderPage();

        // Fill form
        fireEvent.change(screen.getByPlaceholderText('John Doe'), { target: { value: 'Existing User' } });
        fireEvent.change(screen.getByPlaceholderText('john@example.com'), { target: { value: 'exists@example.com' } });
        fireEvent.change(screen.getByPlaceholderText('Create a strong password'), { target: { value: 'StrongPass1!' } });
        fireEvent.change(screen.getByPlaceholderText('Re-enter your password'), { target: { value: 'StrongPass1!' } });
        fireEvent.click(screen.getByRole('checkbox', { name: /I agree to the/i }));

        // Submit form
        const submitButton = screen.getByRole('button', { name: /Create Account/i });
        fireEvent.click(submitButton);

        // Assert error feedback
        await waitFor(() => {
            expect(mockAlertAction).toHaveBeenCalledWith(expect.objectContaining({
                message: 'Email already exists',
                variant: 'danger'
            }));
        });
    });
});

