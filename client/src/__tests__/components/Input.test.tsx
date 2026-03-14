// Input.test.tsx
// Unit tests for the reusable Input component
// Verifies label rendering, icon integration, onChange handling, error/success states,
// password visibility toggle, custom className merging, ref forwarding, and extra prop passthrough

import { describe, it, expect, vi } from 'vitest'; // Vitest testing utilities
import { render, screen, fireEvent } from '@testing-library/react'; // RTL rendering + DOM queries
import React from 'react';
import { Input } from '../../components/ui/Input'; // Input component under test
import { Mail } from 'lucide-react'; // Icon used to test the icon prop

// Main test suite for the Input component
describe('Input Component', () => {

    // Test 1: Input should display its label text and placeholder attribute
    it('renders with label and placeholder', () => {
        render(<Input label="Email Address" placeholder="Enter email" />);
        expect(screen.getByText('Email Address')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Enter email')).toBeInTheDocument();
    });

    // Test 2: When an icon prop is provided, the input receives left-padding for the icon
    it('renders with an icon properly', () => {
        render(<Input icon={Mail} label="Email" />);
        // Lucide icons render as an SVG; verify the input has pl-10 padding to make room
        const input = screen.getByRole('textbox');
        expect(input).toHaveClass('pl-10');
    });

    // Test 3: The onChange callback fires when the user types into the input
    it('handles onChange events', () => {
        const handleChange = vi.fn();
        render(<Input onChange={handleChange} />);

        const input = screen.getByRole('textbox');
        fireEvent.change(input, { target: { value: 'test' } });

        expect(handleChange).toHaveBeenCalledTimes(1);
    });

    // Test 4: When an error string is passed, it renders the error message and applies red border
    it('displays error message and styles', () => {
        render(<Input error="Invalid email" />);
        expect(screen.getByText('Invalid email')).toBeInTheDocument();
        const input = screen.getByRole('textbox');
        expect(input).toHaveClass('border-red-300');
    });

    // Test 5: When success is true, a "Looks good!" message renders with green border
    it('displays success message and styles', () => {
        render(<Input success={true} />);
        expect(screen.getByText('Looks good!')).toBeInTheDocument();
        const input = screen.getByRole('textbox');
        expect(input).toHaveClass('border-green-300');
    });

    // Test 6: Password inputs with showPasswordToggle can switch between hidden and visible text
    it('toggles password visibility', () => {
        render(<Input type="password" showPasswordToggle={true} placeholder="Password" />);

        const input = screen.getByPlaceholderText('Password');
        // Initially the type should be "password" (hidden)
        expect(input).toHaveAttribute('type', 'password');

        // Click the visibility toggle button to reveal the password
        const toggleBtn = screen.getByRole('button', { name: /show password/i });
        fireEvent.click(toggleBtn);
        expect(input).toHaveAttribute('type', 'text');

        // Click again to hide the password
        fireEvent.click(toggleBtn);
        expect(input).toHaveAttribute('type', 'password');
    });

    // Test 7: Custom className prop is merged with the component's default classes
    it('applies custom className', () => {
        render(<Input className="custom-test-class" />);
        const input = screen.getByRole('textbox');
        expect(input).toHaveClass('custom-test-class');
    });

    // Test 8: The component correctly forwards a React ref to the underlying input element
    it('forwards ref to the input element', () => {
        const ref = React.createRef<HTMLInputElement>();
        render(<Input ref={ref} />);
        expect(ref.current).toBeInstanceOf(HTMLInputElement);
    });

    // Test 9: Arbitrary HTML attributes (data-testid, max, etc.) are passed through to the input
    it('passes extra props to the input element', () => {
        render(<Input data-testid="custom-input" max="100" />);
        const input = screen.getByTestId('custom-input');
        expect(input).toHaveAttribute('max', '100');
    });
});
