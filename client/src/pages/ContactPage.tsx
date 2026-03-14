import React, { useState, useRef, useEffect } from 'react';
import { API_BASE_URL } from '../config';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import ScrollRevelation from '@/components/ui/ScrollRevelation';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, MessageSquare, Send, MapPin, Instagram, Linkedin, ChevronDown, Check, Bug, Upload } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { useAuth } from '../contexts/AuthContext';
import FeedbackModal from '@/components/feedback/FeedbackModal';
import { useTranslation } from 'react-i18next';
import { useConfirm } from '@/contexts/ConfirmContext';

// Custom Discord icon since it's not in standard Lucide set or may be deprecated
const DiscordIcon = ({ className }: { className?: string }) => (
    <svg
        viewBox="0 0 127.14 96.36"
        className={className}
        fill="currentColor"
        xmlns="http://www.w3.org/2000/svg"
    >
        <path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.11,77.11,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22h0C129.24,52.84,122.09,29.11,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.25,60,73.25,53s5-12.74,11.44-12.74S96.23,46,96.12,53,91.08,65.69,84.69,65.69Z" />
    </svg>
);

// Custom select dropdown list

// Option interface for select dropdown list
interface Option {
    label: string;
    value: string;
}

// Props interface required for dropdown select component
interface CustomSelectProps {
    label: string;
    options: Option[];
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
}

