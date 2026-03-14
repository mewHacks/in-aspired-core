import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

// Customize different toast message appearance

// Define different toast types
export type ToastType = 'success' | 'error' | 'info' | 'warning';

// Define toast interface
interface Toast {
    id: string;
    message: ReactNode;
    type: ToastType;
}

// Defines what toast context exposes
interface ToastContextType {
    showToast: (message: ReactNode, type?: ToastType, duration?: number) => void;
}

// Create toast context
const ToastContext = createContext<ToastContextType | undefined>(undefined); // undefined is default value to throw an error if someone tries to use the context without a provider

// Main toast component that renders one toast
const ToastItem: React.FC<{ toast: Toast; onClose: () => void }> = ({ toast, onClose }) => {

    // Runs when the toast is mounted
    useEffect(() => {
        // Animate in
    }, []);

    // Map icons for each toast type
    const icons = {
        success: <CheckCircle className="w-5 h-5 text-green-500" />,
        error: <AlertCircle className="w-5 h-5 text-red-500" />,
        info: <Info className="w-5 h-5 text-blue-500" />,
        warning: <AlertTriangle className="w-5 h-5 text-yellow-500" />
    };

    // Map border colors for each toast type
    const borderColors = {
        success: 'border-green-100',
        error: 'border-red-100',
        info: 'border-blue-100',
        warning: 'border-yellow-100'
    };

    // Map background colors for each toast type
    const bgColors = {
        success: 'bg-green-50',
        error: 'bg-red-50',
        info: 'bg-blue-50',
        warning: 'bg-yellow-50'
    };

    return (
        // Render JSX
        <div className={`flex items-center w-full max-w-sm p-4 mb-4 rounded-xl shadow-lg border bg-white ${borderColors[toast.type]} animate-in slide-in-from-right fade-in duration-300`}>

            {/* Icon container with colored bg */}
            <div className={`p-2 rounded-lg mr-3 ${bgColors[toast.type]}`}>
                {icons[toast.type]}
            </div>

            {/* Toast message */}
            <div className="text-sm font-medium text-gray-800">{toast.message}</div>

            {/* Close button */}
            <button
                onClick={onClose}
                className="ml-auto bg-transparent text-gray-400 hover:text-gray-900 rounded-lg p-1.5 hover:bg-gray-100 inline-flex items-center justify-center h-8 w-8"
            >
                <X className="w-4 h-4" />
            </button>
        </div>
    );
};

// Toast provider component to wrap app, hold all toast state and provide showToast function
export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {

    // Toast state to store active toasts
    const [toasts, setToasts] = useState<Toast[]>([]);

    // showToast function to trigger a toast
    const showToast = useCallback((message: ReactNode, type: ToastType = 'info', duration = 3000) => {
        const id = Math.random().toString(36).substring(2, 9); // Generates unique ID
        const newToast: Toast = { id, message, type }; // Creates new toast object

        // Add new toast to state, new toasts appear below older ones
        setToasts(prev => [...prev, newToast]);

        // Auto remove toast after duration
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, duration);
    }, []);

    // Manual remove toast by clicking close button
    const removeToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    return (
        // Toast provider component that only expose showToast function to children, not toasts or setToasts
        <ToastContext.Provider value={{ showToast }}>
            {children}

            {/* Toast container at bottom right corner */}
            <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2">
                {toasts.map(toast => (
                    <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
                ))}
            </div>
        </ToastContext.Provider>
    );
};

// Custom hook to use toast context
export const useToast = () => {

    // Reads from context
    const context = useContext(ToastContext);

    // Error handling to prevent silent crashes
    if (!context) throw new Error('useToast must be used within a ToastProvider');

    // Returns showToast function
    const { showToast } = context;

  // Provide helper methods like toast.success, toast.error
  return {
    show: showToast,
    success: (msg: ReactNode, duration?: number) => showToast(msg, 'success', duration),
    error: (msg: ReactNode, duration?: number) => showToast(msg, 'error', duration),
    info: (msg: ReactNode, duration?: number) => showToast(msg, 'info', duration),
    warning: (msg: ReactNode, duration?: number) => showToast(msg, 'warning', duration),
  };
};
