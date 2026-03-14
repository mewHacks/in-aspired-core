// notification.controller.test.ts
// Tests for notification CRUD, push subscription/unsubscription, and VAPID key retrieval

/// <reference types="jest" />
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { Request, Response } from 'express';
import {
    getNotifications,
    getUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    getVapidKey,
    subscribeToPush,
    unsubscribeFromPush
} from '../../src/controllers/notification.controller';

// Mock notification service
jest.mock('../../src/services/notification.service', () => ({
    getNotificationsForUser: jest.fn(),
    getUnreadCount: jest.fn(),
    markAsRead: jest.fn(),
    markAllAsRead: jest.fn(),
    deleteNotification: jest.fn()
}));

// Mock User model
jest.mock('../../src/models/User', () => ({
    __esModule: true,
    default: {
        findById: jest.fn(),
        findByIdAndUpdate: jest.fn()
    }
}));

// Mock CONFIG
jest.mock('../../src/config/env', () => ({
    CONFIG: {
        VAPID_PUBLIC_KEY: 'test-vapid-public-key'
    }
}));

// Mock activity logger
jest.mock('../../src/middleware/activityLogger', () => ({
    logActivity: jest.fn(),
    buildMeta: jest.fn().mockReturnValue({})
}));

import * as notificationService from '../../src/services/notification.service';
import User from '../../src/models/User';

