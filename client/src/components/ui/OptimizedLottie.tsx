// Performance-optimized Lottie animation with viewport-based play/pause
import React, { useRef, useEffect } from 'react';
import Lottie, { LottieRefCurrentProps } from 'lottie-react';
import { useInView } from 'framer-motion';

interface OptimizedLottieProps {
    animationData: any; // The JSON animation data
    className?: string;
    loop?: boolean;
}

/**
 * A wrapper around lottie-react that optimizes performance by:
 * 1. Pausing the animation when it's scrolled out of view.
 * 2. Using the 'canvas' renderer (if configured in Lottie props) or default SVG.
 * 3. Preventing unnecessary CPU usage on background tabs/off-screen elements.
 */
const OptimizedLottie: React.FC<OptimizedLottieProps> = ({
    animationData,
    className,
    loop = true
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const lottieRef = useRef<LottieRefCurrentProps>(null);

    // Monitor if the container is in the viewport
    const isInView = useInView(containerRef, {
        margin: "50px", // Precaching margin
        amount: 0.1
    });

    useEffect(() => {
        if (!lottieRef.current) return;

        if (isInView) {
            lottieRef.current.play(); // Play animation when in view
        } else {
            lottieRef.current.pause(); // Pause animation when out of view
        }
    }, [isInView]);

    return (
        <div ref={containerRef} className={className}>
            <Lottie
                lottieRef={lottieRef}
                animationData={animationData}
                loop={loop}
                autoplay={false} // We control playback manually
                className="w-full h-full"
                rendererSettings={{
                    preserveAspectRatio: 'xMidYMid slice',
                    progressiveLoad: true,
                }}
            />
        </div>
    );
};

export default OptimizedLottie;
