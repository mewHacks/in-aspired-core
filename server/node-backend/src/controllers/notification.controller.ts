// Notification controller — handles in-app notifications and push notification subscriptions
import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import * as notificationService from '../services/notification.service';
import { CONFIG } from '../config/env';
import User from '../models/User';
import { logActivity, buildMeta } from '../middleware/activityLogger';

// Fetch paginated notifications for the authenticated user
export const getNotifications = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        // Get user ID from authenticated request
        const userId = req.user?.id;

        // Check authentication
        if (!userId) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }

        // Get pagination params
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;

        // Get notifications for user
        const result = await notificationService.getNotificationsForUser(userId, page, limit);

        // Return notifications
        res.json({
            notifications: result.notifications,
            total: result.total,
            unreadCount: result.unreadCount,
            page,
            limit,
            totalPages: Math.ceil(result.total / limit)
        });
    } catch (error) { // Error handling
        console.error('Error fetching notifications:', error);
        res.status(500).json({ message: 'Failed to fetch notifications' });
    }
};

// Get the unread notification count for badge display
export const getUnreadCount = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        // Get user ID from authenticated request
        const userId = req.user?.id;

        // Check authentication
        if (!userId) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }

        // Get unread count
        const count = await notificationService.getUnreadCount(userId);

        // Return unread count
        res.json({ unreadCount: count });

    } catch (error) { // Error handling
        console.error('Error fetching unread count:', error);
        res.status(500).json({ message: 'Failed to fetch unread count' });
    }
};

// Mark a single notification as read by its ID
export const markAsRead = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        // Get user ID from authenticated request and notification ID from params
        const userId = req.user?.id;
        const notificationId = req.params.id;

        // Check authentication
        if (!userId) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }

        // Mark notification as read
        const notification = await notificationService.markAsRead(notificationId, userId);

        // Check if notification was found
        if (!notification) {
            res.status(404).json({ message: 'Notification not found' });
            return;
        }

        // Return updated notification
        res.json(notification);
    } catch (error) { // Error handling
        console.error('Error marking notification as read:', error);
        res.status(500).json({ message: 'Failed to mark notification as read' });
    }
};

// Mark all of the authenticated user's notifications as read
export const markAllAsRead = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        // Get user ID from authenticated request
        const userId = req.user?.id;

        // Check authentication
        if (!userId) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }

        // Mark all notifications as read
        const count = await notificationService.markAllAsRead(userId);

        // Log activity with WebSocket broadcast (only if user cleared notifications)
        if (count > 0 && req.user) {
            await logActivity({
                userId,
                activity: 'Cleared all notifications',
                type: 'Notification',
                ip: req.ip,
                meta: buildMeta(req.user, { clearedCount: count })
            });
        }

        // Return count of marked notifications
        res.json({ message: `Marked ${count} notifications as read`, modifiedCount: count });
    } catch (error) { // Error handling
        console.error('Error marking all notifications as read:', error);
        res.status(500).json({ message: 'Failed to mark all notifications as read' });
    }
};

// Delete a single notification by its ID
export const deleteNotification = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        // Get user ID from authenticated request and notification ID from params   
        const userId = req.user?.id;
        const notificationId = req.params.id;

        // Check authentication
        if (!userId) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }

        // Delete notification
        const deleted = await notificationService.deleteNotification(notificationId, userId);

        // Check if notification was found
        if (!deleted) {
            res.status(404).json({ message: 'Notification not found' });
            return;
        }

        // Return success message
        res.json({ message: 'Notification deleted' });
    } catch (error) { // Error handling
        console.error('Error deleting notification:', error);
        res.status(500).json({ message: 'Failed to delete notification' });
    }
};

// Return the VAPID public key so the frontend can create push subscriptions
export const getVapidKey = async (req: Request, res: Response): Promise<void> => {
    if (!CONFIG.VAPID_PUBLIC_KEY) {
        res.status(500).json({ message: 'Push notifications not configured' });
        return;
    }
    res.json({ publicKey: CONFIG.VAPID_PUBLIC_KEY });
};

// Subscribe the current user's device to web push notifications
export const subscribeToPush = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        // Get user ID from authenticated request and check authentication
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }

        // Get subscription object from request body and check
        const { subscription } = req.body;
        if (!subscription || !subscription.endpoint || !subscription.keys) {
            res.status(400).json({ message: 'Invalid subscription object' });
            return;
        }

        // Add to user's pushSubscriptions array (prevent duplicates by endpoint)
        await User.findByIdAndUpdate(userId, {
            $pull: { 'preferences.pushSubscriptions': { endpoint: subscription.endpoint } } // Remove if exists (to update)
        });

        // Add to user's pushSubscriptions array with subscription details and set pushNotifications to true
        await User.findByIdAndUpdate(userId, {
            $push: {
                'preferences.pushSubscriptions': {
                    endpoint: subscription.endpoint,
                    keys: subscription.keys,
                    userAgent: req.headers['user-agent'] || 'Unknown',
                    createdAt: new Date()
                }
            },
            $set: { 'preferences.pushNotifications': true }
        });

        // Log activity with WebSocket broadcast
        if (req.user) {
            await logActivity({
                userId,
                activity: 'Enabled push notifications',
                type: 'Notification',
                ip: req.ip,
                meta: buildMeta(req.user, { 
                    device: req.headers['user-agent'] || 'Unknown'
                })
            });
        }

        res.json({ success: true, message: 'Subscribed to push notifications' });
    } catch (error) { // Error handling
        console.error('Error subscribing to push:', error);
        res.status(500).json({ message: 'Failed to subscribe to push' });
    }
};

// Unsubscribe a device from push notifications, disabling flag if no subscriptions remain
export const unsubscribeFromPush = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        // Get user ID from authenticated request and check authentication
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }

        const { endpoint } = req.body; // Can unsubscribe a specific device

        if (endpoint) {
            // Remove specific subscription
            await User.findByIdAndUpdate(userId, {
                $pull: { 'preferences.pushSubscriptions': { endpoint } }
            });
        }

        // Find user by ID
        const user = await User.findById(userId);

        // Check if any subscriptions remain, if not, set flag to false
        if (user && (!user.preferences.pushSubscriptions || user.preferences.pushSubscriptions.length === 0)) {
            user.preferences.pushNotifications = false;
            await user.save();

            // Log activity with WebSocket broadcast (only if fully disabled)
            if (req.user) {
                await logActivity({
                    userId,
                    activity: 'Disabled push notifications',
                    type: 'Notification',
                    ip: req.ip,
                    meta: buildMeta(req.user, {})
                });
            }
        }

        res.json({ success: true, message: 'Unsubscribed from push notifications' });
    } catch (error) { // Error handling
        console.error('Error unsubscribing from push:', error);
        res.status(500).json({ message: 'Failed to unsubscribe from push' });
    }
};