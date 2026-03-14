// Button.test.tsx
// Unit tests for the reusable Button component (Verifies rendering, user interaction, loading states and variant styling)

import { describe, it, expect, vi } from 'vitest'; // Vitest testing utilities
import { render, screen, fireEvent } from '@testing-library/react'; // React testing library (RTL) utilities
import React from 'react';

import { Button } from '../../components/ui/Button'; // Button component to test

// Main test suite for Button component
describe('Button Component', () => {

    // Test 1: Render children passed to Button correctly
    it('should render children correctly', () => {

        // Render Button with text child
        render(<Button>Click me</Button>);

        // Assert that text appears in the document
        expect(screen.getByText('Click me')).toBeInTheDocument();
    });

    // Test 2: Button should invoke onClick handler when clicked
    it('should handle onClick events', () => {

        // Create a mock click handler and render Button with it via onclick prop
        const handleClick = vi.fn();
        render(<Button onClick={handleClick}>Click me</Button>);

        // Simulate user clicking the button
        fireEvent.click(screen.getByText('Click me'));

        // Assert that onClick handler was called once
        expect(handleClick).toHaveBeenCalledTimes(1);
    });

    // Test 3: Button should show loading spinner when isLoading is true
    it('should show loading spinner when isLoading is true', () => {

        // Render Button in loading state
        render(<Button isLoading>Submit</Button>);

        // Check if button is disabled
        expect(screen.getByRole('button')).toBeDisabled();

        // Spinner is rendered as an SVG with animate-spin class
        const spinner = document.querySelector('.animate-spin');

        // Assert spinner exists in DOM
        expect(spinner).toBeInTheDocument();
    });

    // Test 4: Button should apply correct styling based on variant prop
    it('should apply variant classes', () => {

        // Render Button with variant="danger" and assert danger styling applied
        const { rerender } = render(<Button variant="danger">Delete</Button>);
        expect(screen.getByRole('button')).toHaveClass('bg-red-500');

        // Render Button with variant="outline" and assert outline styling applied 
        rerender(<Button variant="outline">Cancel</Button>);
        expect(screen.getByRole('button')).toHaveClass('border-primary-600');
    });

    // Test 5: Button should be disabled when disabled prop is set
    it('should be disabled when disabled prop is set', () => {

        // Render disabled Button 
        render(<Button disabled>Disabled</Button>);

        // Assert button is disabled
        expect(screen.getByRole('button')).toBeDisabled();
    });

    // Test 6: The component correctly forwards a React ref to the underlying button element
    it('should forward ref to the button element', () => {
        const ref = React.createRef<HTMLButtonElement>();
        render(<Button ref={ref}>Ref Button</Button>);
        expect(ref.current).toBeInstanceOf(HTMLButtonElement);
        expect(ref.current).toHaveTextContent('Ref Button');
    });

    // Test 7: Arbitrary HTML attributes (data-testid, aria-label) are passed through to the button
    it('should pass extra props to the button element', () => {
        render(<Button data-testid="extra-prop-btn" aria-label="custom-label">Extra</Button>);
        const btn = screen.getByTestId('extra-prop-btn');
        expect(btn).toHaveAttribute('aria-label', 'custom-label');
    });
});
