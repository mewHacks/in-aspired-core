// Confirmation dialog context — provides confirm() and alert() methods globally
import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { ConfirmModal } from '@/components/ui/ConfirmModal';

interface ConfirmOptions {
    title?: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: 'danger' | 'warning' | 'info';
    verificationKeyword?: string;
    verificationPlaceholder?: string;
}

interface ConfirmContextType {
    confirm: (options: ConfirmOptions) => Promise<boolean>;
    alert: (options: Omit<ConfirmOptions, 'cancelLabel'>) => Promise<void>;
}

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

export const useConfirm = () => {
    const context = useContext(ConfirmContext);
    if (!context) {
        throw new Error('useConfirm must be used within a ConfirmProvider');
    }
    return context;
};

interface ConfirmProviderProps {
    children: ReactNode;
}

export const ConfirmProvider: React.FC<ConfirmProviderProps> = ({ children }) => {
    const [modalState, setModalState] = useState<{
        isOpen: boolean;
        options: ConfirmOptions;
        resolve: (value: boolean) => void;
        isAlert?: boolean;
    } | null>(null);

    const confirm = useCallback((options: ConfirmOptions) => {
        return new Promise<boolean>((resolve) => {
            setModalState({
                isOpen: true,
                options,
                resolve
            });
        });
    }, []);

    const alert = useCallback((options: Omit<ConfirmOptions, 'cancelLabel'>) => {
        return new Promise<void>((resolve) => {
            setModalState({
                isOpen: true,
                options: { ...options, cancelLabel: 'HIDDEN' }, // Marker to hide cancel
                resolve: () => resolve(),
                isAlert: true
            });
        });
    }, []);

    const handleConfirm = () => {
        if (modalState) {
            modalState.resolve(true);
            setModalState(null);
        }
    };

    const handleCancel = () => {
        if (modalState) {
            modalState.resolve(false);
            setModalState(null);
        }
    };

    return (
        <ConfirmContext.Provider value={{ confirm, alert }}>
            {children}
            {modalState && (
                <ConfirmModal
                    isOpen={modalState.isOpen}
                    options={modalState.options}
                    onConfirm={handleConfirm}
                    onCancel={handleCancel}
                />
            )}
        </ConfirmContext.Provider>
    );
};
