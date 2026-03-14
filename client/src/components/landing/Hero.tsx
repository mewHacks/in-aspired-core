import React, { useState, useEffect } from 'react';
import { ArrowRight, Brain, LineChart, Users } from 'lucide-react';
import { Button } from '../ui/Button';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import AstronautHero from '../visuals/AstronautHero';

const TypingSuffix = () => {
    const [text, setText] = useState('ing');
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        const fullText = 'ing';
        const typeSpeed = 300;
        const deleteSpeed = 100;
        const pauseDuration = 2000;

        let timer: NodeJS.Timeout;

        const handleTyping = () => {
            if (!isDeleting) {
                // Typing
                if (text.length < fullText.length) {
                    setText(fullText.slice(0, text.length + 1));
                    timer = setTimeout(handleTyping, typeSpeed);
                } else {
                    // Finished typing, wait before deleting
                    setIsDeleting(true);
                    timer = setTimeout(handleTyping, pauseDuration);
                }
            } else {
                // Deleting
                if (text.length > 0) {
                    setText(fullText.slice(0, text.length - 1));
                    timer = setTimeout(handleTyping, deleteSpeed);
                } else {
                    // Finished deleting, start typing
                    setIsDeleting(false);
                    timer = setTimeout(handleTyping, typeSpeed);
                }
            }
        };

        timer = setTimeout(handleTyping, typeSpeed);

        return () => clearTimeout(timer);
    }, [text, isDeleting]);

    return (
        <span>
            {text}
            {/* '|' Line */}
            <span className="animate-pulse ml-0.5 inline-block w-[2px] h-[0.7em] bg-black dark:bg-white align-middle"></span>
        </span>
    );
};

// Star Component
const TexturedStar: React.FC<{ className?: string, isActive?: boolean, color?: 'yellow' | 'pink' | 'blue' }> = ({ className, isActive, color = 'yellow' }) => {

    // Define fill colors and glow colors for stars
    const colors = {
        yellow: { fill: '#fef9c3', glow: 'rgba(250,204,21,0.4)' },
        pink: { fill: '#ffb6e1', glow: 'rgba(255,79,216,0.4)' },
        blue: { fill: '#99f6ff', glow: 'rgba(0,229,255,0.4)' }
    };

    // Get the current colors
    const current = colors[color];

    return (
        // SVG for star 
        <svg
            viewBox="0 0 24 24"
            className={`${className} transition-all duration-300 ${isActive ? 'scale-125' : 'scale-100'}`}
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{ filter: `drop-shadow(0 0 20px ${current.glow})` }}
        >
            {/* Filter for star texture */}
            <defs>
                <filter id="starGrain">
                    <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="1" stitchTiles="stitch" />
                    <feComposite operator="in" in2="SourceGraphic" />
                    <feBlend mode="overlay" in2="SourceGraphic" />
                </filter>
            </defs>

            {/* Star shape */}
            <path
                d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
                fill={current.fill}
                stroke={current.fill}
                strokeWidth="2.5"
                strokeLinejoin="round"
            />

            {/* Star texture */}
            <path
                d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
                filter="url(#starGrain)"
                opacity="0.25"
                stroke={current.fill}
                strokeWidth="2.5"
                strokeLinejoin="round"
            />
        </svg>
    );
};

