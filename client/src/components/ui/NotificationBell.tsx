// Bell icon component with dropdown for notifications

import React, { useState, useRef, useEffect } from 'react';
import { Bell, CheckCheck } from 'lucide-react';
import { useNotifications } from '../../contexts/NotificationContext';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Notification } from '../../types';
import { useToast } from '../../contexts/ToastContext';
import { httpClient } from '../../services/httpClient';

// Format a timestamp into human-readable relative time (e.g., "2 mins ago", "1 hour ago")
const formatTimeAgo = (dateValue: string | Date): string => {

    // Convert dateValue to Date object
    const date = typeof dateValue === 'string' ? new Date(dateValue) : dateValue;
    const now = new Date();

    // Calculate time difference in seconds
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    // Format time to show either just now, minutes/hours ago, or date
    if (seconds < 60) {
        return 'Just now';
    } else if (seconds < 3600) {
        return `${Math.floor(seconds / 60)} min ago`;
    } else if (seconds < 86400) {
        return `${Math.floor(seconds / 3600)} hour${Math.floor(seconds / 3600) > 1 ? 's' : ''} ago`;
    } else if (seconds < 604800) {
        return `${Math.floor(seconds / 86400)} day${Math.floor(seconds / 86400) > 1 ? 's' : ''} ago`;
    } else { // Fallback for older notifications
        return date.toLocaleDateString();
    }
};

