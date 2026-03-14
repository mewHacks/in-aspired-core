// Full-screen intro animation with particle effects and shatter transition
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, animate, useTransform } from 'framer-motion';
import { MousePointer2, SkipForward } from 'lucide-react';

interface IntroAnimationProps {
  onComplete: () => void;
}

const CHAOS_WORDS_LIST = [
  "STRESS", "DOUBT", "ANXIETY", "GRADES",
  "PRESSURE", "FUTURE", "FAILURE", "EXPECTATIONS",
  "ISOLATION", "UNCERTAINTY", "COMPETITION", "LOST"
];

// --- MAIN COMPONENT ---
export const IntroAnimation: React.FC<IntroAnimationProps> = ({ onComplete }) => {

  // Debugging logs
  console.log('IntroAnimation MOUNTING/RENDERING');

  useEffect(() => {
    console.log('IntroAnimation useEffect running');
    return () => {
      console.log('IntroAnimation CLEANUP - component unmounting');
    };
  }, []);

  // Phases: rain -> freeze (stop in place) -> merge (fly to center) -> barrier (text appears) -> shattering -> clarity -> logo
  const [phase, setPhase] = useState<'rain' | 'freeze' | 'merge' | 'barrier' | 'shattering' | 'clarity' | 'logo'>('rain');
  const [isHoveringIM, setIsHoveringIM] = useState(false);

  // Generate particles ONCE. They persist through rain, freeze, and merge.
  const particles = useMemo(() => {
    return Array.from({ length: 80 }).map((_, i) => ({
      id: i,
      text: CHAOS_WORDS_LIST[Math.floor(Math.random() * CHAOS_WORDS_LIST.length)],
      // Random start X
      startX: Math.random() * 100,
      // Target for merge: Cluster horizontally where "IMPOSSIBLE" appears (15vw to 85vw), center vertically
      targetX: 20 + Math.random() * 60,
      targetY: 48 + Math.random() * 4,
      // Randomize speed for rain
      duration: 1.5 + Math.random() * 2,
      // Randomly assign color: most black/gray, some dark indigo
      isIndigo: Math.random() > 0.7
    }));
  }, []);

  useEffect(() => {

    console.log('Setting up timers');

    // 1. Rain falls for 3 seconds
    const freezeTimer = setTimeout(() => {
      console.log('Moving to freeze phase');
      setPhase('freeze');
    }, 3000);

    // 2. Pause briefly in frozen state (0.8s), then start merging
    const mergeTimer = setTimeout(() => {
      console.log('Moving to merge phase');
      setPhase('merge');
    }, 3800);

    // 3. Show the barrier text as particles arrive (1.2s flight time)
    const barrierTimer = setTimeout(() => {
      console.log('Moving to barrier phase');
      setPhase('barrier');
    }, 5000);

    return () => {
      console.log('Cleaning up timers');
      clearTimeout(freezeTimer);
      clearTimeout(mergeTimer);
      clearTimeout(barrierTimer);
    };
  }, []); // Empty array = run once on mount

  const handleShatter = () => {
    console.log('Shatter triggered');
    if (phase !== 'barrier') return;
    setPhase('shattering');
    setTimeout(() => setPhase('clarity'), 500);
    setTimeout(() => setPhase('logo'), 2000);
    setTimeout(() => {
      console.log('Calling onComplete');
      onComplete();
    }, 5500);
  };


  return (
    <div className="w-full h-screen bg-white relative overflow-hidden cursor-default select-none font-sans">
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-br from-indigo-50 via-white to-sky-50" />
      {/* Add subtle animated blobs for more depth */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-200/30 rounded-full blur-3xl animate-float opacity-50 pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-sky-200/30 rounded-full blur-3xl animate-float opacity-50 pointer-events-none" style={{ animationDelay: '2s' }}></div>

      {/* --- UNIFIED PARTICLE SYSTEM --- */}
      {(phase === 'rain' || phase === 'freeze' || phase === 'merge') && (
        <div className="absolute inset-0 z-10 pointer-events-none overflow-hidden">
          {particles.map((p) => (
            <UnifiedParticle
              key={p.id}
              data={p}
              phase={phase}
            />
          ))}
        </div>
      )}

      {/* --- PHASE 4: THE BARRIER (IMPOSSIBLE) --- */}
      <div className="absolute inset-0 flex items-center justify-center z-20 flex-col perspective-[1000px]">
        <AnimatePresence mode="wait">
          {(phase === 'barrier' || phase === 'shattering') && (
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ opacity: 0, scale: 1.1, filter: 'blur(10px)' }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="relative flex items-center justify-center px-4"
            >
              <div className="flex items-center tracking-tighter relative font-serif">

                {/* The Interactive "IM" */}
                <div
                  className="relative cursor-pointer z-50 mr-[-0.05em] group"
                  onMouseEnter={() => setIsHoveringIM(true)}
                  onMouseLeave={() => setIsHoveringIM(false)}
                  onClick={handleShatter}
                >
                  {/* "Break Me" Prompt */}
                  {phase === 'barrier' && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 1, duration: 0.5 }}
                      className="absolute -top-16 sm:-top-20 left-1/2 -translate-x-1/2 whitespace-nowrap pointer-events-none"
                    >
                      <div className="flex items-center gap-2 text-[8px] sm:text-[10px] uppercase tracking-[0.2em] text-gray-400 bg-white px-2 sm:px-3 py-1 border border-gray-200 rounded-full shadow-sm">
                        <MousePointer2 className="w-3 h-3 animate-bounce" />
                        Break
                      </div>
                    </motion.div>
                  )}

                  {phase === 'shattering' ? (
                    <ShatterEffect />
                  ) : (
                    <motion.div
                      animate={isHoveringIM ? {
                        x: [0, -1, 1, -1, 1, 0],
                        y: [0, 1, -1, 1, -1, 0]
                      } : {}}
                      transition={{ duration: 0.2, repeat: isHoveringIM ? Infinity : 0 }}
                      className="relative"
                    >
                      <CrackOverlay isHovering={isHoveringIM} />
                      <h1 className="text-5xl sm:text-7xl md:text-[8rem] lg:text-[10rem] xl:text-[11rem] font-black leading-none text-transparent bg-clip-text bg-gradient-to-b from-indigo-700 to-indigo-900 select-none drop-shadow-2xl">
                        IM
                      </h1>
                    </motion.div>
                  )}
                </div>

                {/* The "POSSIBLE" */}
                <motion.h1
                  animate={{
                    x: phase === 'shattering' ? -40 : 0,
                    color: phase === 'shattering' ? '#000000' : undefined
                  }}
                  transition={{ type: "spring", stiffness: 200, damping: 20 }}
                  className={`text-5xl sm:text-7xl md:text-[8rem] lg:text-[10rem] xl:text-[11rem] font-black leading-none select-none transition-colors duration-300 ${phase === 'shattering' ? 'text-black' : 'text-gray-400 drop-shadow-sm'}`}
                >
                  POSSIBLE
                </motion.h1>
              </div>
            </motion.div>
          )}

          {/* --- PHASE 5: REVEAL --- */}
          {(phase === 'clarity' || phase === 'logo') && (
            <motion.div className="absolute inset-0 flex items-center justify-center flex-col z-30 px-4">
              {phase === 'clarity' && (
                <motion.div
                  initial={{ opacity: 0.8 }}
                  animate={{ opacity: 0 }}
                  transition={{ duration: 0.4 }}
                  className="absolute inset-0 bg-white z-50 pointer-events-none"
                />
              )}

              {phase === 'clarity' && (
                <motion.h1
                  initial={{ scale: 1, opacity: 1 }}
                  animate={{ scale: 10, opacity: 0 }}
                  transition={{ duration: 1, ease: [0.7, 0, 0.84, 0] }}
                  className="text-7xl sm:text-9xl md:text-[10rem] font-black tracking-tighter text-indigo-900 leading-none whitespace-nowrap font-serif"
                >
                  POSSIBLE
                </motion.h1>
              )}

              {phase === 'logo' && (
                <div className="text-center flex flex-col items-center">
                  <motion.div
                    initial={{ scale: 0, rotate: -180, opacity: 0 }}
                    animate={{ scale: 1, rotate: 0, opacity: 1 }}
                    transition={{ duration: 1, type: "spring", bounce: 0.5 }}
                    className="w-20 h-20 sm:w-32 sm:h-32 bg-white/40 backdrop-blur-xl rounded-3xl mb-6 sm:mb-8 flex items-center justify-center shadow-2xl relative overflow-hidden group border border-white/60"
                  >
                    <div className="absolute inset-0 bg-gradient-to-tr from-white/80 to-indigo-100/50 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <img src="/assets/icons/logo_light.svg" alt="Logo" className="w-12 h-12 sm:w-20 sm:h-20 relative z-10 drop-shadow-lg" />
                  </motion.div>

                  <motion.h1
                    initial={{ clipPath: 'inset(100% 0 0 0)', y: 20 }}
                    animate={{ clipPath: 'inset(0% 0 0 0)', y: 0 }}
                    transition={{ duration: 1, ease: "circOut", delay: 0.3 }}
                    className="text-4xl sm:text-6xl md:text-8xl font-serif font-bold text-gray-900 mb-4 tracking-tight"
                  >
                    In-Aspired
                  </motion.h1>

                  <motion.div
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: "60px", opacity: 1 }}
                    transition={{ delay: 0.8, duration: 0.8 }}
                    className="h-1 bg-gradient-to-r from-indigo-500 to-sky-500 rounded-full mb-4"
                  />

                  <motion.p
                    initial={{ opacity: 0, letterSpacing: '0em' }}
                    animate={{ opacity: 1, letterSpacing: '0.2em' }}
                    transition={{ delay: 1, duration: 1 }}
                    className="text-xs sm:text-sm md:text-lg text-indigo-600/80 uppercase font-medium text-center px-4"
                  >
                    Redefining Education
                  </motion.p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <SkipButton onClick={onComplete} />

    </div>
  );
};

