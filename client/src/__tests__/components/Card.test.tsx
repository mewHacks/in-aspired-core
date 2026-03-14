// Card.test.tsx
// Unit tests for the reusable Card container component
// Verifies child rendering, default CSS classes, className merging, animation support,
// HTML attribute passthrough, event listener handling, and ref forwarding

import { describe, it, expect, vi } from 'vitest'; // Vitest testing utilities
import { render, screen, fireEvent } from '@testing-library/react'; // RTL rendering + DOM queries
import { Card } from '../../components/ui/Card'; // Card component under test
import React from 'react';

// Main test suite for the Card component
describe('Card Component', () => {

    // Test 1: Children passed to Card should render inside the container
    it('renders children correctly', () => {
        render(<Card>Test Content</Card>);
        expect(screen.getByText('Test Content')).toBeInTheDocument();
    });

    // Test 2: The Card should always include its base styling classes (white bg, rounded corners, shadow)
    it('applies default classes', () => {
        render(<Card>Content</Card>);
        const card = screen.getByText('Content');
        expect(card).toHaveClass('bg-white', 'rounded-2xl', 'shadow-xl');
    });

    // Test 3: A custom className prop should be merged with (not replace) the default classes
    it('merges custom className with default classes', () => {
        render(<Card className="custom-class">Content</Card>);
        const card = screen.getByText('Content');
        expect(card).toHaveClass('bg-white', 'custom-class');
    });

    // Test 4: When withAnimation is true, the fade-in animation class should be applied
    it('applies animation class when withAnimation is true', () => {
        render(<Card withAnimation>Content</Card>);
        const card = screen.getByText('Content');
        expect(card).toHaveClass('animate-fade-in');
    });

    // Test 5: Standard HTML attributes (id, data-testid) should pass through to the underlying div
    it('passes through standard HTML attributes', () => {
        render(<Card id="test-card" data-testid="card-test">Content</Card>);
        const card = screen.getByTestId('card-test');
        expect(card).toHaveAttribute('id', 'test-card');
    });

    // Test 6: Event listeners (e.g. onClick) should fire when the Card is interacted with
    it('handles event listeners', () => {
        const handleClick = vi.fn();
        render(<Card onClick={handleClick}>Click Me</Card>);
        const card = screen.getByText('Click Me');
        fireEvent.click(card);
        expect(handleClick).toHaveBeenCalledTimes(1);
    });

    // Test 7: The component correctly forwards a React ref to the underlying div element
    it('forwards ref to the div element', () => {
        const ref = React.createRef<HTMLDivElement>();
        render(<Card ref={ref}>Ref Content</Card>);
        expect(ref.current).toBeInstanceOf(HTMLDivElement);
        expect(ref.current).toHaveTextContent('Ref Content');
    });
});