// Main Hero Component
const Hero: React.FC = () => {
    const { t, i18n } = useTranslation();
    // Navigation and authentication
    const navigate = useNavigate();
    const { isAuthenticated } = useAuth();

    // Star animation state
    const [activeStar, setActiveStar] = useState<number | null>(null);

    return (
        <section className="relative w-full h-full flex items-center justify-center overflow-hidden px-4 sm:px-6 lg:px-8 py-20 lg:py-0 min-h-[90vh] bg-transparent dark:bg-transparent">

            {/* Background Elements */}
            <div className="absolute inset-0 -z-10">
                <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_0%,rgba(99,102,241,0.1),transparent_50%)] dark:bg-[radial-gradient(circle_at_50%_0%,rgba(99,102,241,0.05),transparent_50%)]"></div>
                <div className="absolute bottom-0 right-0 w-[800px] h-[800px] bg-gradient-to-tl from-sky-100/40 to-transparent dark:from-indigo-900/20 dark:to-transparent rounded-full blur-3xl"></div>
            </div>

            <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center w-full">

                {/* Left Content */}
                <motion.div
                    initial={{ opacity: 0, x: -50 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="text-center lg:text-left space-y-8 z-10"
                >

                    {/* Main Heading */}
                    <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold text-gray-900 dark:text-white leading-[1.1] tracking-tight font-display">
                        {t('landing.hero.title')}{i18n.language.startsWith('en') && <TypingSuffix />} <br />
                        <span className="aurora-text dark:from-indigo-400 dark:via-purple-400 dark:to-pink-400 drop-shadow-sm">{t('landing.hero.education')}</span> <br />
                        {t('landing.hero.forFuture')}
                    </h1>

                    {/* Subtitle */}
                    <p className="text-lg md:text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto lg:mx-0 leading-relaxed font-sans">
                        {t('landing.hero.subtitle')}
                    </p>

                    {/* Buttons */}
                    <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start items-center pt-4">
                        <Button
                            variant="primary"
                            size="lg"
                            className="shadow-xl shadow-primary-500/20 hover:shadow-primary-500/40 min-w-[160px] rounded-full"
                            onClick={() => navigate(isAuthenticated ? '/personality-test' : '/signup')}
                        >
                            {t('landing.hero.getStarted')} <ArrowRight className="ml-2 h-5 w-5" />
                        </Button>
                        <Button
                            variant="outline"
                            size="lg"
                            className="backdrop-blur-sm bg-white/40 dark:bg-gray-800/40 border-primary-200 dark:border-primary-800 text-primary-900 dark:text-primary-300 min-w-[160px] rounded-full hover:bg-white/60 dark:hover:bg-gray-800/60"
                            onClick={() => navigate('/about')}
                        >
                            {t('landing.hero.learnMore')}
                        </Button>
                    </div>
                </motion.div>

                {/* Right Visual (Interactive Star Spotlight) */}
                <div className="relative hidden lg:flex items-center justify-center perspective-[2000px]">
                    <div className="relative w-full aspect-square flex items-center justify-center scale-110">
                        {/* "Aspire to the stars" */}
                        <motion.div
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 1, duration: 1 }}
                            className="absolute -top-12 left-0 right-0 mx-auto z-40 bg-white/40 dark:bg-gray-800/40 backdrop-blur-md px-6 py-2 rounded-full border border-primary-100 dark:border-primary-800 shadow-sm w-max"
                        >
                            <span className="text-sm font-bold tracking-[0.2em] uppercase text-primary-500 dark:text-primary-400 font-display">
                                {t('landing.hero.aspire')}
                            </span>
                        </motion.div>

                        {/* Astronaut */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 1 }}
                            className="relative z-20 w-[80%] drop-shadow-[0_20px_50px_rgba(99,102,241,0.3)] dark:drop-shadow-[0_20px_50px_rgba(99,102,241,0.15)]"
                        >
                            <AstronautHero className="w-full" />
                        </motion.div>

                        {/* Interactive Stars Showing Different Features */}
                        {([
                            // Personality Test
                            { id: 1, color: 'pink' },
                            // Infographic Hub
                            { id: 2, color: 'blue' },
                            // Virtual Study Rooms
                            { id: 3, color: 'yellow' }
                        ] as const).map(({ id, color }) => (
                            <motion.div
                                key={id}
                                onMouseEnter={() => setActiveStar(id)}
                                onMouseLeave={() => setActiveStar(null)}
                                className={`absolute z-50 cursor-pointer p-6 group will-change-[transform,opacity]`}
                                animate={{
                                    y: [0, -10, 0],
                                    opacity: activeStar === id ? 0 : 1
                                }}
                                transition={{
                                    y: {
                                        duration: 3 + id,
                                        repeat: Infinity,
                                        ease: "easeInOut"
                                    },
                                    opacity: { duration: 0.3 }
                                }}
                                style={{
                                    top: id === 1 ? '10%' : id === 2 ? '40%' : '75%',
                                    left: id === 1 ? '15%' : id === 2 ? '85%' : '10%',
                                }}
                            >
                                <TexturedStar
                                    isActive={activeStar === id}
                                    color={color}
                                    className="w-16 h-16"
                                />
                                <div className={`absolute inset-0 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity ${color === 'pink' ? 'bg-[#ff4fd8]/30 dark:bg-[#ff4fd8]/20' : color === 'blue' ? 'bg-[#00e5ff]/30 dark:bg-[#00e5ff]/20' : 'bg-accent-yellow/30 dark:bg-accent-yellow/20'
                                    }`} />
                            </motion.div>
                        ))}

                        {/* Spotlight Cards */}
                        <AnimatePresence>
                            {/* Personality Test Card */}
                            {activeStar === 1 && (
                                <motion.div
                                    key="card1"
                                    initial={{ opacity: 0, scale: 0.9, x: -20, y: -20 }}
                                    animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    className="absolute top-0 left-[-15%] z-40 w-72 h-80 bg-gradient-to-br from-primary-600 to-accent-pink dark:from-primary-700 dark:to-accent-pink/80 rounded-[2.5rem] shadow-2xl flex flex-col p-8 text-white border border-white/30 dark:border-white/10 pointer-events-none"
                                >
                                    <div className="w-14 h-14 bg-white/20 dark:bg-white/10 rounded-2xl flex items-center justify-center mb-6 backdrop-blur">
                                        <Brain className="w-8 h-8 text-white" />
                                    </div>
                                    <div className="text-2xl font-bold mb-4 font-display leading-tight text-white">{t('landing.hero.cards.personality')}</div>
                                    <div className="space-y-3">
                                        <div className="h-2 bg-white/30 dark:bg-white/20 rounded-full w-full"></div>
                                        <div className="h-2 bg-white/20 dark:bg-white/10 rounded-full w-[85%]"></div>
                                        <div className="h-2 bg-white/10 dark:bg-white/5 rounded-full w-[60%]"></div>
                                    </div>
                                    <div className="mt-auto flex justify-between items-end">
                                        <div className="flex -space-x-2">
                                            {[1, 2, 3].map(i => (
                                                <div key={i} className="w-8 h-8 rounded-full border-2 border-primary-600 dark:border-primary-700 bg-primary-400 dark:bg-primary-500" />
                                            ))}
                                        </div>
                                        <div className="w-3 h-3 rounded-full bg-accent-lime animate-pulse" />
                                    </div>
                                </motion.div>
                            )}

                            {/* Infographic Hub Card */}
                            {activeStar === 2 && (
                                <motion.div
                                    key="card2"
                                    initial={{ opacity: 0, scale: 0.9, x: -20 }}
                                    animate={{ opacity: 1, scale: 1, x: 0 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    className="absolute bottom-[20%] right-[-15%] z-40 w-80 h-72 bg-white/95 dark:bg-gray-800/95 backdrop-blur-2xl rounded-[3rem] shadow-2xl border border-white dark:border-gray-700 flex flex-col p-8 pointer-events-none"
                                >
                                    <div className="flex items-center gap-4 mb-8">
                                        <div className="w-12 h-12 rounded-2xl bg-secondary-100 dark:bg-secondary-900/30 flex items-center justify-center text-secondary-600 dark:text-secondary-400 shadow-inner">
                                            <LineChart className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <div className="font-bold text-gray-900 dark:text-white font-display text-lg">{t('landing.hero.cards.hub')}</div>
                                            <div className="text-xs font-bold text-primary-400 dark:text-primary-400 uppercase tracking-wider">{t('landing.hero.cards.liveAnalysis')}</div>
                                        </div>
                                    </div>
                                    <div className="flex items-end gap-3 h-full pb-2">
                                        <motion.div animate={{ height: ['40%', '70%', '40%'] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }} className="w-full bg-secondary-200/50 dark:bg-secondary-800/50 rounded-lg" />
                                        <motion.div animate={{ height: ['60%', '30%', '60%'] }} transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }} className="w-full bg-secondary-400 dark:bg-secondary-600 rounded-lg shadow-lg" />
                                        <motion.div animate={{ height: ['30%', '50%', '30%'] }} transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }} className="w-full bg-secondary-300 dark:bg-secondary-700 rounded-lg" />
                                        <motion.div animate={{ height: ['50%', '85%', '50%'] }} transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }} className="w-full bg-primary-500 dark:bg-primary-600 rounded-lg shadow-xl" />
                                    </div>
                                </motion.div>
                            )}

                            {/* Virtual Study Rooms Card */}
                            {activeStar === 3 && (
                                <motion.div
                                    key="card3"
                                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    className="absolute bottom-[-10%] left-[5%] z-40 w-[360px] h-[240px] bg-white/98 dark:bg-gray-800/98 backdrop-blur-3xl rounded-[2.5rem] shadow-2xl border border-white dark:border-gray-700 p-8 space-y-5 flex flex-col items-center justify-center pointer-events-none"
                                >
                                    <div className="w-16 h-16 bg-primary-500 dark:bg-primary-600 rounded-[1.25rem] flex items-center justify-center shadow-xl relative">
                                        <Users className="h-8 w-8 text-white" />
                                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-accent-lime rounded-full border-2 border-white dark:border-gray-800" />
                                    </div>
                                    <div className="text-center">
                                        <h3 className="text-2xl font-bold text-gray-900 dark:text-white font-display">{t('landing.hero.cards.rooms')}</h3>
                                        <p className="text-sm font-semibold text-gray-400 dark:text-gray-400">{t('landing.hero.cards.collaborate')}</p>
                                    </div>
                                    <div className="flex gap-3 justify-center">
                                        {[1, 2, 3, 4].map(i => (
                                            <div key={i} className="h-2 w-8 bg-gray-100 dark:bg-gray-700 rounded-full" />
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        </section>
    );
};

// Export component
export default Hero;