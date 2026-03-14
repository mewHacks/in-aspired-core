// Reusable tooltip component with configurable position and arrow
import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

interface TooltipProps {
    content: string;
    subtitle?: string; // Optional subtitle (e.g., "System Administrator")
    children: React.ReactNode;
    position?: 'top' | 'bottom' | 'left' | 'right';
    className?: string;
    delay?: number;
}

const Tooltip: React.FC<TooltipProps> = ({
    content,
    subtitle,
    children,
    position = 'top',
    className = '',
    delay = 0.2
}) => {
    const [isVisible, setIsVisible] = useState(false);

    // Position styles
    const positionClasses = {
        top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
        bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
        left: 'right-full top-1/2 -translate-y-1/2 mr-2',
        right: 'left-full top-1/2 -translate-y-1/2 ml-2',
    };

    // Arrow styles
    const arrowClasses = {
        top: 'bottom-[-6px] left-1/2 -translate-x-1/2 border-t-slate-900 border-l-transparent border-r-transparent border-b-transparent',
        bottom: 'top-[-6px] left-1/2 -translate-x-1/2 border-b-slate-900 border-l-transparent border-r-transparent border-t-transparent',
        left: 'right-[-6px] top-1/2 -translate-y-1/2 border-l-slate-900 border-t-transparent border-b-transparent border-r-transparent',
        right: 'left-[-6px] top-1/2 -translate-y-1/2 border-r-slate-900 border-t-transparent border-b-transparent border-l-transparent',
    };

    return (
        <div
            className={`relative inline-flex ${className}`}
            onMouseEnter={() => setIsVisible(true)}
            onMouseLeave={() => setIsVisible(false)}
        >
            {children}

            <AnimatePresence>
                {isVisible && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, ...getPositionAnimations(position).initial }}
                        animate={{ opacity: 1, scale: 1, ...getPositionAnimations(position).animate }}
                        exit={{ opacity: 0, scale: 0.9, ...getPositionAnimations(position).initial }}
                        transition={{ duration: 0.15, delay }}
                        className={`absolute z-50 ${positionClasses[position]} flex flex-col items-center pointer-events-none`}
                    >
                        <div className="bg-slate-900 text-white rounded-xl px-4 py-2.5 shadow-xl min-w-[max-content] max-w-xs text-center border border-slate-800">
                            <div className="font-bold text-sm text-center">{content}</div>
                            {subtitle && (
                                <div className="text-xs text-gray-400 mt-0.5 font-medium">{subtitle}</div>
                            )}
                        </div>

                        {/* CSS Arrow using borders */}
                        <div className={`absolute w-0 h-0 border-[6px] ${arrowClasses[position]}`} />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

// Helper for animations based on position
const getPositionAnimations = (position: string) => {
    switch (position) {
        case 'top': return { initial: { y: 5 }, animate: { y: 0 } };
        case 'bottom': return { initial: { y: -5 }, animate: { y: 0 } };
        case 'left': return { initial: { x: 5 }, animate: { x: 0 } };
        case 'right': return { initial: { x: -5 }, animate: { x: 0 } };
        default: return { initial: { y: 5 }, animate: { y: 0 } };
    }
};

export default Tooltip;
