// Confirmation dialog modal with customizable title, message, and actions
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from './Button';

interface ConfirmOptions {
    title?: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: 'danger' | 'warning' | 'info';
    verificationKeyword?: string;
    verificationPlaceholder?: string;
}

interface ConfirmModalProps {
    isOpen: boolean;
    options: ConfirmOptions;
    onConfirm: () => void;
    onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
    isOpen,
    options,
    onConfirm,
    onCancel
}) => {
    const { t } = useTranslation();
    const {
        title,
        message,
        confirmLabel,
        cancelLabel,
        variant = 'warning',
        verificationKeyword,
        verificationPlaceholder
    } = options;

    const [verificationInput, setVerificationInput] = React.useState('');
    const isVerified = !verificationKeyword || verificationInput.toUpperCase() === verificationKeyword.toUpperCase();

    const getTitle = () => {
        if (title) return title;
        switch (variant) {
            case 'danger':
                return t('common.warning');
            case 'warning':
                return t('common.confirm');
            case 'info':
            default:
                return t('common.confirm');
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onCancel}
                        className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
                    />

                    {/* Modal Content */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-white/20"
                    >
                        {/* Close button */}
                        <button
                            onClick={onCancel}
                            className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="p-8 pb-6 text-center">
                            <h3 className="text-3xl font-display font-bold text-gray-900 mb-4 px-4">
                                {getTitle()}
                            </h3>

                            <p className="text-gray-500 leading-relaxed px-4 whitespace-pre-wrap">
                                {message}
                            </p>

                            {verificationKeyword && (
                                <div className="mt-10 px-4">
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">
                                        {t('common.typeToConfirm', `TYPE "{{keyword}}" TO CONFIRM`, { keyword: verificationKeyword })}
                                    </label>
                                    <input
                                        type="text"
                                        value={verificationInput}
                                        onChange={(e) => setVerificationInput(e.target.value)}
                                        placeholder={verificationPlaceholder || verificationKeyword}
                                        className="w-full h-14 bg-white border border-gray-200 rounded-2xl px-6 text-center text-lg font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-400/20 focus:border-primary-400 transition-all placeholder:text-gray-200 placeholder:uppercase"
                                        autoFocus
                                    />
                                </div>
                            )}
                        </div>

                        {/* Actions */}
                        <div className="p-8 pt-4 flex gap-4">
                            {cancelLabel !== 'HIDDEN' && (
                                <Button
                                    onClick={onCancel}
                                    variant="outline"
                                    className="flex-1"
                                >
                                    {cancelLabel || t('common.cancel')}
                                </Button>
                            )}
                            <Button
                                onClick={onConfirm}
                                disabled={!isVerified}
                                variant={variant === 'danger' ? 'danger' : 'primary'}
                                className="flex-1"
                            >
                                {confirmLabel || (cancelLabel === 'HIDDEN' ? t('common.ok') : t('common.confirm'))}
                            </Button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