describe('Notification Controller', () => {
    let req: any;
    let res: any;
    let json: jest.Mock;
    let status: jest.Mock;

    beforeEach(() => {
        jest.clearAllMocks();
        jest.spyOn(console, 'error').mockImplementation(() => {});

        json = jest.fn();
        status = jest.fn().mockReturnValue({ json });
        req = {
            user: { id: 'user123', role: 'student', name: 'Test User', email: 'test@test.com' },
            params: {},
            query: {},
            body: {},
            headers: {},
            ip: '127.0.0.1'
        };
        res = { status, json } as any;
    });

    // ========================================
    // getNotifications
    // ========================================
    describe('getNotifications', () => {

        // Test 1: Unauthenticated
        it('should return 401 if user is not authenticated', async () => {
            req.user = undefined;

            await getNotifications(req, res);

            expect(status).toHaveBeenCalledWith(401);
            expect(json).toHaveBeenCalledWith({ message: 'Unauthorized' });
        });

        // Test 2: Returns paginated notifications
        it('should return notifications with pagination', async () => {
            req.query = { page: '2', limit: '5' };

            const mockResult = {
                notifications: [{ _id: 'n1' }, { _id: 'n2' }],
                total: 12,
                unreadCount: 3
            };
            (notificationService.getNotificationsForUser as any).mockResolvedValue(mockResult);

            await getNotifications(req, res);

            expect(notificationService.getNotificationsForUser).toHaveBeenCalledWith('user123', 2, 5);
            expect(json).toHaveBeenCalledWith(expect.objectContaining({
                notifications: mockResult.notifications,
                total: 12,
                unreadCount: 3,
                page: 2,
                limit: 5,
                totalPages: 3 // ceil(12/5)
            }));
        });

        // Test 3: Default pagination
        it('should use default pagination values', async () => {
            const mockResult = { notifications: [], total: 0, unreadCount: 0 };
            (notificationService.getNotificationsForUser as any).mockResolvedValue(mockResult);

            await getNotifications(req, res);

            // Default: page=1, limit=20
            expect(notificationService.getNotificationsForUser).toHaveBeenCalledWith('user123', 1, 20);
        });
    });

    // ========================================
    // getUnreadCount
    // ========================================
    describe('getUnreadCount', () => {

        // Test 4: Unauthenticated
        it('should return 401 if not authenticated', async () => {
            req.user = undefined;

            await getUnreadCount(req, res);

            expect(status).toHaveBeenCalledWith(401);
        });

        // Test 5: Returns count
        it('should return unread count', async () => {
            (notificationService.getUnreadCount as any).mockResolvedValue(5);

            await getUnreadCount(req, res);

            expect(json).toHaveBeenCalledWith({ unreadCount: 5 });
        });
    });

    // ========================================
    // markAsRead
    // ========================================
    describe('markAsRead', () => {

        // Test 6: Unauthenticated
        it('should return 401 if not authenticated', async () => {
            req.user = undefined;
            req.params = { id: 'n1' };

            await markAsRead(req, res);

            expect(status).toHaveBeenCalledWith(401);
        });

        // Test 7: Not found
        it('should return 404 if notification not found', async () => {
            req.params = { id: 'nonexistent' };
            (notificationService.markAsRead as any).mockResolvedValue(null);

            await markAsRead(req, res);

            expect(status).toHaveBeenCalledWith(404);
            expect(json).toHaveBeenCalledWith({ message: 'Notification not found' });
        });

        // Test 8: Success
        it('should mark notification as read', async () => {
            req.params = { id: 'n1' };
            const mockNotification = { _id: 'n1', read: true };
            (notificationService.markAsRead as any).mockResolvedValue(mockNotification);

            await markAsRead(req, res);

            expect(notificationService.markAsRead).toHaveBeenCalledWith('n1', 'user123');
            expect(json).toHaveBeenCalledWith(mockNotification);
        });
    });

    // ========================================
    // markAllAsRead
    // ========================================
    describe('markAllAsRead', () => {

        // Test 9: Unauthenticated
        it('should return 401 if not authenticated', async () => {
            req.user = undefined;

            await markAllAsRead(req, res);

            expect(status).toHaveBeenCalledWith(401);
        });

        // Test 10: Success
        it('should mark all as read and return count', async () => {
            (notificationService.markAllAsRead as any).mockResolvedValue(7);

            await markAllAsRead(req, res);

            expect(notificationService.markAllAsRead).toHaveBeenCalledWith('user123');
            expect(json).toHaveBeenCalledWith({
                message: 'Marked 7 notifications as read',
                modifiedCount: 7
            });
        });
    });

    // ========================================
    // deleteNotification
    // ========================================
    describe('deleteNotification', () => {

        // Test 11: Not found
        it('should return 404 if notification not found', async () => {
            req.params = { id: 'nonexistent' };
            (notificationService.deleteNotification as any).mockResolvedValue(null);

            await deleteNotification(req, res);

            expect(status).toHaveBeenCalledWith(404);
        });

        // Test 12: Success
        it('should delete notification successfully', async () => {
            req.params = { id: 'n1' };
            (notificationService.deleteNotification as any).mockResolvedValue(true);

            await deleteNotification(req, res);

            expect(json).toHaveBeenCalledWith({ message: 'Notification deleted' });
        });
    });

    // ========================================
    // getVapidKey
    // ========================================
    describe('getVapidKey', () => {

        // Test 13: Returns VAPID key
        it('should return the VAPID public key', async () => {
            await getVapidKey(req, res);

            expect(json).toHaveBeenCalledWith({ publicKey: 'test-vapid-public-key' });
        });
    });

    // ========================================
    // subscribeToPush
    // ========================================
    describe('subscribeToPush', () => {

        // Test 14: Unauthenticated
        it('should return 401 if not authenticated', async () => {
            req.user = undefined;

            await subscribeToPush(req, res);

            expect(status).toHaveBeenCalledWith(401);
        });

        // Test 15: Invalid subscription object
        it('should return 400 for invalid subscription object', async () => {
            req.body = { subscription: { endpoint: 'https://push.example.com' } }; // Missing keys

            await subscribeToPush(req, res);

            expect(status).toHaveBeenCalledWith(400);
            expect(json).toHaveBeenCalledWith({ message: 'Invalid subscription object' });
        });

        // Test 16: Successful subscription
        it('should subscribe successfully with valid subscription', async () => {
            req.body = {
                subscription: {
                    endpoint: 'https://push.example.com/sub123',
                    keys: { auth: 'authkey', p256dh: 'p256dhkey' }
                }
            };
            req.headers = { 'user-agent': 'TestBrowser/1.0' };

            (User.findByIdAndUpdate as any).mockResolvedValue({});

            await subscribeToPush(req, res);

            // Should first remove existing subscription with same endpoint
            expect(User.findByIdAndUpdate).toHaveBeenCalledWith('user123', {
                $pull: { 'preferences.pushSubscriptions': { endpoint: 'https://push.example.com/sub123' } }
            });

            // Should then add new subscription
            expect(User.findByIdAndUpdate).toHaveBeenCalledWith('user123', expect.objectContaining({
                $push: expect.objectContaining({
                    'preferences.pushSubscriptions': expect.objectContaining({
                        endpoint: 'https://push.example.com/sub123',
                        keys: { auth: 'authkey', p256dh: 'p256dhkey' }
                    })
                }),
                $set: { 'preferences.pushNotifications': true }
            }));

            expect(json).toHaveBeenCalledWith(expect.objectContaining({
                success: true
            }));
        });
    });

    // ========================================
    // unsubscribeFromPush
    // ========================================
    describe('unsubscribeFromPush', () => {

        // Test 17: Unauthenticated
        it('should return 401 if not authenticated', async () => {
            req.user = undefined;

            await unsubscribeFromPush(req, res);

            expect(status).toHaveBeenCalledWith(401);
        });

        // Test 18: Removes specific endpoint
        it('should remove specific push subscription by endpoint', async () => {
            req.body = { endpoint: 'https://push.example.com/sub123' };

            const mockUser = {
                preferences: {
                    pushSubscriptions: [],
                    pushNotifications: true
                },
                save: jest.fn()
            };
            (User.findByIdAndUpdate as any).mockResolvedValue({});
            (User.findById as any).mockResolvedValue(mockUser);

            await unsubscribeFromPush(req, res);

            expect(User.findByIdAndUpdate).toHaveBeenCalledWith('user123', {
                $pull: { 'preferences.pushSubscriptions': { endpoint: 'https://push.example.com/sub123' } }
            });

            // Since no subscriptions remain, pushNotifications should be set to false
            expect(mockUser.preferences.pushNotifications).toBe(false);
            expect(mockUser.save).toHaveBeenCalled();

            expect(json).toHaveBeenCalledWith(expect.objectContaining({
                success: true
            }));
        });
    });
});
