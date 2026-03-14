import React from 'react';
import { motion } from 'framer-motion';

// Astronaut Hero Component
const AstronautHero: React.FC<{ className?: string }> = ({ className }) => {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.2 }}
            className={`relative select-none will-change-transform ${className}`}
        >
            <img
                src="/assets/characters/astronaut.svg"
                alt="Astronaut Mascot"
                className="w-full h-auto drop-shadow-[0_30px_60px_rgba(30,27,75,0.2)] dark:drop-shadow-[0_30px_60px_rgba(0,0,0,0.4)]"
            />
        </motion.div>
    );
};

export default AstronautHero;
