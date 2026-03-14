// NotificationContext.tsx
// Global state management for notifications (bell icon, unread count, etc.)

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import { useSocket } from './SocketContext';
import { fetchNotifications, markNotificationAsRead, markAllNotificationsAsRead } from '../services/api';
import { Notification } from '../types';

// Context value interface
interface NotificationContextType {
    notifications: Notification[];
    unreadCount: number; // Derived from notifications[]
    loading: boolean;
    fetchAll: () => Promise<void>;
    markAsRead: (id: string) => Promise<void>;
    markAllAsRead: () => Promise<void>;
    addNotification: (notification: Notification) => void; // For real-time socket events
}

// Create context
const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// Main NotificationProvider component
export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {

    // Get auth, toast, and socket contexts
    const { user } = useAuth();
    const toast = useToast();
    const { socket, connected } = useSocket();

    // State - only notifications[], unreadCount is derived
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(false);

    // Derive unread count from notifications (single source of truth)
    const unreadCount = useMemo(
        () => notifications.filter(n => !n.read).length,
        [notifications]
    );

    // Fetch all notifications
    const fetchAll = useCallback(async () => {
        if (!user) return;

        setLoading(true);
        try {
            const response = await fetchNotifications(1, 50); // Fetch first 50
            setNotifications(response.notifications);
        } catch (error) {
            console.error('Failed to fetch notifications:', error);
            // Silent fail for initial load - don't bother user
        } finally {
            setLoading(false);
        }
    }, [user]);

    // Mark single notification as read
    const markAsRead = useCallback(async (id: string) => {
        try {
            await markNotificationAsRead(id);

            // Update local state
            setNotifications(prev =>
                prev.map(n => n.id === id ? { ...n, read: true, readAt: new Date().toISOString() } : n)
            );
        } catch (error) {
            console.error('Failed to mark notification as read:', error);
            toast.error('Failed to update notification');
        }
    }, [toast]);

    // Mark all notifications as read
    const markAllAsRead = useCallback(async () => {
        try {
            await markAllNotificationsAsRead();

            // Update local state
            setNotifications(prev =>
                prev.map(n => ({ ...n, read: true, readAt: new Date().toISOString() }))
            );
        } catch (error) { // Error handling
            console.error('Failed to mark all notifications as read:', error);
            toast.error('Failed to mark all as read');
        }
    }, [toast]);

    // Add notification (for real-time socket events)
    const addNotification = useCallback((notification: Notification) => {
        setNotifications(prev => [notification, ...prev]);
    }, []);

    // Fetch notifications when user logs in
    useEffect(() => {
        if (user) {
            fetchAll();
        } else {
            // Clear notifications on logout
            setNotifications([]);
        }
    }, [user, fetchAll]);

    // Socket: Authenticate user and listen for new notifications
    useEffect(() => {
        // Check if socket is connected and user is logged in
        if (!socket || !connected || !user) return;

        // Get user ID (handle both id and _id formats)
        const userId = (user as any).id || (user as any)._id;
        if (!userId) return;

        // Join personal notification room
        socket.emit('authenticate-user', userId);
        console.log('[NotificationContext] Sent authenticate-user for:', userId);

        // Listen for new notifications
        const handleNewNotification = (notification: Notification) => {
            console.log('[NotificationContext] Received notification:', notification);
            addNotification(notification);

            // Optional: Show toast for new notification
            toast.info(notification.title);
        };

        socket.on('notification:new', handleNewNotification);

        // Cleanup listener on unmount
        return () => {
            socket.off('notification:new', handleNewNotification);
        };
    }, [socket, connected, user, addNotification, toast]);

    return (
        <NotificationContext.Provider value={{
            notifications,
            unreadCount,
            loading,
            fetchAll,
            markAsRead,
            markAllAsRead,
            addNotification
        }}>
            {children}
        </NotificationContext.Provider>
    );
};

// Custom hook for easy access
export const useNotifications = () => {

    // Get context
    const context = useContext(NotificationContext);

    // Check if context is used within a provider
    if (!context) {
        throw new Error('useNotifications must be used within a NotificationProvider');
    }
    return context;
};