// --- UNIFIED PARTICLE COMPONENT ---
const UnifiedParticle = ({ data, phase }: { data: any, phase: string }) => {

  console.log(`Particle rendering with phase: ${phase}`);

  const x = useMotionValue(data.startX);
  const y = useMotionValue(-10);
  const opacity = useMotionValue(1);
  const scale = useMotionValue(1);

  const controlsRef = useRef<any>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    console.log(`Particle useEffect running for phase: ${phase}`);
    return () => {
      isMountedRef.current = false;
      if (controlsRef.current) {
        controlsRef.current.stop();
      }
    };
  }, []);

  useEffect(() => {
    // Stop any existing animations
    if (controlsRef.current) {
      controlsRef.current.stop();
    }

    if (phase === 'rain') {
      // Set random initial Y position
      y.set(Math.random() * 110 - 10);

      // Start the rain animation
      const startRain = (_fromY: number, toY: number) => {
        if (!isMountedRef.current || phase !== 'rain') return;

        controlsRef.current = animate(y, toY, {
          duration: data.duration,
          ease: "linear",
          onComplete: () => {
            if (isMountedRef.current && phase === 'rain') {
              // Reset to top and restart
              y.set(-10);
              startRain(-10, 110);
            }
          }
        });
      };

      // Calculate first segment duration
      const currentY = y.get();
      const distanceRemaining = 110 - currentY;
      const firstDuration = (distanceRemaining / 120) * data.duration;

      // Initial fall from current position
      controlsRef.current = animate(y, 110, {
        duration: firstDuration,
        ease: "linear",
        onComplete: () => {
          if (isMountedRef.current && phase === 'rain') {
            y.set(-10);
            startRain(-10, 110);
          }
        }
      });

    } else if (phase === 'freeze') {
      // Just stop the animation - particles stay where they are
      if (controlsRef.current) {
        controlsRef.current.stop();
      }

    } else if (phase === 'merge') {
      // Stop any existing animations first
      if (controlsRef.current) {
        controlsRef.current.stop();
      }

      // Animate from current position to target
      animate(x, data.targetX, { duration: 1.2, ease: "easeInOut" });
      animate(y, data.targetY, { duration: 1.2, ease: "easeInOut" });
      animate(scale, 0.4, { duration: 1.2, ease: "easeInOut" });
      animate(opacity, [1, 1, 0], { duration: 1.2, times: [0, 0.9, 1] });
    }

    // Cleanup on phase change
    return () => {
      if (controlsRef.current) {
        controlsRef.current.stop();
      }
    };
  }, [phase]); // Only depend on phase, not data (which is stable)

  return (
    <motion.div
      style={{
        position: 'absolute',
        left: useTransform(x, (val) => `${val}vw`),
        top: useTransform(y, (val) => `${val}vh`),
        scale,
        opacity,
        rotate: phase === 'merge' ? 45 : 0
      }}
      className="flex items-center justify-center"
    >
      {phase === 'merge' ? (
        <div className={`w-4 h-4 rounded-sm shadow-sm backdrop-blur ${data.isIndigo ? 'bg-indigo-600' : 'bg-gray-800'}`} />
      ) : (
        <div className={`text-2xl md:text-3xl font-serif font-bold mix-blend-multiply blur-[0.5px] ${data.isIndigo ? 'text-indigo-900/40' : 'text-gray-800/40'}`}>
          {data.text}
        </div>
      )}
    </motion.div>
  );
};

