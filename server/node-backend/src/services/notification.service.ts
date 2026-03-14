// notification.service.ts
// Handles creating, reading, and managing notifications for users

import Notification, { INotification } from '../models/Notification';
import { NotificationType } from '@in-aspired/shared';
import { emitToUser } from '../socket/socketEmitter';
import mongoose from 'mongoose';
import webpush from 'web-push';
import { CONFIG } from '../config/env';
import User from '../models/User';
import { sendEmail } from './email.service';
import { getNotificationEmailTemplate } from '../utils/emailTemplates';

// Initialize Web Push with VAPID keys if available
if (CONFIG.VAPID_PUBLIC_KEY && CONFIG.VAPID_PRIVATE_KEY) {
    try {
        // Set VAPID details for web push notifications
        // VAPID (Voluntary Application Server Identification) is a security feature that helps identify the server sending the push notification
        webpush.setVapidDetails(
            CONFIG.VAPID_SUBJECT, // 
            CONFIG.VAPID_PUBLIC_KEY, // Server "signs" the packet with this key
            CONFIG.VAPID_PRIVATE_KEY // Browser uses it to create a unique "endpoint" that only your server can send to
        );
        console.log('[PUSH] Web Push initialized successfully');
    } catch (error) { // Error handling for VAPID initialization
        console.error('[PUSH] Failed to initialize Web Push:', error);
    }
} else { // If VAPID keys are missing, push notifications will be disabled
    console.warn('[PUSH] VAPID keys missing. Push notifications disabled.');
}

// Notification parameters interface
interface CreateNotificationParams {
    userId: string | mongoose.Types.ObjectId;
    type: NotificationType;
    title: string;
    message: string;
    link?: string;
    data?: Record<string, any>;
}

// Helper to send push notifications to all user devices, called after notification is created in db
// Handles subscription expiration cleanup (410/404)
async function sendPushNotifications(userId: string, notification: INotification) {

    // Check if push is enabled
    if (!CONFIG.VAPID_PUBLIC_KEY || !CONFIG.VAPID_PRIVATE_KEY) return;

    try {
        // Fetch the user ID from the database
        const user = await User.findById(userId);

        // If user not found or push notifications are disabled or no subscriptions, return
        if (!user || !user.preferences.pushNotifications || !user.preferences.pushSubscriptions || user.preferences.pushSubscriptions.length === 0) {
            return;
        }

        // Prepare payload (keep it small, <4KB) for the push notification
        const payload = JSON.stringify({
            title: notification.title,
            body: notification.message,
            icon: '/assets/icons/logo_192.png', // Add branding
            badge: '/assets/icons/badge_72.png',  // Add branding (monochrome)
            data: { // Custom data accessible in service worker
                url: notification.link || '/',
                id: notification._id
            }
        });

        // All device subscriptions for this user
        const subscriptions = user.preferences.pushSubscriptions;

        // List of invalid subscriptions to remove later
        const invalidEndpoints: string[] = [];

        console.log(`[PUSH] Sending to ${subscriptions.length} devices for user ${userId}`);

        // Send to all subscriptions in parallel (every subscription is an endpoint, is a device)
        const sendPromises = subscriptions.map(async (sub) => {

            // Subscription object in the format expected by webpush library
            const pushSubscription = {
                endpoint: sub.endpoint, // url
                keys: sub.keys // keys
            };

            try {
                // Send encrypted push message
                await webpush.sendNotification(pushSubscription, payload);
                console.log(`[PUSH] Sent successfully to device: ${sub.userAgent}`);
            } catch (err: any) {
                // Handle invalid subscriptions
                if (err.statusCode === 410 || err.statusCode === 404) { // User cleared site data, uninstalled app or subscription expired
                    console.log(`[PUSH] Subscription expired/invalid: ${sub.endpoint.slice(0, 20)}...`);
                    invalidEndpoints.push(sub.endpoint);
                } else { // Other errors (e.g., network errors, invalid keys)
                    console.error('[PUSH] Failed to send to device:', err.statusCode, err.message);
                }
            }
        });

        // Wait for all devices to complete sending
        await Promise.all(sendPromises);

        // Cleanup invalid subscriptions in database
        if (invalidEndpoints.length > 0) {
            await User.updateOne(
                { _id: userId },
                { $pull: { 'preferences.pushSubscriptions': { endpoint: { $in: invalidEndpoints } } } }
            );
            console.log(`[PUSH] Removed ${invalidEndpoints.length} invalid subscriptions for user ${userId}`);
        }

    } catch (error) { // Final error handling so push failures does not crash app
        console.error('[PUSH] Error in sendPushNotifications:', error);
    }
}

