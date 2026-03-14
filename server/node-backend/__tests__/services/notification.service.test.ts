// notification.service.test.ts
// ============================================================================
// Test suite for notification.service.ts
// ============================================================================
// This file tests the notification service which handles:
// - Creating notifications in the database
// - Retrieving paginated notifications for a user
// - Managing read/unread state
// - Deleting notifications (single and bulk)
// - Helper functions for specific notification types (room invites, test reminders, weekly digest)
// - Real-time delivery via Socket.IO
// - Push notification subscription management
//
// Key testing patterns:
// - Mocking Notification model for database operations
// - Mocking socketEmitter for real-time events
// - Mocking web-push for push notification subscriptions
// - Mocking config/env to avoid module load errors
// - Using mongoose.Types.ObjectId for realistic ID handling
// ============================================================================

/// <reference types="jest" />
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import mongoose from 'mongoose';

// ============================================================================
// MOCK CONFIGURATION
// ============================================================================
// Mock config/env FIRST so any transitive import that touches CONFIG gets the mock.
// Must include SMTP properties because email.service.ts reads CONFIG.SMTP at module scope.
// We provide empty VAPID keys so web-push initialization is skipped (push notifications disabled in tests).
jest.mock('../../src/config/env', () => ({
    CONFIG: {
        VAPID_PUBLIC_KEY: '',
        VAPID_PRIVATE_KEY: '',
        VAPID_SUBJECT: 'mailto:test@test.com',
        SMTP: {
            SERVICE: '',
            HOST: 'localhost',
            PORT: 587,
            USER: 'test',
            PASS: 'test',
            FROM: 'test@test.com'
        }
    }
}));

// ============================================================================
// EXTERNAL DEPENDENCY MOCKS
// ============================================================================
// Mock all external dependencies before importing the service under test.
// This ensures the service loads with our mocks instead of real implementations.
jest.mock('../../src/models/Notification');        // Database model for notifications
jest.mock('../../src/models/User');                 // User model (for lookups)
jest.mock('../../src/socket/socketEmitter');       // Socket.IO real-time events

// Mock email.service - we don't test email delivery in these tests
// Use factory pattern to avoid Jest 30 strict typing issues
jest.mock('../../src/services/email.service', () => {
    const fn = jest.fn();
    (fn as any).mockResolvedValue(undefined);
    return { sendEmail: fn };
});

// Mock email templates - returns placeholder HTML
jest.mock('../../src/utils/emailTemplates', () => ({
    getNotificationEmailTemplate: jest.fn().mockReturnValue('<html>test</html>' as any)
}));

// Mock web-push - we don't test actual push notification delivery
jest.mock('web-push');

// ============================================================================
// IMPORTS
// ============================================================================
import {
    createNotification,
    getNotificationsForUser,
    getUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllNotifications,
    notifyRoomInvite,
    notifyTestReminder,
    notifyWeeklyDigest
} from '../../src/services/notification.service';
import Notification from '../../src/models/Notification';
import { emitToUser } from '../../src/socket/socketEmitter';