const CrackOverlay = ({ isHovering }: { isHovering: boolean }) => (
  <svg className="absolute inset-0 w-full h-full pointer-events-none z-50 overflow-visible">
    <defs>
      <filter id="glow">
        <feGaussianBlur stdDeviation="1" result="coloredBlur" />
        <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
      </filter>
    </defs>
    <motion.path
      d="M30 10 L50 40 L20 70 M50 40 L80 30"
      fill="transparent"
      stroke="white"
      strokeWidth="2"
      filter="url(#glow)"
      initial={{ pathLength: 0, opacity: 0 }}
      animate={isHovering ? { pathLength: 1, opacity: 1 } : { pathLength: 0, opacity: 0 }}
      transition={{ duration: 0.3 }}
    />
    <motion.path
      d="M50 40 L60 80 M50 40 L30 30"
      fill="transparent"
      stroke="white"
      strokeWidth="1.5"
      initial={{ pathLength: 0, opacity: 0 }}
      animate={isHovering ? { pathLength: 1, opacity: 0.8 } : { pathLength: 0, opacity: 0 }}
      transition={{ duration: 0.2, delay: 0.1 }}
    />
  </svg>
);

const ShatterEffect = () => {
  const shards = Array.from({ length: 40 });
  return (
    <div className="relative w-[140px] md:w-[280px] h-[100px] md:h-[200px]">
      {shards.map((_, i) => (
        <motion.div
          key={i}
          className="absolute bg-black"
          initial={{
            width: Math.random() * 30 + 10, height: Math.random() * 30 + 10,
            x: 0, y: 0, opacity: 1, scale: 1
          }}
          animate={{
            x: (Math.random() - 0.5) * 800,
            y: (Math.random() - 0.5) * 800,
            rotate: (Math.random() - 0.5) * 1000,
            opacity: 0, scale: 0
          }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          style={{ clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)' }}
        />
      ))}
    </div>
  );
};

const SkipButton = ({ onClick }: { onClick: () => void }) => (
  <motion.button
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ delay: 1.5, duration: 1 }}
    onClick={onClick}
    className="absolute bottom-8 right-8 z-50 flex items-center gap-2 text-[10px] uppercase tracking-widest font-medium text-gray-400 hover:text-black transition-colors cursor-pointer group px-4 py-2 bg-white/50 backdrop-blur-sm rounded-full border border-gray-100"
  >
    Skip Intro
    <SkipForward className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
  </motion.button>
);