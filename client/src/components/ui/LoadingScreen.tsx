// LoadingScreen.tsx
// Custom loading screen consisting of logo, loading quotes and progress bar
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';

// Props definition for the LoadingScreen component
interface LoadingScreenProps {
    fullScreen?: boolean; // Determines whether the loading screen covers entire viewport
}

// Main loading screen component
const LoadingScreen: React.FC<LoadingScreenProps> = ({ fullScreen = true }) => {
    const { t } = useTranslation();
    const loadingQuotes = t('ui.loading.quotes', { returnObjects: true }) as string[];

    // State to track which quote is currently displayed
    const [quoteIndex, setQuoteIndex] = useState(0);

    // useEffect to rotate quotes automatically on a timer
    useEffect(() => {
        // Set interval to rotate quotes every 2 seconds
        const interval = setInterval(() => {
            // Increment index and loop back to 0 when reaching the end
            setQuoteIndex((prev) => (prev + 1) % loadingQuotes.length);
        }, 2000);

        // Cleanup interval on component unmount
        return () => clearInterval(interval);
    }, [loadingQuotes.length]);

    // Container classes based on fullScreen prop
    const containerClasses = fullScreen
        ? "fixed inset-0 z-[60] flex flex-col items-center justify-center bg-white"
        : "h-full w-full flex flex-col items-center justify-center min-h-[300px] bg-white";

    return ( // Render JSX
        <div className={containerClasses}>

            {/* Logo Animation */}
            <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="mb-8 relative"
            >
                <motion.div
                    className="rounded-full"
                >
                    <img src="/assets/icons/logo_light.svg" alt={t('common.loading', 'Loading')} className="h-16 w-16 md:h-20 md:w-20" />
                </motion.div>
            </motion.div>

            {/* Quote Animation */}
            <div className="h-8 relative flex items-center justify-center overflow-hidden w-full max-w-md px-4">
                <AnimatePresence mode="wait">
                    <motion.p
                        key={quoteIndex}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.5 }}
                        className="text-gray-500 font-medium text-sm md:text-base text-center absolute w-full"
                    >
                        {loadingQuotes[quoteIndex]}
                    </motion.p>
                </AnimatePresence>
            </div>

            {/* Progress Bar */}
            <motion.div
                className="h-2 bg-gray-100 mt-8 rounded-full overflow-hidden"
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: "240px", opacity: 1 }}
                transition={{ duration: 0.8 }}
            >
                <motion.div
                    className="h-full bg-gradient-to-r from-primary-400 to-primary-600 rounded-full"
                    initial={{ x: "-100%" }}
                    animate={{ x: "100%" }}
                    transition={{
                        repeat: Infinity,
                        duration: 1.5,
                        ease: "linear",
                        repeatType: "loop"
                    }}
                />
            </motion.div>
        </div>
    );
};

// Export component
export default LoadingScreen;