// ============================================================================
// TEST SUITE
// ============================================================================
describe('Notification Service', () => {

    // Clear mocks before each test to ensure clean state
    beforeEach(() => {
        jest.clearAllMocks();
    });

    // ========================================================================
    // createNotification - Core notification creation
    // ========================================================================
    // Tests the primary function for creating notifications in the database.
    // Notifications are created with a default read: false status.
    // After creation, a Socket.IO event is emitted to notify the user in real-time.
    // ========================================================================
    describe('createNotification', () => {

        // Test: Basic notification creation - verifies the notification is saved to DB
        // with correct fields and returned to caller
        it('should create notification in database', async () => {
            const mockNotification = {
                _id: new mongoose.Types.ObjectId(),
                userId: 'user1',
                type: 'SYSTEM',
                title: 'Test',
                message: 'Hello',
                read: false,
                toJSON: jest.fn().mockReturnValue({ title: 'Test' } as any)
            };
            (Notification.create as any).mockResolvedValue(mockNotification);

            const result = await createNotification({
                userId: 'user1',
                type: 'SYSTEM' as any,
                title: 'Test',
                message: 'Hello'
            });

            expect(Notification.create).toHaveBeenCalledWith(expect.objectContaining({
                userId: 'user1',
                type: 'SYSTEM',
                title: 'Test',
                message: 'Hello',
                read: false  // Default: notifications start as unread
            }));
            expect(result).toBe(mockNotification);
        });

        // Test: Real-time notification - verifies Socket.IO event is emitted after creation
        // The event 'notification:new' is sent to the user with notification data
        it('should emit socket event to user after creation', async () => {
            const mockNotification = {
                _id: new mongoose.Types.ObjectId(),
                userId: 'user1',
                toJSON: jest.fn().mockReturnValue({ title: 'Test' } as any)
            };
            (Notification.create as any).mockResolvedValue(mockNotification);

            await createNotification({
                userId: 'user1',
                type: 'SYSTEM' as any,
                title: 'Test',
                message: 'Hello'
            });

            expect(emitToUser).toHaveBeenCalledWith('user1', 'notification:new', { title: 'Test' });
        });

        // Test: ObjectId handling - verifies userId can be either string or ObjectId
        // The socket event must use string representation of the user ID
        it('should handle ObjectId userId and convert to string for socket', async () => {
            const objectId = new mongoose.Types.ObjectId();
            const mockNotification = {
                _id: new mongoose.Types.ObjectId(),
                toJSON: jest.fn().mockReturnValue({} as any)
            };
            (Notification.create as any).mockResolvedValue(mockNotification);

            await createNotification({
                userId: objectId,
                type: 'SYSTEM' as any,
                title: 'Test',
                message: 'Hello'
            });

            expect(emitToUser).toHaveBeenCalledWith(objectId.toString(), 'notification:new', expect.anything());
        });
    });

    // ========================================================================
    // getNotificationsForUser - Paginated notification retrieval
    // ========================================================================
    // Tests retrieval of notifications with pagination support.
    // Returns notifications sorted by creation date (newest first),
    // along with total count and unread count for UI display.
    // ========================================================================
    describe('getNotificationsForUser', () => {

        // Test: Paginated retrieval - verifies correct pagination parameters
        // and that total/unread counts are returned alongside notifications
        it('should return paginated notifications with total and unread count', async () => {
            const mockNotifications = [{ title: 'N1' }, { title: 'N2' }];

            // Chain: find -> sort -> skip -> limit -> lean
            // This mimics the Mongoose query chain used in the service
            const leanMock = (jest.fn() as any).mockResolvedValue(mockNotifications);
            const limitMock = (jest.fn() as any).mockReturnValue({ lean: leanMock });
            const skipMock = (jest.fn() as any).mockReturnValue({ limit: limitMock });
            const sortMock = (jest.fn() as any).mockReturnValue({ skip: skipMock });
            (Notification.find as any).mockReturnValue({ sort: sortMock });

            // countDocuments is called twice: once for total, once for unread
            (Notification.countDocuments as any)
                .mockResolvedValueOnce(10) // total
                .mockResolvedValueOnce(3); // unreadCount

            const result = await getNotificationsForUser('user1', 1, 20);

            expect(result).toEqual({
                notifications: mockNotifications,
                total: 10,
                unreadCount: 3
            });
        });

        // Test: Default pagination - verifies sensible defaults when not specified
        // Page 1 with 20 items per page is the standard
        it('should default to page 1 and limit 20', async () => {
            const leanMock = (jest.fn() as any).mockResolvedValue([]);
            const limitMock = (jest.fn() as any).mockReturnValue({ lean: leanMock });
            const skipMock = (jest.fn() as any).mockReturnValue({ limit: limitMock });
            const sortMock = (jest.fn() as any).mockReturnValue({ skip: skipMock });
            (Notification.find as any).mockReturnValue({ sort: sortMock });
            (Notification.countDocuments as any).mockResolvedValue(0);

            await getNotificationsForUser('user1');

            expect(skipMock).toHaveBeenCalledWith(0); // (1-1) * 20 = 0
            expect(limitMock).toHaveBeenCalledWith(20);
        });
    });

    // ========================================================================
    // getUnreadCount - Quick unread notification count
    // ========================================================================
    // A simple utility to get the count of unread notifications for badge display.
    // ========================================================================
    describe('getUnreadCount', () => {

        // Test: Unread count retrieval - verifies correct query filter
        // Only counts notifications where read: false
        it('should return count of unread notifications', async () => {
            (Notification.countDocuments as any).mockResolvedValue(5);

            const count = await getUnreadCount('user1');

            expect(Notification.countDocuments).toHaveBeenCalledWith({ userId: 'user1', read: false });
            expect(count).toBe(5);
        });
    });

    // ========================================================================
    // markAsRead - Mark single notification as read
    // ========================================================================
    // Updates a single notification's read status with a timestamp.
    // Both notification ID and user ID must match for security (users can only
    // mark their own notifications as read).
    // ========================================================================
    describe('markAsRead', () => {

        // Test: Successful mark as read - verifies update with readAt timestamp
        // The { new: true } option returns the updated document
        it('should mark notification as read with timestamp', async () => {
            const mockNotification = { _id: 'notif1', read: true };
            (Notification.findOneAndUpdate as any).mockResolvedValue(mockNotification);

            const result = await markAsRead('notif1', 'user1');

            expect(Notification.findOneAndUpdate).toHaveBeenCalledWith(
                { _id: 'notif1', userId: 'user1' },
                { read: true, readAt: expect.any(Date) },
                { new: true }
            );
            expect(result).toBe(mockNotification);
        });

        // Test: Not found handling - returns null when notification doesn't exist
        // or belongs to a different user
        it('should return null when notification not found', async () => {
            (Notification.findOneAndUpdate as any).mockResolvedValue(null);

            const result = await markAsRead('missing', 'user1');
            expect(result).toBeNull();
        });
    });

    // ========================================================================
    // markAllAsRead - Bulk mark all as read
    // ========================================================================
    // Marks all unread notifications for a user as read at once.
    // Useful for "Mark all as read" button functionality.
    // ========================================================================
    describe('markAllAsRead', () => {

        // Test: Bulk update - verifies all unread notifications are marked
        // Returns the count of modified documents
        it('should mark all unread notifications as read and return modified count', async () => {
            (Notification.updateMany as any).mockResolvedValue({ modifiedCount: 7 });

            const count = await markAllAsRead('user1');

            expect(Notification.updateMany).toHaveBeenCalledWith(
                { userId: 'user1', read: false },
                { read: true, readAt: expect.any(Date) }
            );
            expect(count).toBe(7);
        });
    });

    // ========================================================================
    // deleteNotification - Delete single notification
    // ========================================================================
    // Deletes a notification by ID, verifying ownership via userId.
    // Returns boolean indicating success (true if deleted, false if not found).
    // ========================================================================
    describe('deleteNotification', () => {

        // Test: Successful deletion - verifies document was deleted
        // deleteOne returns { deletedCount: 1 } on success
        it('should delete notification and return true on success', async () => {
            (Notification.deleteOne as any).mockResolvedValue({ deletedCount: 1 });

            const result = await deleteNotification('notif1', 'user1');

            expect(Notification.deleteOne).toHaveBeenCalledWith({ _id: 'notif1', userId: 'user1' });
            expect(result).toBe(true);
        });

        // Test: Not found - returns false when notification doesn't exist
        it('should return false when notification not found', async () => {
            (Notification.deleteOne as any).mockResolvedValue({ deletedCount: 0 });

            const result = await deleteNotification('missing', 'user1');
            expect(result).toBe(false);
        });
    });

    // ========================================================================
    // deleteAllNotifications - Bulk delete all notifications
    // ========================================================================
    // Deletes all notifications for a user (e.g., "Clear all notifications").
    // Returns count of deleted documents.
    // ========================================================================
    describe('deleteAllNotifications', () => {

        // Test: Bulk delete - verifies all user notifications are removed
        it('should delete all notifications for user and return count', async () => {
            (Notification.deleteMany as any).mockResolvedValue({ deletedCount: 15 });

            const count = await deleteAllNotifications('user1');

            expect(Notification.deleteMany).toHaveBeenCalledWith({ userId: 'user1' });
            expect(count).toBe(15);
        });
    });

    // ========================================================================
    // Helper notification creators
    // ========================================================================
    // These functions create specific notification types with pre-defined
    // messages and metadata for common scenarios.
    // ========================================================================

    // ---------------------------------------------------------------------
    // notifyRoomInvite - Notification for study room invitations
    // ---------------------------------------------------------------------
    // Creates a ROOM_INVITE notification when a user invites another
    // to join a study room. Includes room ID and inviter name in data.
    describe('notifyRoomInvite', () => {

        // Test: Room invite notification - verifies correct type, message, link, and data
        // The link points to the room, and data contains room ID and inviter name
        it('should create a ROOM_INVITE notification with link and data', async () => {
            const mockNotification = {
                _id: new mongoose.Types.ObjectId(),
                type: 'ROOM_INVITE',
                toJSON: jest.fn().mockReturnValue({} as any)
            };
            (Notification.create as any).mockResolvedValue(mockNotification);

            const result = await notifyRoomInvite('user1', 'room123', 'Study Group', 'Alice');

            expect(Notification.create).toHaveBeenCalledWith(expect.objectContaining({
                userId: 'user1',
                type: 'ROOM_INVITE',
                title: 'Room Invitation',
                message: expect.stringContaining('Alice'),
                link: '/rooms/room123',
                data: { roomId: 'room123', inviterName: 'Alice' }
            }));
            expect(result).toBe(mockNotification);
        });
    });

    // ---------------------------------------------------------------------
    // notifyTestReminder - Reminder to complete personality test
    // ---------------------------------------------------------------------
    // Creates a TEST_REMINDER notification to encourage users who haven't
    // completed their RIASEC personality test yet.
    describe('notifyTestReminder', () => {

        // Test: Test reminder - verifies notification prompts user to take test
        // Link directs them to the personality test page
        it('should create a TEST_REMINDER notification', async () => {
            const mockNotification = {
                _id: new mongoose.Types.ObjectId(),
                type: 'TEST_REMINDER',
                toJSON: jest.fn().mockReturnValue({} as any)
            };
            (Notification.create as any).mockResolvedValue(mockNotification);

            const result = await notifyTestReminder('user1');

            expect(Notification.create).toHaveBeenCalledWith(expect.objectContaining({
                userId: 'user1',
                type: 'TEST_REMINDER',
                title: 'Complete Your Personality Test',
                link: '/personality-test'
            }));
            expect(result).toBe(mockNotification);
        });
    });

    // ---------------------------------------------------------------------
    // notifyWeeklyDigest - Weekly summary notification
    // ---------------------------------------------------------------------
    // Creates a weekly digest notification showing saved courses/careers counts
    // or encouraging exploration if nothing was saved.
    describe('notifyWeeklyDigest', () => {

        // Test: Digest with saved items - shows counts of saved content
        it('should include saved counts when user has saved items', async () => {
            const mockNotification = {
                _id: new mongoose.Types.ObjectId(),
                toJSON: jest.fn().mockReturnValue({} as any)
            };
            (Notification.create as any).mockResolvedValue(mockNotification);

            await notifyWeeklyDigest('user1', 5, 3);

            expect(Notification.create).toHaveBeenCalledWith(expect.objectContaining({
                message: expect.stringContaining('3 saved courses'),
                data: { savedCareersCount: 5, savedCoursesCount: 3 }
            }));
        });

        // Test: Empty digest - encourages exploration when nothing saved
        it('should use explore message when no saved items', async () => {
            const mockNotification = {
                _id: new mongoose.Types.ObjectId(),
                toJSON: jest.fn().mockReturnValue({} as any)
            };
            (Notification.create as any).mockResolvedValue(mockNotification);

            await notifyWeeklyDigest('user1', 0, 0);

            expect(Notification.create).toHaveBeenCalledWith(expect.objectContaining({
                message: 'Explore new courses and careers this week!'
            }));
        });
    });
});
