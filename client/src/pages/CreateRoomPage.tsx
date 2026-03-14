// Form page for creating a new virtual study room
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useToast } from '../contexts/ToastContext';
import { httpClient } from '../services/httpClient';
import { ChevronLeft, Lock, Globe, Book, Layers, Users, ChevronDown, Check, Clock, RefreshCw, Pin } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { RoomLevel, RoomType } from '../types';
import { DOMAIN_OPTIONS } from '../data/domains';
import ImageUpload from '../components/ui/ImageUpload';
import { useTranslation } from 'react-i18next';

// Create a room

// Custom Select Component (reused implementation like the other dropdown select in other pages)
interface Option {
    label: string;
    value: string | number;
}

interface CustomSelectProps {
    label: string;
    options: Option[];
    value: string | number;
    onChange: (value: any) => void;
    placeholder?: string;
    icon?: React.ElementType; // Optional icon for the trigger
}

const CustomSelect: React.FC<CustomSelectProps> = ({ label, options, value, onChange, placeholder = "Select an option", icon: Icon }) => {
    const [isOpen, setIsOpen] = useState(false);
    const selectRef = useRef<HTMLDivElement>(null);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selectedOption = options.find(opt => opt.value === value);

    return (
        <div className="space-y-1" ref={selectRef}>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
            <div className="relative">
                <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className={`w-full px-4 py-3 pl-10 rounded-xl border flex items-center justify-between transition-all duration-200 outline-none
                        ${isOpen ? 'border-indigo-500 dark:border-indigo-400 ring-2 ring-indigo-200 dark:ring-indigo-900/30' : 'border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600'}
                        bg-white dark:bg-gray-800 text-left relative
                    `}
                >
                    {/* Render Icon if provided */}
                    {Icon && (
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500">
                            <Icon className="w-5 h-5" />
                        </div>
                    )}

                    <span className={`block truncate ${!selectedOption ? 'text-gray-500 dark:text-gray-400' : 'text-gray-900 dark:text-white'}`}>
                        {selectedOption ? selectedOption.label : placeholder}
                    </span>
                    <ChevronDown className={`w-5 h-5 text-gray-400 dark:text-gray-500 transition-transform duration-200 ${isOpen ? 'transform rotate-180' : ''}`} />
                </button>

                <AnimatePresence>
                    {isOpen && (
                        <motion.div
                            initial={{ opacity: 0, y: -5, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -5, scale: 0.98 }}
                            transition={{ duration: 0.1 }}
                            className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl shadow-xl dark:shadow-gray-900/50 max-h-60 overflow-auto py-1 focus:outline-none"
                        >
                            {options.map((option) => (
                                <div
                                    key={option.value}
                                    onClick={() => {
                                        onChange(option.value);
                                        setIsOpen(false);
                                    }}
                                    className={`
                                        cursor-pointer select-none relative py-3 pl-4 pr-10 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors
                                        ${value === option.value ? 'text-indigo-600 dark:text-indigo-400 font-medium bg-indigo-50/50 dark:bg-indigo-900/20' : 'text-gray-900 dark:text-gray-300'}
                                    `}
                                >
                                    <span className="block truncate">{option.label}</span>
                                    {value === option.value && (
                                        <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-indigo-600 dark:text-indigo-400">
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

const CreateRoomPage: React.FC = () => {
    const { t } = useTranslation();

    // For navigation purposes
    const navigate = useNavigate();

    // Show toast messages
    const toast = useToast();

    const { user } = useAuth();
    const isAdmin = user?.role === 'admin';

    // State for form loading status
    const [loading, setLoading] = useState(false);

    // Generate random 6-character alphanumeric code
    const generateJoinCode = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        for (let i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    };

    // Initial form state
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        type: 'public' as RoomType,
        joinCode: '',
        maxParticipants: 6,
        level: 'All Levels' as RoomLevel,
        courseId: '',
        domainId: '', // Map to [domainId] for backend
        coverImage: '', // Optional cover image
        sessionDuration: 25, // Default to 25 minutes
        isPersistent: false
    });

    // Handle form submission
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        // Simple Validation: Require code for private rooms
        if (formData.type === 'private' && !formData.joinCode) {
            toast.error(t('rooms.create.toast.noCode'));
            setLoading(false);
            return;
        }

        try {
            // Backend API call
            const res = await httpClient('/api/rooms', {
                method: 'POST',
                body: JSON.stringify({
                    ...formData,
                    domainIds: formData.domainId ? [formData.domainId] : []
                })
            });

            if (res.ok) {
                const room = await res.json();
                console.log('Room created response:', room);
                toast.success(t('rooms.create.toast.success'));
                const roomId = room._id || room.id;
                if (roomId) {
                    navigate(`/rooms/${roomId}/meet`);
                } else {
                    console.error('Room ID missing in response:', room);
                    toast.error(t('rooms.create.toast.missingId'));
                }
            } else {
                // Handle API errors (e.g. eligibility denied)
                const err = await res.json();
                toast.error(err.message || t('rooms.create.toast.fail'));
                if (res.status === 403) navigate('/rooms'); // Redirect if ineligible
            }
        } catch (error) { // Handle network errors
            toast.error(t('rooms.create.toast.networkError'));
        } finally { // Always stop loading indicator
            setLoading(false);
        }
    };

    return (
        // Render JSX
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col">

            {/* Navigation bar */}
            <Navbar />

            {/* Main content */}
            <main className="flex-grow pt-28 pb-20 px-4 max-w-2xl mx-auto w-full">
                <button
                    onClick={() => navigate('/rooms')}
                    className="flex items-center text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 mb-6 transition-colors"
                >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    {t('rooms.create.backBtn')}
                </button>

                <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-8">
                    <div className="mb-8">
                        <h1 className="text-2xl font-serif font-bold text-gray-900 dark:text-white">{t('rooms.create.title')}</h1>
                        <p className="text-gray-500 dark:text-gray-400">{t('rooms.create.subtitle')}</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">

                        {/* Cover Image */}
                        <div>
                            <ImageUpload
                                label={t('rooms.create.fields.coverPhoto')}
                                value={formData.coverImage}
                                onChange={(val) => setFormData({ ...formData, coverImage: val })}
                            />
                        </div>

                        {/* Name */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('rooms.create.fields.name')}</label>
                            <Input
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder={t('rooms.create.fields.namePlaceholder')}
                                required
                            />
                        </div>

                        {/* Description */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('rooms.create.fields.desc')}</label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder={t('rooms.create.fields.descPlaceholder')}
                                className="w-full bg-white dark:bg-gray-800 rounded-xl border border-gray-300 dark:border-gray-700 focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-indigo-500 dark:focus:ring-indigo-400 min-h-[100px] p-3 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
                                required
                            />
                        </div>

                        {/* Type & Code & Max Participants */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('rooms.create.fields.maxParticipants')}</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Users className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                                    </div>
                                    <input
                                        type="number"
                                        min="2"
                                        max="6"
                                        value={formData.maxParticipants}
                                        onChange={(e) => setFormData({ ...formData, maxParticipants: parseInt(e.target.value) })}
                                        className="w-full bg-white dark:bg-gray-800 pl-10 rounded-xl border border-gray-300 dark:border-gray-700 focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-indigo-500 dark:focus:ring-indigo-400 py-3 appearance-none text-gray-900 dark:text-white"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('rooms.create.fields.privacy')}</label>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, type: 'public' })}
                                        className={`flex-1 flex flex-col items-center p-3 rounded-lg border ${formData.type === 'public'
                                            ? 'border-indigo-500 dark:border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400'
                                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-gray-700 dark:text-gray-300'
                                            }`}
                                    >
                                        <Globe className="w-5 h-5 mb-1" />
                                        <span className="text-xs font-medium">{t('rooms.create.fields.privacyPublic')}</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFormData({
                                            ...formData,
                                            type: 'private',
                                            joinCode: formData.joinCode || generateJoinCode() // Auto-generate if empty
                                        })}
                                        className={`flex-1 flex flex-col items-center p-3 rounded-lg border ${formData.type === 'private'
                                            ? 'border-amber-500 dark:border-amber-500 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-gray-700 dark:text-gray-300'
                                            }`}
                                    >
                                        <Lock className="w-5 h-5 mb-1" />
                                        <span className="text-xs font-medium">{t('rooms.create.fields.privacyPrivate')}</span>
                                    </button>
                                </div>
                            </div>

                            {formData.type === 'private' && (
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('rooms.create.fields.roomCode')}</label>
                                    <div className="flex gap-2">
                                        <Input
                                            value={formData.joinCode}
                                            onChange={(e) => setFormData({ ...formData, joinCode: e.target.value.toUpperCase() })}
                                            placeholder={t('rooms.create.fields.roomCodePlaceholder')}
                                            className="flex-1 font-mono tracking-widest text-center uppercase"
                                            maxLength={6}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, joinCode: generateJoinCode() })}
                                            className="px-3 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl border border-gray-300 dark:border-gray-700 transition-colors"
                                            title="Generate new code"
                                        >
                                            <RefreshCw className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                                        </button>
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('rooms.create.fields.roomCodeHint')}</p>
                                </div>
                            )}
                        </div>

                        {/* Level & Domain */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <CustomSelect
                                    label={t('rooms.create.fields.level')}
                                    icon={Layers}
                                    value={formData.level}
                                    onChange={(val) => setFormData({ ...formData, level: val })}
                                    options={[
                                        { label: 'All Levels', value: 'All Levels' },
                                        { label: 'Foundation', value: 'Foundation' },
                                        { label: 'Diploma', value: 'Diploma' },
                                        { label: 'General Pre-U', value: 'General Pre-U' },
                                    ]}
                                />
                            </div>

                            <div>
                                <CustomSelect
                                    label={t('rooms.create.fields.domain')}
                                    icon={Globe}
                                    value={formData.domainId}
                                    onChange={(val) => setFormData({ ...formData, domainId: val })}
                                    options={[
                                        { label: 'General / No Specific Field', value: '' },
                                        ...DOMAIN_OPTIONS.map(d => ({ label: d.label, value: d.id }))
                                    ]}
                                />
                            </div>
                        </div>

                        {/* Course ID */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('rooms.create.fields.courseId')}</label>
                            <Input
                                icon={Book}
                                value={formData.courseId}
                                onChange={(e) => setFormData({ ...formData, courseId: e.target.value })}
                                placeholder={t('rooms.create.fields.courseIdPlaceholder')}
                            />
                        </div>

                        {/* Session Duration Selector */}
                        <div>
                            <CustomSelect
                                label={t('rooms.create.fields.duration')}
                                value={formData.sessionDuration}
                                onChange={(val) => setFormData({ ...formData, sessionDuration: val })}
                                icon={Clock}
                                options={[
                                    { label: '25 Minutes (Standard Pomodoro)', value: 25 },
                                    { label: '30 Minutes', value: 30 },
                                    { label: '45 Minutes (Extended)', value: 45 },
                                    { label: '60 Minutes (Long Session)', value: 60 },
                                ]}
                            />
                            <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">{t('rooms.create.fields.durationHint')}</p>
                        </div>

                        {/* Persistent Room Toggle — Admin only */}
                        {isAdmin && (
                            <div
                                onClick={() => setFormData({ ...formData, isPersistent: !formData.isPersistent })}
                                className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-colors ${
                                    formData.isPersistent
                                        ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800'
                                        : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-indigo-200 dark:hover:border-indigo-800'
                                }`}
                            >
                                <div className="flex items-center gap-3">
                                    <Pin className={`w-4 h-4 ${formData.isPersistent ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400 dark:text-gray-500'}`} />
                                    <div>
                                        <p className="text-sm font-medium text-gray-900 dark:text-white">Persistent Room</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">Room resets instead of disappearing when session ends</p>
                                    </div>
                                </div>
                                <div className={`w-10 h-6 rounded-full transition-colors relative flex-shrink-0 ${formData.isPersistent ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'}`}>
                                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${formData.isPersistent ? 'translate-x-5' : 'translate-x-1'}`} />
                                </div>
                            </div>
                        )}

                        <div className="pt-6 border-t border-gray-100 dark:border-gray-800 flex justify-end">
                            <Button
                                variant="primary"
                                type="submit"
                                disabled={loading}
                                className="px-8"
                            >
                                {loading ? t('rooms.create.submittingBtn') : t('rooms.create.submitBtn')}
                            </Button>
                        </div>
                    </form>
                </div>

            </main>
            <Footer />
        </div>
    );
};

export default CreateRoomPage;