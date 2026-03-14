// Animated career path visualization with nodes and connecting lines
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

const CareerMap: React.FC = () => {
    const { t } = useTranslation();

    // 3 Nodes: Start (You), Path (Course), Goal (Career)

    // Animation phases
    const [activeNode, setActiveNode] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setActiveNode((prev) => (prev + 1) % 4); // 0, 1, 2, 3 (reset)
        }, 2500);
        return () => clearInterval(interval);
    }, []);

    // Line paths
    // 1. (50, 200) -> (150, 200) -> (150, 100) -> (250, 100)

    return (
        <div className="relative w-full h-full flex items-center justify-center overflow-hidden">

            {/* Lines */}
            <svg width="300" height="200" viewBox="0 0 300 200" className="overflow-visible">
                {/* Background Line (Gray) */}
                <path
                    d="M 50 150 C 100 150, 100 50, 150 50 S 200 150, 250 150"
                    stroke="#e0f2fe"
                    strokeWidth="4"
                    fill="none"
                    strokeLinecap="round"
                />
                <path
                    d="M 50 150 C 100 150, 100 50, 150 50 S 200 150, 250 150"
                    stroke="#e0f2fe"
                    strokeWidth="4"
                    fill="none"
                    strokeLinecap="round"
                    transform="translate(0, 20)"
                    style={{ opacity: 0.5 }}
                />

                {/* Animated Line (Sky Blue) */}
                <motion.path
                    d="M 50 150 C 100 150, 100 50, 150 50 S 200 150, 250 150"
                    stroke="#0ea5e9"
                    strokeWidth="4"
                    fill="none"
                    strokeLinecap="round"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: activeNode >= 1 ? 1 : 0 }}
                    transition={{ duration: 2, ease: "easeInOut" }}
                />
            </svg>

            {/* Nodes */}
            {/* Node 1: Start */}
            <motion.div
                className="absolute"
                style={{ left: 'calc(50% - 100px)', top: 'calc(50% + 50px)', transform: 'translate(-50%, -50%)' }} // Roughly 50, 150 rel to center
            >
                <div className={`w-4 h-4 rounded-full ${activeNode >= 0 ? 'bg-sky-500 scale-125' : 'bg-sky-200'} transition-all duration-500 shadow-lg shadow-sky-200`} />
                <div className="absolute top-6 left-1/2 -translate-x-1/2 text-[10px] font-bold text-sky-900 dark:text-sky-300 tracking-wide uppercase">{t('visuals.careerMap.interest', 'Interest')}</div>
            </motion.div>

            {/* Node 2: Mid */}
            <motion.div
                className="absolute"
                style={{ left: 'calc(50%)', top: 'calc(50% - 50px)', transform: 'translate(-50%, -50%)' }} // Roughly 150, 50
            >
                <div className={`w-6 h-6 rounded-full border-4 border-white ${activeNode >= 1 ? 'bg-sky-500 scale-110' : 'bg-sky-200'} transition-all duration-500 shadow-xl`} />
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-bold text-sky-900 dark:text-sky-300 tracking-wide uppercase whitespace-nowrap">{t('visuals.careerMap.course', 'Course')}</div>
            </motion.div>

            {/* Node 3: End */}
            <motion.div
                className="absolute"
                style={{ left: 'calc(50% + 100px)', top: 'calc(50% + 50px)', transform: 'translate(-50%, -50%)' }} // Roughly 250, 150
            >
                <div className={`w-8 h-8 rounded-full border-4 border-white flex items-center justify-center ${activeNode >= 2 ? 'bg-sky-600 dark:bg-sky-500 scale-110' : 'bg-sky-200:dark:bg-sky-300'} transition-all duration-500 shadow-xl`} >
                    {activeNode >= 2 && (
                        <motion.svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" initial={{ scale: 0 }} animate={{ scale: 1 }}>
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                        </motion.svg>
                    )}
                </div>
                <div className="absolute top-10 left-1/2 -translate-x-1/2 text-[10px] font-bold text-sky-900 tracking-wide uppercase whitespace-nowrap bg-white px-2 py-0.5 rounded-full shadow-sm">{t('visuals.careerMap.career', 'Career')}</div>
            </motion.div>

            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: activeNode >= 1 ? 1 : 0, y: activeNode >= 1 ? 0 : 10 }}
                transition={{ delay: 0.5 }}
                className="absolute bottom-4 right-4 bg-white/80 backdrop-blur px-3 py-1.5 rounded-lg text-xs text-sky-600 border border-sky-100 shadow-sm"
            >
                {t('visuals.careerMap.matchFound', 'Match Found')}
            </motion.div>
        </div>
    );
};

export default CareerMap;
