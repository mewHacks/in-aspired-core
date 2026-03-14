// Reusable input component with label, error display, and password toggle
import React, { useState, forwardRef } from 'react';
import { LucideIcon, Eye, EyeOff, CheckCircle, XCircle } from 'lucide-react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: LucideIcon;
  label?: string;
  error?: string;
  success?: boolean;
  showPasswordToggle?: boolean;
  onPasswordToggle?: () => void;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({
  icon: Icon,
  label,
  error,
  success = false,
  showPasswordToggle = false,
  onPasswordToggle,
  className = '',
  type,
  ...props
}, ref) => {
  // Local state for password visibility
  const [showPassword, setShowPassword] = useState(false);

  // Handle password toggle
  const handlePasswordToggle = () => {
    const newShowPassword = !showPassword;
    setShowPassword(newShowPassword);
    onPasswordToggle?.(); // Call parent callback if provided
  };

  // Determine input type based on password visibility
  const inputType = type === 'password' && showPassword ? 'text' : type;

  const hasPasswordToggle = showPasswordToggle && type === 'password';
  const hasValidationIcon = error || success;
  const needsExtraPadding = hasPasswordToggle || hasValidationIcon;

  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
          {props.required && <span className="text-red-500 dark:text-red-400 ml-1">*</span>}
        </label>
      )}
      <div className="relative group">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Icon className={`h-5 w-5 ${error ? 'text-red-400' :
                success ? 'text-green-500 dark:text-green-400' :
                  'text-gray-400 dark:text-gray-500'
              } group-focus-within:text-primary-500 dark:group-focus-within:text-primary-400 transition-colors`} />
          </div>
        )}
        <input
          ref={ref}
          className={`w-full ${Icon ? 'pl-10' : 'pl-3'} ${needsExtraPadding ? 'pr-24' : 'pr-3'
            } py-3 border ${error ? 'border-red-300 dark:border-red-700 focus:ring-red-500 dark:focus:ring-red-500 focus:border-red-500 dark:focus:border-red-500' :
              success ? 'border-green-300 dark:border-green-700 focus:ring-green-500 dark:focus:ring-green-500 focus:border-green-500 dark:focus:border-green-500' :
                'border-gray-300 dark:border-gray-700 focus:ring-primary-500 dark:focus:ring-primary-500 focus:border-primary-500 dark:focus:border-primary-500'
            } rounded-xl focus:ring-2 focus:border-transparent transition-all duration-200 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 ${className}`}
          type={inputType}
          {...props}
        />

        {/* Password Toggle */}
        {showPasswordToggle && type === 'password' && (
          <button
            type="button"
            className="absolute inset-y-0 right-0 pr-3 flex items-center hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            onClick={handlePasswordToggle}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? (
              <EyeOff className="h-5 w-5 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300" />
            ) : (
              <Eye className="h-5 w-5 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300" />
            )}
          </button>
        )}

        {/* Validation Icons */}
        {error && (
          <div className={`absolute inset-y-0 ${showPasswordToggle && type === 'password' ? 'right-8' : 'right-0'
            } pr-3 flex items-center`}>
            <XCircle className="h-5 w-5 text-red-500 dark:text-red-400" />
          </div>
        )}

        {success && !error && (
          <div className={`absolute inset-y-0 ${showPasswordToggle && type === 'password' ? 'right-8' : 'right-0'
            } pr-3 flex items-center`}>
            <CheckCircle className="h-5 w-5 text-green-500 dark:text-green-400" />
          </div>
        )}
      </div>
      {error && (
        <p className="text-red-500 dark:text-red-400 text-sm mt-1 flex items-center gap-1">
          <XCircle className="h-4 w-4" /> {error}
        </p>
      )}
      {success && !error && (
        <p className="text-green-600 dark:text-green-400 text-sm mt-1 flex items-center gap-1">
          <CheckCircle className="h-4 w-4" /> Looks good!
        </p>
      )}
    </div>
  );
});

Input.displayName = 'Input';