// Main notificationBell component
const NotificationBell: React.FC = () => {

    const { t } = useTranslation();

    // Get notifications from context
    const { notifications, unreadCount, loading, markAsRead, markAllAsRead } = useNotifications();

    // Used to navigate when a notification has a deep link
    const navigate = useNavigate();

    // Toast for feedback
    const toast = useToast();

    // Local dropdown state 
    const [isOpen, setIsOpen] = useState(false);

    // Ref to detect clicks outside the dropdown
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Handle user clicking on a single notification
    const handleNotificationClick = async (notification: Notification) => {

        // Navigate to link if provided
        if (notification.link) {
            // Check if it's a room link - verify room is still active
            const roomMatch = notification.link.match(/\/rooms\/([a-f0-9]+)/);
            if (roomMatch) {
                const roomId = roomMatch[1];
                try {
                    const res = await httpClient(`/api/rooms/${roomId}`);
                    if (res.ok) {
                        const room = await res.json();
                        if (room.isActive) {
                            // Room is active - show toast with Join Now button
                            toast.success(
                                <div className="flex items-center gap-3">
                                    <span>Session is live!</span>
                                    <button
                                        onClick={async () => {
                                            // Mark as read when joining
                                            if (!notification.read && notification.id) {
                                                await markAsRead(notification.id);
                                            }
                                            navigate(notification.link!);
                                        }}
                                        className="px-3 py-1 bg-white dark:bg-gray-800 text-green-600 dark:text-green-400 text-xs font-bold rounded-lg hover:bg-green-50 dark:hover:bg-gray-700 transition-colors border border-green-200 dark:border-green-800"
                                    >
                                        Join Now →
                                    </button>
                                </div>,
                                5000 // Show for 5 seconds
                            );
                            setIsOpen(false);
                        } else {
                            // Room has ended - mark as read and show info toast
                            if (!notification.read && notification.id) {
                                await markAsRead(notification.id);
                            }
                            toast.info('This session has ended');
                        }
                    } else {
                        // Room not found - mark as read
                        if (!notification.read && notification.id) {
                            await markAsRead(notification.id);
                        }
                        toast.info('This room is no longer available');
                    }
                } catch {
                    toast.error('Could not check room status');
                }
            } else {
                // Non-room links - mark as read and navigate directly
                if (!notification.read && notification.id) {
                    await markAsRead(notification.id);
                }
                navigate(notification.link);
                setIsOpen(false);
            }
        } else {
            // No link - just mark as read
            if (!notification.read && notification.id) {
                await markAsRead(notification.id);
            }
        }
    };

    // Handle mark all notifications as read
    const handleMarkAllAsRead = async () => {
        await markAllAsRead();
    };

    const getTranslatedTitle = (title: string) => {
        return t(`notifications.titles.${title}`, title);
    };

    const getTranslatedMessage = (msg: string) => {
        if (msg === 'This is a test email execution to verify your notification settings.') {
            return t('notifications.dynamic.testEmail', msg);
        }

        const approvedMatch = msg.match(/^(.*?)\s+approved your request to join\s+"(.*?)"$/);
        if (approvedMatch) {
            return t('notifications.dynamic.approved', {
                actor: approvedMatch[1],
                room: approvedMatch[2],
                defaultValue: msg
            });
        }

        const deniedMatch = msg.match(/^(.*?)\s+denied your request to join\s+"(.*?)"$/);
        if (deniedMatch) {
            return t('notifications.dynamic.denied', {
                actor: deniedMatch[1],
                room: deniedMatch[2],
                defaultValue: msg
            });
        }

        return msg;
    };

    return (
        // Render JSX
        <div className="relative" ref={dropdownRef}>
            {/* Bell Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                aria-label="Notifications"
            >
                <Bell className="w-5 h-5" />

                {/* Unread Badge */}
                {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 dark:bg-red-600 text-white text-xs font-bold rounded-full flex items-center justify-center">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown Panel */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 z-50 overflow-hidden"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                            <h3 className="font-semibold text-gray-900 dark:text-gray-100">{t('notifications.ui.title', 'Notifications')}</h3>

                            {/* Only show bulk action if there are unread items */}
                            {unreadCount > 0 && (
                                <button
                                    onClick={handleMarkAllAsRead}
                                    className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-medium flex items-center gap-1"
                                >
                                    <CheckCheck className="w-3.5 h-3.5" />
                                    {t('notifications.ui.markAllRead', 'Mark all read')}
                                </button>
                            )}
                        </div>

                        {/* Notification List */}
                        <div className="max-h-80 overflow-y-auto">
                            {loading ? ( // Loading state
                                <div className="p-6 text-center text-gray-500 dark:text-gray-400">
                                    <div className="animate-spin w-6 h-6 border-2 border-indigo-500 dark:border-indigo-400 border-t-transparent rounded-full mx-auto"></div>
                                    <p className="mt-2 text-sm">{t('common.loading', 'Loading...')}</p>
                                </div>
                            ) : notifications.length === 0 ? ( // Empty state
                                <div className="p-6 text-center text-gray-500 dark:text-gray-400">
                                    <Bell className="w-10 h-10 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                                    <p className="text-sm">{t('notifications.ui.empty', 'No notifications yet')}</p>
                                </div>
                            ) : ( // Notifications list
                                notifications.slice(0, 10).map((notification) => (
                                    <div
                                        key={notification.id}
                                        onClick={() => handleNotificationClick(notification)}
                                        className={`px-4 py-3 border-b border-gray-100 dark:border-gray-800 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                                            !notification.read ? 'bg-indigo-50/50 dark:bg-indigo-900/20' : ''
                                        }`}
                                    >
                                        <div className="flex items-start gap-3">
                                            {/* Unread indicator */}
                                            <div className="mt-1.5">
                                                {!notification.read ? (
                                                    <div className="w-2 h-2 bg-indigo-500 dark:bg-indigo-400 rounded-full"></div>
                                                ) : (
                                                    <div className="w-2 h-2 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
                                                )}
                                            </div>

                                            {/* Content */}
                                            <div className="flex-1 min-w-0">
                                                <p className={`text-sm font-medium ${
                                                    !notification.read 
                                                        ? 'text-gray-900 dark:text-gray-100' 
                                                        : 'text-gray-600 dark:text-gray-400'
                                                }`}>
                                                    {getTranslatedTitle(notification.title)}
                                                </p>
                                                <p className="text-xs text-gray-500 dark:text-gray-500 mt-0.5 line-clamp-2">
                                                    {getTranslatedMessage(notification.message)}
                                                </p>
                                                <p className="text-xs text-gray-400 dark:text-gray-600 mt-1">
                                                    {formatTimeAgo(notification.createdAt)}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Footer */}
                        {notifications.length > 10 && (
                            <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 text-center">
                                <button className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-medium">
                                    {t('notifications.ui.viewAll', 'View all notifications')}
                                </button>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

// Export component
export default NotificationBell;