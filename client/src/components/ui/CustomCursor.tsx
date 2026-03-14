// Custom animated cursor component with spring physics and hover detection
import React, { useState, useEffect, useCallback } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';

interface CursorState {
    isHovering: boolean;
    isClicking: boolean;
    isHidden: boolean;
    cursorText: string;
}

const CustomCursor: React.FC = () => {
    // Track cursor position with motion values for smooth animation
    const cursorX = useMotionValue(-100);
    const cursorY = useMotionValue(-100);

    // Spring physics for smooth trailing effect (high stiffness = less delay)
    const springConfig = { damping: 40, stiffness: 1500, mass: 0.2 };
    const cursorXSpring = useSpring(cursorX, springConfig);
    const cursorYSpring = useSpring(cursorY, springConfig);

    // Outer ring with slight trail effect
    const ringSpringConfig = { damping: 35, stiffness: 600, mass: 0.3 };
    const ringXSpring = useSpring(cursorX, ringSpringConfig);
    const ringYSpring = useSpring(cursorY, ringSpringConfig);

    const [cursorState, setCursorState] = useState<CursorState>({
        isHovering: false,
        isClicking: false,
        isHidden: false,
        cursorText: '',
    });

    // Update cursor position
    const handleMouseMove = useCallback((e: MouseEvent) => {
        cursorX.set(e.clientX);
        cursorY.set(e.clientY);
    }, [cursorX, cursorY]);

    // Handle mouse down/up for click effects
    const handleMouseDown = useCallback(() => {
        setCursorState(prev => ({ ...prev, isClicking: true }));
    }, []);

    const handleMouseUp = useCallback(() => {
        setCursorState(prev => ({ ...prev, isClicking: false }));
    }, []);

    // Handle hover states for interactive elements
    const handleMouseOver = useCallback((e: MouseEvent) => {
        const target = e.target as HTMLElement;

        // Check if hovering over interactive elements
        const isInteractive = target.closest('a, button, [role="button"], input, textarea, select, [data-cursor="pointer"]');
        const cursorText = target.closest('[data-cursor-text]')?.getAttribute('data-cursor-text') || '';

        if (isInteractive) {
            setCursorState(prev => ({ ...prev, isHovering: true, cursorText }));
        }
    }, []);

    const handleMouseOut = useCallback((e: MouseEvent) => {
        const target = e.target as HTMLElement;
        const isInteractive = target.closest('a, button, [role="button"], input, textarea, select, [data-cursor="pointer"]');

        if (isInteractive) {
            setCursorState(prev => ({ ...prev, isHovering: false, cursorText: '' }));
        }
    }, []);

    // Hide cursor when leaving window
    const handleMouseLeave = useCallback(() => {
        setCursorState(prev => ({ ...prev, isHidden: true }));
    }, []);

    const handleMouseEnter = useCallback(() => {
        setCursorState(prev => ({ ...prev, isHidden: false }));
    }, []);

    useEffect(() => {
        // Check if device supports hover (not touch-only)
        const hasHover = window.matchMedia('(hover: hover)').matches;
        if (!hasHover) return;

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mousedown', handleMouseDown);
        window.addEventListener('mouseup', handleMouseUp);
        window.addEventListener('mouseover', handleMouseOver);
        window.addEventListener('mouseout', handleMouseOut);
        document.documentElement.addEventListener('mouseleave', handleMouseLeave);
        document.documentElement.addEventListener('mouseenter', handleMouseEnter);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mousedown', handleMouseDown);
            window.removeEventListener('mouseup', handleMouseUp);
            window.removeEventListener('mouseover', handleMouseOver);
            window.removeEventListener('mouseout', handleMouseOut);
            document.documentElement.removeEventListener('mouseleave', handleMouseLeave);
            document.documentElement.removeEventListener('mouseenter', handleMouseEnter);
        };
    }, [handleMouseMove, handleMouseDown, handleMouseUp, handleMouseOver, handleMouseOut, handleMouseLeave, handleMouseEnter]);

    // Don't render on touch devices
    const [isTouchDevice, setIsTouchDevice] = useState(false);
    useEffect(() => {
        setIsTouchDevice(!window.matchMedia('(hover: hover)').matches);
    }, []);

    if (isTouchDevice) return null;

    const { isHovering, isClicking, isHidden, cursorText } = cursorState;

    return (
        <>
            {/* Hide default cursor globally */}
            <style>{`
                * {
                    cursor: none !important;
                }
            `}</style>

            {/* Inner dot - follows cursor closely */}
            <motion.div
                className="fixed top-0 left-0 pointer-events-none z-[10001] mix-blend-difference dark:mix-blend-difference"
                style={{
                    x: cursorXSpring,
                    y: cursorYSpring,
                }}
                animate={{
                    scale: isClicking ? 0.8 : isHovering ? 0.5 : 1,
                    opacity: isHidden ? 0 : 1,
                }}
                transition={{ duration: 0.15 }}
            >
                <div
                    className="relative flex items-center justify-center"
                    style={{
                        width: isHovering ? '8px' : '12px',
                        height: isHovering ? '8px' : '12px',
                        marginLeft: isHovering ? '-4px' : '-6px',
                        marginTop: isHovering ? '-4px' : '-6px',
                        borderRadius: '50%',
                        backgroundColor: 'white',
                        transition: 'width 0.2s, height 0.2s, margin 0.2s',
                    }}
                />
            </motion.div>

            {/* Outer ring - follows with lag for trail effect */}
            <motion.div
                className="fixed top-0 left-0 pointer-events-none z-[10000]"
                style={{
                    x: ringXSpring,
                    y: ringYSpring,
                }}
                animate={{
                    scale: isClicking ? 0.9 : isHovering ? 1.5 : 1,
                    opacity: isHidden ? 0 : isHovering ? 0.8 : 0.4,
                }}
                transition={{ duration: 0.2 }}
            >
                <div
                    style={{
                        width: '40px',
                        height: '40px',
                        marginLeft: '-20px',
                        marginTop: '-20px',
                        borderRadius: '50%',
                        border: `2px solid ${isHovering ? '#6366f1' : '#1f2937'}`,
                        backgroundColor: isHovering ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
                        transition: 'border-color 0.3s, background-color 0.3s',
                    }}
                />
            </motion.div>

            {/* Cursor text label (optional) */}
            {cursorText && (
                <motion.div
                    className="fixed top-0 left-0 pointer-events-none z-[9999]"
                    style={{
                        x: ringXSpring,
                        y: ringYSpring,
                    }}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                >
                    <div
                        className="absolute top-8 left-1/2 -translate-x-1/2 px-3 py-1 bg-indigo-600 dark:bg-indigo-500 text-white text-xs font-medium rounded-full whitespace-nowrap shadow-lg dark:shadow-indigo-950/50"
                    >
                        {cursorText}
                    </div>
                </motion.div>
            )}
        </>
    );
};

export default CustomCursor;