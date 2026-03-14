// Landing/home page with hero section, features, and call-to-action
import React from 'react';

// Components
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import Hero from '../components/landing/Hero';
import LandingSection from '../components/landing/LandingSection';
import Marquee from '../components/landing/Marquee';
import ScrollRevelation from '@/components/ui/ScrollRevelation';
import { motion } from 'framer-motion';
import { Star } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import OptimizedLottie from '@/components/ui/OptimizedLottie';

// Lottie animations
import aiAnimation from '../assets/animations/ai-animation.json';
import studyAnimation from '../assets/animations/study-animation.json';

// Visual components
import RiasecRadar from '../components/visuals/RiasecRadar';
import CareerMap from '../components/visuals/CareerMap';

const HomePage: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen aurora-bg overflow-x-hidden transition-colors duration-300 dark:bg-gray-950">
      <Navbar />

      {/* SECTION 1: HERO */}
      <section className="relative pt-24 pb-12 overflow-hidden">
        {/* Floating Background Elements */}
        <motion.div
          animate={{
            y: [0, -30, 0],
            x: [0, 20, 0],
            scale: [1, 1.1, 1],
            opacity: [0.4, 0.6, 0.4]
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
          style={{ willChange: 'transform' }}
          className="absolute top-10 right-[-100px] w-[600px] h-[600px] bg-gradient-to-br from-primary-400 to-accent-pink rounded-full blur-[100px] pointer-events-none -z-10"
        />

        <motion.div
          animate={{
            y: [0, -30, 0],
            opacity: [0.3, 0.5, 0.3]
          }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-20 right-20 w-[400px] h-[400px] bg-primary-400/20 rounded-full blur-[120px] pointer-events-none -z-10 dark:bg-primary-600/20"
        />

        <motion.div
          animate={{
            y: [0, 40, 0],
            x: [0, -30, 0],
            scale: [1, 1.2, 1],
            opacity: [0.4, 0.6, 0.4]
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
          style={{ willChange: 'transform' }}
          className="absolute bottom-0 left-[-100px] w-[700px] h-[700px] bg-gradient-to-tr from-secondary-400 to-accent-yellow rounded-full blur-[100px] pointer-events-none -z-10"
        />

        <Hero />
      </section>

      {/* SECTION 2: PERSONALITY TEST (RIASEC) */}
      <LandingSection
        id="personality"
        title={t('landing.personality.title')}
        description={t('landing.personality.description')}
        linkTo="/personality-test"
        colorClass="bg-white/40 dark:bg-gray-950 border-y border-white/50 dark:border-gray-800"
        imageSide="right"
      >
        <div className="w-full h-[400px] flex items-center justify-center bg-white/50 dark:bg-gray-800/50 backdrop-blur rounded-3xl border border-indigo-100 dark:border-indigo-800 shadow-xl overflow-hidden cursor-default group hover:shadow-2xl hover:scale-[1.02] transition-all duration-500">
          <RiasecRadar
            interactive={false}
            scores={[
              { type: 'R', score: 25 },
              { type: 'I', score: 15 },
              { type: 'A', score: 20 },
              { type: 'S', score: 10 },
              { type: 'E', score: 30 },
              { type: 'C', score: 5 }
            ]}
          />
        </div>
      </LandingSection>

      {/* SECTION 3: INFOGRAPHIC HUB (Courses and Careers) */}
      <LandingSection
        id="hub"
        title={t('landing.hub.title')}
        description={t('landing.hub.description')}
        linkTo="/courses"
        colorClass="bg-white/40 dark:bg-gray-950 border-y border-white/50 dark:border-gray-800"
        imageSide="left"
      >
        <div className="w-full h-[400px] flex items-center justify-center bg-white/50 dark:bg-gray-800/50 backdrop-blur rounded-3xl border border-indigo-100 dark:border-indigo-800 shadow-xl overflow-hidden cursor-default group hover:shadow-2xl hover:scale-[1.02] transition-all duration-500">
          <CareerMap />
        </div>
      </LandingSection>

      {/* SECTION 4: UNIVERSITY PARTNERSHIPS */}
      {/* SECTION 4: UNIVERSITY PARTNERSHIPS */}
      <section className="py-24 relative dark:bg-gray-950 border-y border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <ScrollRevelation className="text-center mb-12">
            <h2 className="text-2xl font-display font-bold text-primary-900 dark:text-primary-300 uppercase tracking-widest">
              {t('landing.partners')}
            </h2>
          </ScrollRevelation>

          <div className="bg-white/50 dark:bg-white/90 backdrop-blur-sm rounded-2xl p-8 border border-gray-200 dark:border-white/20 shadow-lg">
            <Marquee
              items={[
                { name: "Sunway University", logo: "/assets/partners/sunway.png", url: "https://sunway.edu.my", className: "h-45" },
                { name: "Taylor's University", logo: "/assets/partners/taylors.png", url: "https://university.taylors.edu.my", className: "h-40" },
                { name: "Monash University Malaysia", logo: "/assets/partners/monash.png", url: "https://www.monash.edu.my", className: "h-20" },
                { name: "University of Malaya", logo: "/assets/partners/um.png", url: "https://www.um.edu.my", className: "h-90" },
                { name: "UCSI University", logo: "/assets/partners/ucsi.png", url: "https://www.ucsiuniversity.edu.my", className: "h-40" },
                { name: "Asia Pacific University (APU)", logo: "/assets/partners/apu.png", url: "https://www.apu.edu.my", className: "h-40" },
                { name: "University of Nottingham Malaysia", logo: "/assets/partners/nottingham.png", url: "https://www.nottingham.edu.my", className: "h-70" },
                { name: "INTI International University", logo: "/assets/partners/inti.png", url: "https://newinti.edu.my", className: "h-60" }
              ]}
              speed={40}
            />
          </div>
        </div>
      </section>

      {/* SECTION 5: VIRTUAL STUDY ROOM */}
      <LandingSection
        id="room"
        title={t('landing.rooms.title')}
        description={t('landing.rooms.description')}
        linkTo="/rooms"
        colorClass="bg-gray-900 dark:bg-gray-950"
        imageSide="right"
        isDark={true}
      >
        <div className="w-full h-[400px] flex items-center justify-center bg-gray-800 dark:bg-gray-800 rounded-3xl border border-gray-700 dark:border-gray-700 shadow-2xl overflow-hidden cursor-default group hover:shadow-primary-500/30 hover:scale-[1.02] transition-all duration-500">
          <div className="w-full max-w-lg flex items-center justify-center relative">
            <OptimizedLottie
              animationData={studyAnimation}
              loop={true}
              className="h-full w-full max-w-md drop-shadow-2xl dark:brightness-90"
            />
            <div className="absolute top-4 right-2 flex items-center gap-2 bg-accent-pink/20 dark:bg-accent-pink/30 px-3 py-1 rounded-full border border-accent-pink/30 dark:border-accent-pink/40">
              <div className="w-2 h-2 bg-accent-pink rounded-full animate-pulse" />
              <span className="text-[10px] font-bold text-accent-pink uppercase tracking-widest">{t('landing.rooms.live')}</span>
            </div>
          </div>
        </div>
      </LandingSection>

      {/* SECTION 6: AI APPROACH */}
      <LandingSection
        id="ai-approach"
        title={t('landing.ai.title')}
        description={t('landing.ai.description')}
        colorClass="bg-white/40 dark:bg-gray-950"
        imageSide="left"
      >
        <div className="w-full max-w-lg mx-auto">
          <OptimizedLottie
            animationData={aiAnimation}
            loop={true}
            className="h-full w-full drop-shadow-2xl dark:brightness-90"
          />
        </div>
      </LandingSection>

      {/* SECTION 7: SECURITY */}
      <section className="py-24 relative dark:bg-gray-950">
        <div className="absolute inset-0 opacity-30 dark:opacity-20 pointer-events-none">
          <div className="absolute top-10 right-10 w-64 h-64 bg-accent-lime/20 dark:bg-accent-lime/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-10 left-10 w-64 h-64 bg-secondary-400/20 dark:bg-secondary-400/10 rounded-full blur-3xl"></div>
        </div>

        <ScrollRevelation className="relative z-10 text-center px-4 max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-5xl font-serif font-bold text-gray-900 dark:text-gray-100 mb-6">
            {t('landing.security.title')}
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400 mb-12 max-w-2xl mx-auto">
            {t('landing.security.description')}
          </p>

          <div className="inline-flex flex-col sm:flex-row gap-6 sm:gap-8 justify-center items-center p-6 bg-white/50 dark:bg-gray-800/50 backdrop-blur border border-gray-200 dark:border-gray-700 rounded-2xl">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-full text-green-600 dark:text-green-400">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <span className="font-semibold text-gray-800 dark:text-gray-200">{t('landing.security.aes')}</span>
            </div>
            <div className="hidden sm:block h-8 w-px bg-gray-300 dark:bg-gray-600"></div>
            <div className="block sm:hidden w-24 h-px bg-gray-300 dark:bg-gray-600"></div>
            <div className="flex items-center gap-3">
              <span className="font-semibold text-gray-800 dark:text-gray-200">{t('landing.security.pdpa')}</span>
            </div>
          </div>
        </ScrollRevelation>
      </section>

      {/* SECTION 8: USER REVIEW (Glass Cards) */}
      <section className="py-24 relative dark:bg-gray-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <ScrollRevelation className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-serif font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 bg-clip-text text-transparent dark:from-indigo-400 dark:via-purple-400 dark:to-pink-400">
              {t('landing.testimonials.title')}
            </h2>
          </ScrollRevelation>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {(t('landing.testimonials.items', { returnObjects: true }) as Array<{ quote: string, author: string, role: string }>).map((testimonial, i) => (
              <ScrollRevelation key={i} delay={i * 0.1} className="h-full">
                <div className="bg-white/50 dark:bg-gray-800/50 backdrop-blur border border-gray-200 dark:border-gray-700 p-8 rounded-2xl hover:-translate-y-2 transition-all duration-300 h-full flex flex-col justify-between group">
                  <div>
                    <div className="flex mb-4 text-yellow-500 dark:text-yellow-400 gap-1">
                      {[...Array(5)].map((_, j) => (
                        <Star key={j} className="w-5 h-5 fill-current" />
                      ))}
                    </div>
                    <p className="text-gray-700 dark:text-gray-300 italic mb-6 leading-relaxed">"{testimonial.quote}"</p>
                  </div>
                  <div>
                    <div className="font-bold text-gray-900 dark:text-gray-100 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                      {testimonial.author}
                    </div>
                    <div className="text-primary-600 dark:text-primary-400 text-sm font-medium">
                      {testimonial.role}
                    </div>
                  </div>
                </div>
              </ScrollRevelation>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default HomePage;