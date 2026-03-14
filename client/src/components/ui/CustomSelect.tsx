import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Custom dropdown select component

// Option interface with label, internal value and optional icon
export interface Option {
    label: string;
    value: string;
    icon?: React.ReactNode;
}

// Props for CustomSelect
interface CustomSelectProps {
    label?: string; // Optional label 
    options: Option[]; // Array of options
    value: string; // Currently selected value
    onChange: (value: string) => void; // Callback when selection changes
    placeholder?: string; // Placeholder text
    className?: string; // Custom styling hook
    disabled?: boolean; // Disable interaction
    variant?: 'standard' | 'ghost'; // Style mode
}

// CustomSelect component
export const CustomSelect: React.FC<CustomSelectProps> = ({ label, options, value, onChange, placeholder = "Select an option", className, disabled, variant = 'standard' }) => {
    const [isOpen, setIsOpen] = useState(false); // Tracks whether dropdown is open
    const selectRef = useRef<HTMLDivElement>(null); // Ref for detecting outside clicks

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        // Cleanup prevents memory leaks
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Find selected option details to display selected icon and label
    const selectedOption = options.find(opt => opt.value === value);

    // Toggle dropdown open state
    const toggleOpen = () => {
        // Prevent interaction if disabled
        if (!disabled) {
            setIsOpen(!isOpen);
        }
    };

    // Styles based on variant
    const baseButtonStyles = "w-full px-4 py-3 rounded-xl flex items-center justify-between transition-all duration-200 outline-none text-left disabled:cursor-not-allowed";

    // Standard: borders, shadows, background
    const standardStyles = `
        border 
        ${isOpen 
            ? 'border-indigo-500 dark:border-indigo-400 ring-2 ring-indigo-200 dark:ring-indigo-900/30' 
            : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'}
        bg-white dark:bg-gray-800 disabled:bg-gray-50 dark:disabled:bg-gray-800 disabled:text-gray-500 dark:disabled:text-gray-500 disabled:border-gray-300 dark:disabled:border-gray-700
    `;

    // Ghost: transparent, no borders, designed to blend into parent layouts
    const ghostStyles = `
        bg-transparent hover:bg-gray-50/50 dark:hover:bg-gray-800/50 
        ${isOpen ? 'bg-gray-50/80 dark:bg-gray-800/80' : ''}
        disabled:text-gray-500 dark:disabled:text-gray-500
        text-gray-900 dark:text-gray-100
    `;

    // Combine base styles with variant-specific styles
    const buttonClasses = `${baseButtonStyles} ${variant === 'ghost' ? ghostStyles : standardStyles}`;

    // Render component
    return (
        // Root wrapper, referenced for outside click detection
        <div className={`space-y-2 ${className}`} ref={selectRef}>
            
            {/* Optional label */}
            {label && <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>}

            {/* Select button */}
            <div className="relative">
                <button
                    type="button"
                    onClick={toggleOpen}
                    disabled={disabled} 
                    className={buttonClasses}
                >
                    {/* Displayed value */}
                    <span className={`block truncate flex items-center gap-2 ${!selectedOption ? 'text-gray-400 dark:text-gray-500' : 'text-gray-900 dark:text-white'}`}>
                        {selectedOption?.icon && <span className="text-gray-600 dark:text-gray-400">{selectedOption.icon}</span>}
                        {selectedOption?.label || placeholder}
                    </span>
                    <ChevronDown className={`w-5 h-5 text-gray-400 dark:text-gray-500 transition-transform duration-200 ${isOpen ? 'transform rotate-180' : ''}`} />
                </button>

                {/* Animated dropdown menu */}
                <AnimatePresence>
                    {isOpen && (

                        // Animation (fade, slide and scale)
                        <motion.div
                            initial={{ opacity: 0, y: -10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -10, scale: 0.95 }}
                            transition={{ duration: 0.1, ease: "easeOut" }}
                            className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl shadow-xl dark:shadow-gray-900/50 max-h-60 overflow-auto py-1 focus:outline-none"
                        >
                            {/* Rendering options, each option is clickable and highlighted on hover */}
                            {options.map((option) => (
                                <div
                                    key={option.value}
                                    onClick={() => {
                                        onChange(option.value); // Updates parent state
                                        setIsOpen(false); // Close dropdown
                                    }}
                                    className={`
                                        cursor-pointer select-none relative py-3 pl-4 pr-9 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors flex items-center gap-2
                                        ${value === option.value 
                                            ? 'text-indigo-600 dark:text-indigo-400 font-medium bg-indigo-50/50 dark:bg-indigo-900/20' 
                                            : 'text-gray-900 dark:text-gray-300'
                                        }
                                    `}
                                >
                                    {option.icon && <span className="text-gray-600 dark:text-gray-400">{option.icon}</span>}
                                    <span className="block truncate">{option.label}</span>
                                    {value === option.value && ( // Shows checkmark and changes color
                                        <span className="absolute inset-y-0 right-0 flex items-center pr-4 text-indigo-600 dark:text-indigo-400">
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