const CustomSelect: React.FC<CustomSelectProps> = ({ label, options, value, onChange, placeholder = "Select an option" }) => {
    const [isOpen, setIsOpen] = useState(false); // Tracks whether the dropdown is open
    const selectRef = useRef<HTMLDivElement>(null); // Reference to the select element, used to detect outside clicks

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        // Add and clean up event listener
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Find the label of the selected option
    const selectedLabel = options.find(opt => opt.value === value)?.label;

    return (
        <div className="space-y-2" ref={selectRef}>
            {/* Display label */}
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>

            <div className="relative">
                {/* Dropdown toggle button */}
                <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className={`w-full px-4 py-3 rounded-xl border flex items-center justify-between transition-all duration-200 outline-none
                        ${isOpen ? 'border-indigo-500 ring-2 ring-indigo-200 dark:ring-indigo-800' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'}
                        bg-white dark:bg-gray-800 text-left
                    `}
                >
                    <span className={`block truncate ${!selectedLabel ? 'text-gray-400 dark:text-gray-500' : 'text-gray-900 dark:text-gray-100'}`}>
                        {/* Display placeholder if no option is selected */}
                        {selectedLabel || placeholder}
                    </span>
                    {/* Dropdown arrow */}
                    <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${isOpen ? 'transform rotate-180' : ''}`} />
                </button>

                <AnimatePresence>
                    {isOpen && (
                        <motion.div
                            initial={{ opacity: 0, y: -10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -10, scale: 0.95 }}
                            transition={{ duration: 0.1, ease: "easeOut" }}
                            className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl shadow-xl max-h-60 overflow-auto py-1 focus:outline-none"
                        >
                            {options.map((option) => (
                                <div
                                    key={option.value}
                                    onClick={() => {
                                        onChange(option.value); // Update selected value
                                        setIsOpen(false); // Close dropdown
                                    }}
                                    className={`
                                        cursor-pointer select-none relative py-3 pl-4 pr-9 hover:bg-indigo-50 dark:hover:bg-indigo-950 transition-colors
                                        ${value === option.value ? 'text-indigo-600 dark:text-indigo-400 font-medium bg-indigo-50/50 dark:bg-indigo-950/50' : 'text-gray-900 dark:text-gray-100'}
                                    `}
                                >
                                    <span className="block truncate">{option.label}</span>
                                    {value === option.value && (
                                        <span className="absolute inset-y-0 right-0 flex items-center pr-4 text-indigo-600 dark:text-indigo-400">
                                            {/* Checkmark next to selected option */}
                                            <Check className="w-5 h-5" />
                                        </span>
                                    )}
                                </div>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

// Main contact page component
const ContactPage: React.FC = () => {
    const { t } = useTranslation();
    const { alert: alertAction } = useConfirm();

    const [formStatus, setFormStatus] = useState<'idle' | 'submitting' | 'success'>('idle'); // Tracks form status
    const [subject, setSubject] = useState('general'); // Tracks selected subject

    const { isAuthenticated } = useAuth();
    const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);

    // Tracks form data for predictable state
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        message: ''
    });

    // Handles form submission logic
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault(); // Prevents page reload
        setFormStatus('submitting'); // Shows loading state indicator

        // Sends API request with clean payload
        try {
            const res = await fetch(`${API_BASE_URL}/api/contact`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: formData.fullName,
                    email: formData.email,
                    topic: subject,
                    message: formData.message
                })
            });

            const data = await res.json();

            if (!res.ok) { // Error handling
                if (res.status === 429) { // Rate limit exceeded
                    alertAction({
                        title: t('common.error'),
                        message: data.message || t('contact.form.errors.rateLimit'),
                        variant: 'danger'
                    });
                } else { // Other general errors
                    alertAction({
                        title: t('common.error'),
                        message: data.message || t('contact.form.errors.general'),
                        variant: 'danger'
                    });
                }
                setFormStatus('idle'); // Reset form status
                return;
            }

            // Show success state
            setFormStatus('success');

            // Reset form after 3 seconds
            setTimeout(() => {
                setFormStatus('idle');
                setFormData({ fullName: '', email: '', message: '' });
                setSubject('general');
            }, 3000);

        } catch (error) {
            console.error(error);
            alertAction({
                title: t('common.error'),
                message: t('contact.form.errors.network'),
                variant: 'danger'
            });
            setFormStatus('idle');
        }
    };

    // Handles input changes
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData(prev => ({ ...prev, [e.target.id]: e.target.value }));
    };

    // Dropdown options for the topic selector
    const subjectOptions = [
        { label: t('contact.form.topics.general'), value: 'general' },
        { label: t('contact.form.topics.support'), value: 'support' },
        { label: t('contact.form.topics.partnership'), value: 'partnership' },
    ];

    return (
        <div className="min-h-screen bg-white dark:bg-gray-950 overflow-hidden">

            {/* Navigation bar */}
            <Navbar />

            {/* Hero section */}
            <section className="pt-32 pb-20 px-4 bg-gradient-to-b from-indigo-50/50 dark:from-indigo-950/30 to-white dark:to-gray-950 relative">

                <div className="max-w-4xl mx-auto text-center relative z-10">
                    <ScrollRevelation>
                        <div className="inline-flex items-center justify-center p-3 bg-indigo-100 dark:bg-indigo-950 rounded-2xl text-indigo-600 dark:text-indigo-400 mb-6">
                            <Mail className="w-8 h-8" />
                        </div>
                        <h1 className="text-4xl md:text-5xl font-serif font-bold text-gray-900 dark:text-gray-100 mb-6 leading-tight">
                            {t('contact.hero.title')}
                        </h1>
                    </ScrollRevelation>
                    <ScrollRevelation delay={0.2}>
                        <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed">
                            {t('contact.hero.description1')} <br />
                            {t('contact.hero.description2')}
                        </p>
                    </ScrollRevelation>
                </div>
            </section>

            {/* Contact content */}
            <section className="py-12 pb-24 px-4 bg-white dark:bg-gray-950 relative z-10">
                <div className="max-w-7xl mx-auto">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24">

                        {/* Left column: Contact info */}
                        <ScrollRevelation className="space-y-8">
                            <div className="bg-gray-50 dark:bg-gray-900 rounded-3xl p-8 md:p-12 text-gray-900 border border-gray-100 dark:border-gray-800">

                                <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-gray-100">{t('contact.info.title')}</h2>
                                <p className="text-gray-600 dark:text-gray-400 mb-10 leading-relaxed">
                                    {t('contact.info.description')}
                                </p>

                                <div className="space-y-6">
                                    <div className="flex items-start gap-4">
                                        <div className="p-2 bg-indigo-50 dark:bg-indigo-950 rounded-lg text-indigo-600 dark:text-indigo-400">
                                            <Mail className="w-6 h-6" />
                                        </div>

                                        {/* Email */}
                                        <div>
                                            <div className="font-medium text-gray-900 dark:text-gray-100 text-sm mb-1">{t('contact.info.emailLabel')}</div>
                                            <a href="mailto:inaspired.official@gmail.com" className="text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">inaspired.official@gmail.com</a>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-4">
                                        <div className="p-2 bg-indigo-50 dark:bg-indigo-950 rounded-lg text-indigo-600 dark:text-indigo-400">
                                            <MessageSquare className="w-6 h-6" />
                                        </div>
                                        <div>
                                            {/* Socials */}
                                            <div className="font-medium text-gray-900 dark:text-gray-100 text-sm mb-1">{t('contact.info.socialsLabel')}</div>
                                            <div className="flex gap-4 mt-2">
                                                {/* 1. Instagram */}
                                                <a href="#" className="p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full hover:border-indigo-300 dark:hover:border-indigo-600 hover:text-indigo-600 dark:hover:text-indigo-400 text-gray-500 dark:text-gray-400 transition-all hover:scale-110">
                                                    <Instagram className="w-5 h-5" />
                                                </a>
                                                {/* 2. Discord */}
                                                <a href="#" className="p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full hover:border-indigo-300 dark:hover:border-indigo-600 hover:text-indigo-600 dark:hover:text-indigo-400 text-gray-500 dark:text-gray-400 transition-all hover:scale-110">
                                                    <DiscordIcon className="w-5 h-5" />
                                                </a>
                                                {/* 3. LinkedIn */}
                                                <a href="#" className="p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full hover:border-indigo-300 dark:hover:border-indigo-600 hover:text-indigo-600 dark:hover:text-indigo-400 text-gray-500 dark:text-gray-400 transition-all hover:scale-110">
                                                    <Linkedin className="w-5 h-5" />
                                                </a>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Location */}
                                    <div className="flex items-start gap-4">
                                        <div className="p-2 bg-indigo-50 dark:bg-indigo-950 rounded-lg text-indigo-600 dark:text-indigo-400">
                                            <MapPin className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <div className="font-medium text-gray-900 dark:text-gray-100 text-sm mb-1">{t('contact.info.locationLabel')}</div>
                                            <p className="text-gray-600 dark:text-gray-400">{t('contact.info.locationValue')}</p>
                                        </div>
                                    </div>

                                </div>
                            </div>

                            {/* FAQ link */}
                            <div className="bg-gray-50 dark:bg-gray-900 rounded-2xl p-6 border border-gray-100 dark:border-gray-800">
                                <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-2">{t('contact.faq.title')}</h3>
                                <p className="text-gray-500 dark:text-gray-400 mb-4 text-sm">{t('contact.faq.description')}</p>
                                <Button variant="outline" size="sm" onClick={() => window.location.href = '/help'}>
                                    {t('contact.faq.button')}
                                </Button>
                            </div>

                            {/* Feedback button for logged-in users */}
                            {isAuthenticated && (
                                <div className="bg-red-50 dark:bg-red-950/30 rounded-2xl p-6 border border-red-100 dark:border-red-900">
                                    <div className="flex items-start gap-3 mb-3">
                                        <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900">
                                            <Bug className="w-5 h-5 text-red-600 dark:text-red-400" />
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="font-bold text-red-900 dark:text-red-400 mb-1">
                                                {t('contact.bug.title')}
                                            </h3>
                                            <p className="text-red-700 dark:text-red-500 text-sm leading-relaxed">
                                                {t('contact.bug.description')}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="bg-white/50 dark:bg-gray-800/50 rounded-lg p-3 mb-3">
                                        <p className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-2">
                                            <Upload className="w-3.5 h-3.5" />
                                            {t('contact.bug.hint')}
                                        </p>
                                    </div>

                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setIsFeedbackModalOpen(true)}
                                        className="w-full border-red-300 dark:border-red-800 text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-950
                                            font-medium flex items-center justify-center gap-2"
                                    >
                                        <Bug className="w-4 h-4" />
                                        {t('contact.bug.button')}
                                    </Button>
                                </div>
                            )}
                        </ScrollRevelation>

                        {/* Right column: Form for further inquiries*/}
                        <ScrollRevelation direction="left" delay={0.2}>
                            <div className="bg-white dark:bg-gray-900 p-8 md:p-10 rounded-3xl shadow-xl border border-indigo-50 dark:border-gray-800 border-t-4 border-t-indigo-500">
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">{t('contact.form.title')}</h2>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">{t('contact.form.description')}</p>

                                {/* Conditional rendering based on submission state */}
                                {formStatus === 'success' ? (
                                    // Animate success message
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 p-6 rounded-xl text-center border border-green-100 dark:border-green-900"
                                    >
                                        <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <Send className="w-6 h-6 text-green-600 dark:text-green-400" />
                                        </div>
                                        <h3 className="font-bold text-lg mb-2">{t('contact.form.successTitle')}</h3>
                                        <p>{t('contact.form.successDescription')}</p>
                                    </motion.div>
                                ) : (
                                    <form onSubmit={handleSubmit} className="space-y-6">
                                        {/* Form input fields */}
                                        {/* 1. Full name */}
                                        <div className="space-y-2">
                                            <label htmlFor="fullName" className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('contact.form.labelName')}</label>
                                            <input
                                                type="text"
                                                id="fullName"
                                                required
                                                value={formData.fullName}
                                                onChange={handleInputChange}
                                                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 outline-none transition-all"
                                                placeholder={t('contact.form.phName', 'John Doe')}
                                            />
                                        </div>

                                        {/* 2. Email */}
                                        <div className="space-y-2">
                                            <label htmlFor="email" className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('contact.form.labelEmail')}</label>
                                            <input
                                                type="email"
                                                id="email"
                                                required
                                                value={formData.email}
                                                onChange={handleInputChange}
                                                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 outline-none transition-all"
                                                placeholder={t('contact.form.phEmail', 'john@example.com')}
                                            />
                                        </div>

                                        {/* 3. Topic */}
                                        <CustomSelect
                                            label={t('contact.form.labelTopic')}
                                            options={subjectOptions}
                                            value={subject}
                                            onChange={setSubject}
                                        />

                                        {/* 4. Message */}
                                        <div className="space-y-2">
                                            <label htmlFor="message" className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('contact.form.labelMessage')}</label>
                                            <textarea
                                                id="message"
                                                required
                                                rows={4}
                                                value={formData.message}
                                                onChange={handleInputChange}
                                                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 outline-none transition-all resize-none"
                                                placeholder={t('contact.form.phMessage', 'How can we help you?')}
                                            ></textarea>
                                        </div>

                                        {/* Submit button */}
                                        <Button
                                            type="submit"
                                            variant="primary"
                                            size="lg"
                                            className="w-full"
                                            disabled={formStatus === 'submitting'} // Prevents double submission
                                        >
                                            {/* Shows loading spinner or normal text */}
                                            {formStatus === 'submitting' ? (
                                                <span className="flex items-center gap-2">
                                                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                    {t('contact.form.buttonSending')}
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-2">
                                                    {t('contact.form.buttonSend')} <Send className="w-4 h-4" />
                                                </span>
                                            )}
                                        </Button>
                                    </form>
                                )}
                            </div>
                        </ScrollRevelation>
                    </div>
                </div>
            </section>

            <Footer />

            {/* Feedback Modal */}
            <FeedbackModal
                isOpen={isFeedbackModalOpen}
                onClose={() => setIsFeedbackModalOpen(false)}
            />

        </div>
    );
};

export default ContactPage;