// Reusable button component with variant, size, and loading state support
import React, { forwardRef } from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
    size?: 'sm' | 'md' | 'lg';
    isLoading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({
    className = '',
    variant = 'primary',
    size = 'md',
    isLoading = false,
    children,
    ...props
}, ref) => {
    const baseStyles = 'relative inline-flex items-center justify-center font-bold overflow-hidden transition-all duration-200 focus:outline-none disabled:opacity-50 disabled:pointer-events-none rounded-xl active:scale-[0.97] select-none';

    const variants = {
        primary: 'bg-primary-600 text-white shadow-md shadow-primary-500/20 hover:bg-primary-700 active:bg-primary-800 active:shadow-inner text-shadow-sm',
        secondary: 'bg-secondary-500 text-white shadow-md shadow-secondary-500/20 hover:bg-secondary-600 active:bg-secondary-700 active:shadow-inner',
        outline: 'bg-transparent border-2 border-primary-600 text-primary-600 hover:bg-primary-50 active:bg-primary-100',
        ghost: 'text-gray-600 hover:bg-gray-100 active:bg-gray-200 hover:text-primary-600',
        danger: 'bg-red-500 text-white shadow-md shadow-red-500/20 hover:bg-red-600 active:bg-red-700 active:shadow-inner',
    };

    const sizes = {
        sm: 'h-9 px-4 text-sm',
        md: 'h-11 px-6 text-base',
        lg: 'h-14 px-8 text-lg',
    };

    return (
        <button
            ref={ref}
            className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
            disabled={isLoading || props.disabled}
            {...props}
        >
            {isLoading ? (
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
            ) : null}
            {children}
        </button>
    );
});

Button.displayName = 'Button';
