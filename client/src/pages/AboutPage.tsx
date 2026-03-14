// About page with animated envelope letter and team info
import React, { useState } from 'react';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import ScrollRevelation from '@/components/ui/ScrollRevelation';
import { Users, Sparkles, Bot, Search, Target, Globe, Mail, Linkedin, Github } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import hanaImg from '../assets/profile/hana.png';
import jasmineImg from '../assets/profile/jasmine.jpg';

const EnvelopeLetter: React.FC = () => {
    const { t } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);

    return (
        <section className="py-24 bg-[#faf9f6] dark:bg-gray-900 overflow-hidden relative">
            {/* Subtle paper texture/pattern */}
            <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#000 0.5px, transparent 0.5px)', backgroundSize: '24px 24px' }}></div>

            <div className="max-w-4xl mx-auto px-4 text-center relative z-10">
                <ScrollRevelation>
                    <h2 className="text-3xl md:text-5xl font-serif font-bold text-gray-900 dark:text-gray-100 mb-4">{t('about.letter.title')}</h2>
                    <p className="text-gray-500 dark:text-gray-400 mb-12 italic font-serif">{t('about.letter.subtitle')}</p>
                </ScrollRevelation>

                <div className="relative flex justify-center items-center min-h-[600px] [perspective:1000px]">
                    {/* Shadow & Hover Wrapper */}
                    <motion.div
                        onClick={() => setIsOpen(!isOpen)}
                        className="relative w-full max-w-lg h-64 bg-[#f3f4f6] dark:bg-gray-800 rounded-b-xl shadow-2xl cursor-pointer transition-all duration-500 hover:-translate-y-2 group"
                        initial={false}
                    >
                        {/* The "Pocket" Clipping Container - ensures letter doesn't stick out the bottom when closed */}
                        <div className="absolute inset-0 rounded-b-xl" style={{ clipPath: isOpen ? 'none' : 'inset(-600px 0px 0px 0px)' }}>
                            {/* Back Wall of Envelope */}
                            <div className="absolute inset-0 bg-[#e5e7eb] dark:bg-gray-700 rounded-b-xl border border-gray-300 dark:border-gray-600"></div>

                            {/* The Letter */}
                            <motion.div
                                animate={{
                                    y: isOpen ? -320 : 40,
                                    scale: isOpen ? 1 : 0.8,
                                    opacity: isOpen ? 1 : 0,
                                    zIndex: isOpen ? 40 : 5
                                }}
                                transition={{
                                    duration: 0.8,
                                    ease: "backInOut",
                                    zIndex: { delay: isOpen ? 0.4 : 0 } // Move to front halfway through the animation
                                }}
                                className="absolute inset-x-4 top-4 bg-white dark:bg-gray-900 p-8 md:p-12 shadow-2xl border border-gray-100 dark:border-gray-700 rounded-lg min-h-[480px] text-left z-10 overflow-y-auto no-scrollbar"
                            >
                                <div className="font-serif italic text-gray-800 dark:text-gray-200 space-y-4">
                                    <p className="text-xl md:text-2xl font-bold mb-6 text-indigo-700 dark:text-indigo-400">{t('about.letter.greeting')}</p>
                                    <p className="text-lg leading-relaxed">
                                        {t('about.letter.p1')}
                                    </p>
                                    <p className="text-lg leading-relaxed">
                                        {t('about.letter.p2')}
                                    </p>

                                    {/* Name Origin Section */}
                                    <div className="relative py-6 my-8 px-8 group/origin">

                                        {/* Painted Look Background */}
                                        <div
                                            className="absolute inset-0 bg-indigo-100/40 dark:bg-indigo-900/40 -rotate-1 group-hover/origin:rotate-0 transition-transform duration-700"
                                            style={{
                                                clipPath: 'polygon(2% 15%, 5% 5%, 30% 8%, 65% 2%, 98% 4%, 95% 45%, 99% 85%, 85% 95%, 45% 92%, 15% 98%, 1% 80%)'
                                            }}
                                        />

                                        {/* Name Origin Text */}
                                        <div className="relative z-10">
                                            <p className="text-lg font-serif italic text-indigo-900 dark:text-indigo-300 mb-3 opacity-90">{t('about.letter.origin.text')}</p>
                                            <div className="flex flex-col sm:flex-row sm:items-center gap-x-8 gap-y-3">
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] uppercase tracking-[0.2em] font-sans font-black text-indigo-400 dark:text-indigo-500 mb-1">{t('about.letter.origin.inspire.label')}</span>
                                                    <span className="text-2xl font-serif font-bold italic text-indigo-900 dark:text-indigo-300 leading-none">{t('about.letter.origin.inspire.word')}</span>
                                                </div>
                                                <div className="h-px w-8 bg-indigo-200 dark:bg-indigo-700 hidden sm:block"></div>
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] uppercase tracking-[0.2em] font-sans font-black text-indigo-400 dark:text-indigo-500 mb-1">{t('about.letter.origin.aspire.label')}</span>
                                                    <span className="text-2xl font-serif font-bold italic text-indigo-900 dark:text-indigo-300 leading-none">{t('about.letter.origin.aspire.word')}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <p className="text-lg leading-relaxed">
                                        {t('about.letter.p3')}
                                    </p>
                                    <div className="pt-8 border-t border-gray-100 dark:border-gray-700 mt-8">
                                        <p className="text-3xl text-gray-900 dark:text-gray-100 mb-1" style={{ fontFamily: "'Caveat', cursive" }}>{t('about.letter.founders')}</p>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">{t('about.letter.role')}</p>
                                    </div>
                                </div>
                            </motion.div>

                            {/* Front Panels (V-Shape) */}
                            <div className="absolute inset-0 z-20 pointer-events-none"
                                style={{
                                    background: 'linear-gradient(135deg, transparent 50%, #f3f4f6 50%), linear-gradient(225deg, transparent 50%, #e5e7eb 50%)',
                                    clipPath: 'polygon(0 100%, 100% 100%, 100% 0, 50% 50%, 0 0)'
                                }}>
                            </div>
                        </div>

                        {/* Front Flap (Top) - Outside pocket to avoid any Z issues, though visible due to negative inset */}
                        <motion.div
                            className="absolute top-0 inset-x-0 h-32 origin-top z-30"
                            animate={{ rotateX: isOpen ? -160 : 0 }}
                            transition={{ duration: 0.6 }}
                            style={{
                                background: 'linear-gradient(to bottom, #d1d5db, #f3f4f6)',
                                clipPath: 'polygon(0 0, 100% 0, 50% 100%)',
                                backfaceVisibility: 'hidden'
                            }}
                        />

                        {/* Hint Text */}
                        {!isOpen && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="absolute -bottom-12 inset-x-0 text-sm font-medium text-indigo-600 dark:text-indigo-400 animate-bounce"
                            >
                                {t('about.letter.tapHint')}
                            </motion.div>
                        )}
                    </motion.div>
                </div>
            </div>
        </section>
    );
};