// Helper to send email notifications
async function sendNotificationEmail(userId: string, notification: INotification) {
    try {
        // Find user by ID
        const user = await User.findById(userId);

        // Check if email notifications are enabled and user has email
        if (!user || !user.email || user.preferences?.emailNotifications === false) {
            return;
        }

        // Get HTML template for email
        // Only send emails for high-priority or relevant interactions to prevent spam
        const EMAIL_TRIGGER_TYPES: string[] = ['ROOM_INVITE', 'SYSTEM', 'WEEKLY_DIGEST', 'TEST_REMINDER'];

        if (!EMAIL_TRIGGER_TYPES.includes(notification.type)) {
            // Skip email for low-priority types (e.g., SAVED_UPDATE, MARKETING) for now unless we add specific settings later
            return;
        }

        const html = getNotificationEmailTemplate(notification.title, notification.message, notification.link);

        // Send email
        await sendEmail(user.email, notification.title, notification.message, html);
        console.log(`[EMAIL] Sent to ${user.email} for notification: ${notification.title}`);

    } catch (error) { // Error handling
        console.error('[EMAIL] Failed to send email:', error);
    }
}

// Create a new notification for a user
export async function createNotification(params: CreateNotificationParams): Promise<INotification> {
    const { userId, type, title, message, link, data } = params;

    const notification = await Notification.create({
        userId,
        type,
        title,
        message,
        link,
        data,
        read: false
    });

    const userIdStr = typeof userId === 'string' ? userId : userId.toString();

    // Emit via Socket.io for real-time delivery (In-App)
    emitToUser(userIdStr, 'notification:new', notification.toJSON());

    // Send Push Notification (Background)
    // Run asynchronously, don't block response
    sendPushNotifications(userIdStr, notification).catch(err =>
        console.error('[PUSH] Async send failed:', err)
    );

    // Send Email Notification (Background)
    sendNotificationEmail(userIdStr, notification).catch(err =>
        console.error('[EMAIL] Async send failed:', err)
    );

    return notification;
}

// Get notifications for a user (paginated, newest first)
export async function getNotificationsForUser(
    userId: string,
    page: number = 1,
    limit: number = 20
): Promise<{ notifications: INotification[]; total: number; unreadCount: number }> {
    const skip = (page - 1) * limit;

    const [notifications, total, unreadCount] = await Promise.all([
        Notification.find({ userId })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
        Notification.countDocuments({ userId }),
        Notification.countDocuments({ userId, read: false })
    ]);

    return {
        notifications: notifications as INotification[],
        total,
        unreadCount
    };
}

// Get unread notification count for a user (for badge display)
export async function getUnreadCount(userId: string): Promise<number> {
    return Notification.countDocuments({ userId, read: false });
}

// Mark a single notification as read
export async function markAsRead(notificationId: string, userId: string): Promise<INotification | null> {
    const notification = await Notification.findOneAndUpdate(
        { _id: notificationId, userId },
        { read: true, readAt: new Date() },
        { new: true }
    );
    return notification;
}

// Mark all notifications as read for a user
export async function markAllAsRead(userId: string): Promise<number> {
    const result = await Notification.updateMany(
        { userId, read: false },
        { read: true, readAt: new Date() }
    );
    return result.modifiedCount;
}

// Delete a notification
export async function deleteNotification(notificationId: string, userId: string): Promise<boolean> {
    const result = await Notification.deleteOne({ _id: notificationId, userId });
    return result.deletedCount > 0;
}

// Delete all notifications for a user (for cleanup/testing)
export async function deleteAllNotifications(userId: string): Promise<number> {
    const result = await Notification.deleteMany({ userId });
    return result.deletedCount;
}

// ============================================
// HELPER FUNCTIONS FOR SPECIFIC NOTIFICATION TYPES
// ============================================

// Create a room invite notification
export async function notifyRoomInvite(
    userId: string,
    roomId: string,
    roomName: string,
    inviterName: string
): Promise<INotification> {
    return createNotification({
        userId,
        type: 'ROOM_INVITE',
        title: 'Room Invitation',
        message: `${inviterName} invited you to join "${roomName}"`,
        link: `/rooms/${roomId}`,
        data: { roomId, inviterName }
    });
}

// Create a test reminder notification
export async function notifyTestReminder(userId: string): Promise<INotification> {
    return createNotification({
        userId,
        type: 'TEST_REMINDER',
        title: 'Complete Your Personality Test',
        message: 'You have an incomplete personality test. Complete it to get personalized recommendations!',
        link: '/personality-test',
        data: {}
    });
}

// Create a weekly digest notification
export async function notifyWeeklyDigest(
    userId: string,
    savedCareersCount: number,
    savedCoursesCount: number
): Promise<INotification> {
    const message = savedCareersCount > 0 || savedCoursesCount > 0
        ? `You have ${savedCoursesCount} saved courses and ${savedCareersCount} saved careers. Check out updates!`
        : 'Explore new courses and careers this week!';

    return createNotification({
        userId,
        type: 'WEEKLY_DIGEST',
        title: 'Your Weekly Digest',
        message,
        link: '/saved',
        data: { savedCareersCount, savedCoursesCount }
    });
}
