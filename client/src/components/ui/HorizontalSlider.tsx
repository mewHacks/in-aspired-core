// Horizontal scrollable slider with arrow navigation
import React, { useRef, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface HorizontalSliderProps {
    children: React.ReactNode;
    title: string;
    titleColor?: string; // Tailwind color class for the title bar
    viewMoreLink?: string;
    viewMoreText?: string;
}

/**
 * Horizontal slider component with left/right arrows
 * Shows items with horizontal scroll and navigation arrows
 */
const HorizontalSlider: React.FC<HorizontalSliderProps> = ({
    children,
    title,
    titleColor = 'bg-indigo-500',
    viewMoreLink,
    viewMoreText = 'View more'
}) => {
    const scrollRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);

    // Check scroll position to show/hide arrows
    const checkScrollPosition = () => {
        if (scrollRef.current) {
            const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
            setCanScrollLeft(scrollLeft > 0);
            setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
        }
    };

    useEffect(() => {
        checkScrollPosition();
        const scrollEl = scrollRef.current;
        if (scrollEl) {
            scrollEl.addEventListener('scroll', checkScrollPosition);
            window.addEventListener('resize', checkScrollPosition);
        }
        return () => {
            if (scrollEl) {
                scrollEl.removeEventListener('scroll', checkScrollPosition);
            }
            window.removeEventListener('resize', checkScrollPosition);
        };
    }, [children]);

    const scroll = (direction: 'left' | 'right') => {
        if (scrollRef.current) {
            const cardWidth = 320; // Approximate card width + gap
            const scrollAmount = direction === 'left' ? -cardWidth : cardWidth;
            scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
        }
    };

    return (
        <div className="relative">
            {/* Section Header */}
            <div className="flex items-center gap-4 mb-6">
                <div className={`h-10 w-1 ${titleColor} rounded-full`}></div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{title}</h2>
            </div>

            {/* Slider Container with padding for arrows */}
            <div className="relative">
                {/* Left Arrow - positioned outside cards */}
                {canScrollLeft && (
                    <button
                        onClick={() => scroll('left')}
                        className="absolute -left-5 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white rounded-full shadow-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-700 hover:scale-110 transition-all"
                        aria-label="Scroll left"
                    >
                        <ChevronLeft className="w-5 h-5 text-gray-700" />
                    </button>
                )}

                {/* Scrollable Content with View More Card */}
                <div
                    ref={scrollRef}
                    className="flex gap-5 overflow-x-auto scrollbar-hide scroll-smooth pb-4 px-1"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                    {children}

                    {/* View More Card - inline after last card */}
                    {viewMoreLink && (
                        <div
                            onClick={() => navigate(viewMoreLink)}
                            className="flex-shrink-0 w-48 min-h-[180px] bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700 p-5 hover:border-gray-400 dark:hover:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-300 cursor-pointer flex flex-col items-center justify-center gap-3"
                        >
                            <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center">
                                <ChevronRight className="w-6 h-6 text-gray-500" />
                            </div>
                            <span className="text-sm font-medium text-gray-600 text-center">
                                {viewMoreText}
                            </span>
                        </div>
                    )}
                </div>

                {/* Right Arrow - positioned outside cards */}
                {canScrollRight && (
                    <button
                        onClick={() => scroll('right')}
                        className="absolute -right-5 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white rounded-full shadow-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-700 hover:scale-110 transition-all"
                        aria-label="Scroll right"
                    >
                        <ChevronRight className="w-5 h-5 text-gray-700" />
                    </button>
                )}
            </div>
        </div>
    );
};

export default HorizontalSlider;