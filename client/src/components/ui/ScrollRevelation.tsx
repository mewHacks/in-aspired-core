// Scroll-triggered reveal animation wrapper using Intersection Observer
import React, { useRef } from 'react';
import { motion, useInView } from 'framer-motion';

interface ScrollRevelationProps {
    children: React.ReactNode;
    className?: string;
    direction?: 'up' | 'down' | 'left' | 'right'; // Kept for compatibility, but animation will be bottom-up
    delay?: number;
    duration?: number;
}

const ScrollRevelation: React.FC<ScrollRevelationProps> = ({
    children,
    className = "",
    direction: _direction = 'up', // Renamed to _direction to suppress unused warning
    delay = 0,
    duration = 0.8
}) => {
    const ref = useRef<HTMLDivElement>(null);
    const isInView = useInView(ref, { once: true, margin: "-10% 0px" });

    return (
        <motion.div
            ref={ref}
            initial={{ opacity: 0, y: 40 }} // Start slightly below
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
            transition={{
                duration: duration,
                delay: delay,
                ease: [0.21, 0.47, 0.32, 0.98] // Smooth, "premium" easing
            }}
            style={{ willChange: 'opacity, transform' }}
            className={className}
        >
            {children}
        </motion.div>
    );
};

export default ScrollRevelation;