const ChronicleTimeline: React.FC = () => {
    const { t } = useTranslation();
    const milestones = t('about.chronicle.milestones', { returnObjects: true }) as Array<{ date: string, title: string, desc: string }>;
    const colors = ["bg-indigo-600", "bg-blue-600", "bg-purple-600", "bg-teal-600"];
    //const borders = ["border-indigo-100 dark:border-indigo-900", "border-blue-100 dark:border-blue-900", "border-purple-100 dark:border-purple-900", "border-teal-100 dark:border-teal-900"];

    return (
        <section className="py-24 bg-gray-50 dark:bg-gray-900 overflow-hidden">
            <div className="max-w-7xl mx-auto px-4">
                <ScrollRevelation className="text-center mb-16">
                    <h2 className="text-3xl md:text-5xl font-serif font-bold text-gray-900 dark:text-gray-100 mb-6">{t('about.chronicle.title')}</h2>
                    <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">{t('about.chronicle.subtitle')}</p>
                </ScrollRevelation>

                <div className="relative py-12">
                    {/* The Track - Aligned with dot centers */}
                    <div className="absolute top-18 left-0 w-full h-0.5 bg-gradient-to-r from-indigo-200 via-purple-200 to-teal-200 dark:from-indigo-600 dark:via-purple-600 dark:to-teal-600 z-0" />

                    {/* Mobile: Horizontal Scroll Container */}
                    <div className="flex md:grid md:grid-cols-4 overflow-x-auto md:overflow-x-visible pb-8 gap-12 md:gap-12 snap-x no-scrollbar relative z-10">
                        {milestones.map((ms, idx) => (
                            <ScrollRevelation key={idx} delay={idx * 0.1} direction="up" className="flex-none w-[280px] md:w-auto snap-center">
                                <div className="flex flex-col items-center md:items-start text-center md:text-left group">
                                    <div className={`w-12 h-12 ${colors[idx % colors.length]} rounded-full flex items-center justify-center text-white mb-6 md:mb-8 ring-8 ring-white dark:ring-gray-900 shadow-xl transition-all duration-500 group-hover:scale-125 group-hover:rotate-[360deg] z-20`}>
                                        <div className="w-2.5 h-2.5 bg-white rounded-full animate-pulse" />
                                    </div>
                                    <div className="space-y-3">
                                        <span className={`inline-block px-3 py-1 rounded-full text-[10px] uppercase tracking-wider font-bold text-white shadow-sm ${colors[idx % colors.length]}`}>{ms.date}</span>
                                        <h3 className="text-xl font-serif font-bold text-gray-900 dark:text-gray-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{ms.title}</h3>
                                        <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">{ms.desc}</p>
                                    </div>
                                </div>
                            </ScrollRevelation>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
};

// Main about page component
const AboutPage: React.FC = () => {
    const { t } = useTranslation();

    // Features with localized strings
    const features = [
        {
            icon: Sparkles,
            title: t('about.offerings.items.selfDiscovery.title'),
            description: t('about.offerings.items.selfDiscovery.desc'),
            color: "text-purple-600 dark:text-purple-400",
            bg: "bg-purple-50 dark:bg-purple-900/30",
            delay: 0,
            className: "md:col-span-2"
        },
        {
            icon: Search,
            title: t('about.offerings.items.knowledgeHub.title'),
            description: t('about.offerings.items.knowledgeHub.desc'),
            color: "text-blue-600 dark:text-blue-400",
            bg: "bg-blue-50 dark:bg-blue-900/30",
            delay: 0.1,
            className: "md:col-span-1"
        },
        {
            icon: Users,
            title: t('about.offerings.items.studyRooms.title'),
            description: t('about.offerings.items.studyRooms.desc'),
            color: "text-indigo-600 dark:text-indigo-400",
            bg: "bg-indigo-50 dark:bg-indigo-900/30",
            delay: 0.2,
            className: "md:col-span-1"
        },
        {
            icon: Bot,
            title: t('about.offerings.items.aiCompanion.title'),
            description: t('about.offerings.items.aiCompanion.desc'),
            color: "text-teal-600 dark:text-teal-400",
            bg: "bg-teal-50 dark:bg-teal-900/30",
            delay: 0.3,
            className: "md:col-span-2"
        }
    ];

    // team section
    const teamMembers = [
        {
            name: "Hana Tang",
            role: t('about.team.role'),
            image: hanaImg,
            delay: 0,
            socials: [
                { icon: Mail, url: "mailto:2006yihui@gmail.com", label: t('about.team.social.email'), color: "hover:text-red-500 dark:hover:text-red-400" },
                { icon: Linkedin, url: "https://www.linkedin.com/in/hana2006/", label: t('about.team.social.linkedin'), color: "hover:text-blue-600 dark:hover:text-blue-400" },
                { icon: Github, url: "https://github.com/mewHacks", label: t('about.team.social.github'), color: "hover:text-gray-900 dark:hover:text-gray-100" },
                { icon: Globe, url: "https://hana-tang-portfolio.vercel.app", label: t('about.team.social.website'), color: "hover:text-teal-500 dark:hover:text-teal-400" }
            ]
        },
        {
            name: "Jasmine Ng",
            role: t('about.team.role'),
            image: jasmineImg,
            delay: 0.1,
            socials: [
                { icon: Mail, url: "mailto:jojojasmine76@gmail.com", label: t('about.team.social.email'), color: "hover:text-red-500 dark:hover:text-red-400" },
                { icon: Linkedin, url: "https://www.linkedin.com/in/jasmine-n-3a3749367/", label: t('about.team.social.linkedin'), color: "hover:text-blue-600 dark:hover:text-blue-400" },
                { icon: Github, url: "https://github.com/jojojasmine00", label: t('about.team.social.github'), color: "hover:text-gray-900 dark:hover:text-gray-100" },
            ]
        }
    ];

    return (
        // Render JSX
        <div className="min-h-screen bg-white dark:bg-gray-950 overflow-hidden">

            {/* Navigation bar */}
            <Navbar />

            {/* Hero section */}
            <section className="pt-32 pb-20 px-4 bg-gradient-to-b from-indigo-50/50 dark:from-indigo-950/30 to-white dark:to-gray-950 relative">
                <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4 w-[800px] h-[800px] bg-indigo-200/20 dark:bg-indigo-800/10 rounded-full blur-3xl pointer-events-none" />
                <div className="max-w-4xl mx-auto text-center relative z-10">
                    <ScrollRevelation>
                        <h1 className="text-5xl md:text-7xl font-serif font-bold text-gray-900 dark:text-gray-100 mb-8 leading-tight tracking-tight">
                            {t('about.hero.title')} <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-purple-600 to-sky-500 dark:from-indigo-400 dark:via-purple-400 dark:to-sky-400">{t('about.hero.subtitle')}</span>
                        </h1>
                    </ScrollRevelation>
                    <ScrollRevelation delay={0.2}>
                        <p className="text-lg md:text-xl text-gray-700 dark:text-gray-300 leading-relaxed">
                            {t('about.hero.description')}
                        </p>
                    </ScrollRevelation>
                </div>
            </section>

            {/* Founder's Letter Envelope */}
            <EnvelopeLetter />

            {/* Mission section */}
            <section className="py-20 bg-white dark:bg-gray-950">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                        <div className="space-y-8">
                            <ScrollRevelation direction="right">
                                <h2 className="text-3xl md:text-5xl font-serif font-bold text-gray-900 dark:text-gray-100">{t('about.mission.title')}</h2>
                            </ScrollRevelation>
                            <ScrollRevelation direction="right" delay={0.1}>
                                <p className="text-lg md:text-xl text-gray-700 dark:text-gray-300 leading-relaxed">
                                    {t('about.mission.description')}
                                </p>
                            </ScrollRevelation>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
                                <ScrollRevelation delay={0.2} direction="up">
                                    <div className="flex items-center gap-4 p-4 rounded-2xl bg-gray-50 dark:bg-gray-800 border border-transparent hover:border-indigo-100 dark:hover:border-indigo-800 hover:bg-white dark:hover:bg-gray-700 hover:shadow-lg transition-all duration-300 group h-full">
                                        <div className="p-3 bg-white dark:bg-gray-700 rounded-xl text-indigo-600 dark:text-indigo-400 shadow-sm group-hover:scale-110 group-hover:text-indigo-700 dark:group-hover:text-indigo-300 transition-all duration-300">
                                            <Target className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-gray-900 dark:text-gray-100 mb-1">{t('about.mission.values.precision.title')}</h4>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">{t('about.mission.values.precision.desc')}</p>
                                        </div>
                                    </div>
                                </ScrollRevelation>
                                <ScrollRevelation delay={0.3} direction="up">
                                    <div className="flex items-center gap-4 p-4 rounded-2xl bg-gray-50 dark:bg-gray-800 border border-transparent hover:border-blue-100 dark:hover:border-blue-800 hover:bg-white dark:hover:bg-gray-700 hover:shadow-lg transition-all duration-300 group h-full">
                                        <div className="p-3 bg-white dark:bg-gray-700 rounded-xl text-blue-600 dark:text-blue-400 shadow-sm group-hover:scale-110 group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-all duration-300">
                                            <Globe className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-gray-900 dark:text-gray-100 mb-1">{t('about.mission.values.access.title')}</h4>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">{t('about.mission.values.access.desc')}</p>
                                        </div>
                                    </div>
                                </ScrollRevelation>
                            </div>
                        </div>
                        <ScrollRevelation direction="left" delay={0.2}>
                            <div className="relative group">
                                <div className="absolute inset-0 bg-indigo-600 dark:bg-indigo-400 rounded-3xl rotate-3 opacity-10 dark:opacity-20 group-hover:rotate-6 transition-transform duration-500"></div>
                                <div className="relative bg-white dark:bg-gray-800 p-2 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-700 aspect-[4/3] overflow-hidden">
                                    <img src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80" alt="Students collaborative study" className="w-full h-full object-cover rounded-2xl" loading="lazy" />
                                </div>
                            </div>
                        </ScrollRevelation>
                    </div>
                </div>
            </section>

            {/* Chronicle Timeline */}
            <ChronicleTimeline />

            {/* Features section */}
            <section className="py-24 bg-gray-50 dark:bg-gray-900 relative overflow-hidden">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                    <ScrollRevelation className="text-center mb-16">
                        <h2 className="text-3xl md:text-5xl font-serif font-bold text-gray-900 dark:text-gray-100 mb-6">{t('about.offerings.title')}</h2>
                    </ScrollRevelation>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {features.map((feature, idx) => (
                            <ScrollRevelation key={idx} delay={feature.delay} className={`h-full ${feature.className || ''}`}>
                                <div className="h-full bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-sm hover:shadow-xl transition-all duration-500 border border-gray-100 dark:border-gray-700 hover:-translate-y-1 group relative overflow-hidden">
                                    <div className={`absolute top-0 right-0 w-64 h-64 ${feature.bg} rounded-full blur-3xl opacity-20 dark:opacity-30 group-hover:opacity-40 dark:group-hover:opacity-50 transition-opacity duration-500 will-change-opacity`}></div>
                                    <div className="relative z-10">
                                        <div className={`w-14 h-14 ${feature.bg} ${feature.color} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-500`}><feature.icon className="w-7 h-7" /></div>
                                        <h3 className="text-xl md:text-2xl font-serif font-bold text-gray-900 dark:text-gray-100 mb-3">{feature.title}</h3>
                                        <p className="text-gray-600 dark:text-gray-400 leading-relaxed">{feature.description}</p>
                                    </div>
                                </div>
                            </ScrollRevelation>
                        ))}
                    </div>
                </div>
            </section>

            {/* Team section */}
            <section className="py-24 bg-gray-50 dark:bg-gray-900 relative overflow-hidden">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                    <ScrollRevelation className="text-center mb-16">
                        <h2 className="text-3xl md:text-5xl font-serif font-bold text-gray-900 dark:text-gray-100 mb-6">{t('about.team.title')}</h2>
                    </ScrollRevelation>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 md:gap-16 max-w-4xl mx-auto">
                        {teamMembers.map((member, idx) => (
                            <ScrollRevelation key={idx} delay={member.delay}>
                                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden max-w-md mx-auto">
                                    <div className="p-3 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full overflow-hidden border border-gray-100 dark:border-gray-700">
                                                <img src={member.image} alt={member.name} className="w-full h-full object-cover" />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 leading-tight">{member.name}</span>
                                                <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">{member.role}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="aspect-square w-full bg-gray-100 dark:bg-gray-700 relative">
                                        <img src={member.image} alt={member.name} className="w-full h-full object-cover" />
                                    </div>
                                    <div className="p-4">
                                        <div className="flex items-center gap-4 mb-3">
                                            {member.socials.map((social, sIdx) => (
                                                <a key={sIdx} href={social.url} target="_blank" rel="noopener noreferrer" className={`text-gray-600 dark:text-gray-400 hover:scale-110 transition-transform duration-200 ${social.color}`} title={social.label}>
                                                    <social.icon className="w-6 h-6 stroke-[1.5]" />
                                                </a>
                                            ))}
                                        </div>
                                        <div className="text-sm">
                                            <p className="font-semibold text-gray-900 dark:text-gray-100 mb-1">1,234 likes</p>
                                            <p className="text-gray-700 dark:text-gray-300">
                                                <span className="font-semibold mr-2">{member.name}</span>
                                                {t('about.team.caption')}
                                                <span className="text-blue-600 dark:text-blue-400"> #InAspired</span>
                                            </p>
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

export default AboutPage;