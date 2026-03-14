// admin.controller.test.ts
// Tests for admin user management: list users, view activity, suspend/unsuspend, and stats

/// <reference types="jest" />
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { Request, Response } from 'express';
import mongoose from 'mongoose';

// Mock dependencies before importing controller
jest.mock('../../src/models/User');
jest.mock('../../src/models/UserActivity');
jest.mock('../../src/middleware/activityLogger');

import {
    getAllUsers,
    getUserActivity,
    suspendUser,
    getUserStats
} from '../../src/controllers/admin.controller';
import User from '../../src/models/User';
import UserActivity from '../../src/models/UserActivity';
import { logActivity, buildMeta } from '../../src/middleware/activityLogger';

// ==============================
// Helper: build mock req/res
// ==============================
function buildMocks(overrides: { user?: any; params?: any; body?: any; query?: any } = {}) {
    const json = jest.fn();
    const status = jest.fn(() => ({ json })) as any;
    const res = { status, json } as unknown as Response;
    const req = {
        user: 'user' in overrides ? overrides.user : { id: new mongoose.Types.ObjectId().toString(), role: 'admin', name: 'Admin', email: 'admin@test.com' },
        params: overrides.params ?? {},
        body: overrides.body ?? {},
        query: overrides.query ?? {},
        ip: '127.0.0.1'
    } as any;
    return { req, res, status, json };
}

// ==============================
// Main test suite
// ==============================
describe('Admin Controller', () => {

    beforeEach(() => {
        jest.clearAllMocks();
        // buildMeta returns a plain object by default
        (buildMeta as any).mockReturnValue({ userName: 'Admin', userEmail: 'admin@test.com', userRole: 'admin' });
        // logActivity resolves silently
        (logActivity as any).mockResolvedValue(null);
    });

    // ========================================
    // Authorization Guard
    // ========================================
    describe('Authorization Guard (403 for non-admins)', () => {

        it('getAllUsers returns 403 for student role', async () => {
            const { req, res, status, json } = buildMocks({ user: { id: '1', role: 'student' } });
            await getAllUsers(req as any, res);
            expect(status).toHaveBeenCalledWith(403);
            expect(json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Forbidden: Admins only' }));
        });

        it('getUserActivity returns 403 for student role', async () => {
            const { req, res, status } = buildMocks({ user: { id: '1', role: 'student' }, params: { id: new mongoose.Types.ObjectId().toString() } });
            await getUserActivity(req as any, res);
            expect(status).toHaveBeenCalledWith(403);
        });

        it('suspendUser returns 403 for student role', async () => {
            const { req, res, status } = buildMocks({ user: { id: '1', role: 'student' }, params: { id: new mongoose.Types.ObjectId().toString() }, body: { action: 'suspend' } });
            await suspendUser(req as any, res);
            expect(status).toHaveBeenCalledWith(403);
        });

        it('getUserStats returns 403 for student role', async () => {
            const { req, res, status } = buildMocks({ user: { id: '1', role: 'student' } });
            await getUserStats(req as any, res);
            expect(status).toHaveBeenCalledWith(403);
        });

        it('getAllUsers returns 403 when no user attached', async () => {
            const { req, res, status } = buildMocks({ user: undefined });
            await getAllUsers(req as any, res);
            expect(status).toHaveBeenCalledWith(403);
        });
    });

    // ========================================
    // getAllUsers
    // ========================================
    describe('getAllUsers', () => {

        it('should return list of all users with sensitive fields excluded', async () => {
            const mockUsers = [{ name: 'Alice' }, { name: 'Bob' }];
            const selectMock = (jest.fn() as any).mockResolvedValue(mockUsers);
            (User.find as any).mockReturnValue({ select: selectMock });

            const { req, res, status, json } = buildMocks();
            await getAllUsers(req as any, res);

            expect(User.find).toHaveBeenCalled();
            // Verify select excludes password and sensitive fields
            expect(selectMock).toHaveBeenCalledWith(expect.stringContaining('-password'));
            expect(status).toHaveBeenCalledWith(200);
            expect(json).toHaveBeenCalledWith(mockUsers);
        });

        it('should log activity after fetching users', async () => {
            const selectMock = (jest.fn() as any).mockResolvedValue([]);
            (User.find as any).mockReturnValue({ select: selectMock });

            const { req, res } = buildMocks();
            await getAllUsers(req as any, res);

            expect(logActivity).toHaveBeenCalledWith(expect.objectContaining({
                activity: 'Viewed all users',
                type: 'Admin'
            }));
        });

        it('should return 500 on database error', async () => {
            (User.find as any).mockReturnValue({
                select: (jest.fn() as any).mockRejectedValue(new Error('DB error'))
            });

            const { req, res, status, json } = buildMocks();
            await getAllUsers(req as any, res);

            expect(status).toHaveBeenCalledWith(500);
            expect(json).toHaveBeenCalledWith({ message: 'Server error' });
        });
    });

    // ========================================
    // getUserActivity
    // ========================================
    describe('getUserActivity', () => {

        const validId = new mongoose.Types.ObjectId().toString();

        it('should return 400 for invalid ObjectId', async () => {
            const { req, res, status, json } = buildMocks({ params: { id: 'not-valid' } });
            await getUserActivity(req as any, res);

            expect(status).toHaveBeenCalledWith(400);
            expect(json).toHaveBeenCalledWith({ message: 'Invalid user ID' });
        });

        it('should return paginated activity logs', async () => {
            const mockLogs = [{ activity: 'Logged in' }];
            const mockUser = { name: 'Alice', email: 'alice@test.com' };

            // Chain: find -> sort -> skip -> limit
            const limitMock = (jest.fn() as any).mockResolvedValue(mockLogs);
            const skipMock = (jest.fn() as any).mockReturnValue({ limit: limitMock });
            const sortMock = (jest.fn() as any).mockReturnValue({ skip: skipMock });
            (UserActivity.find as any).mockReturnValue({ sort: sortMock });

            // countDocuments for total
            (UserActivity.countDocuments as any).mockResolvedValue(1);

            // User.findById for target user
            (User.findById as any).mockReturnValue({ select: (jest.fn() as any).mockResolvedValue(mockUser) });

            const { req, res, status, json } = buildMocks({ params: { id: validId }, query: { page: '1', limit: '10' } });
            await getUserActivity(req as any, res);

            expect(status).toHaveBeenCalledWith(200);
            expect(json).toHaveBeenCalledWith(expect.objectContaining({
                data: mockLogs,
                pagination: expect.objectContaining({
                    page: 1,
                    limit: 10,
                    totalRecords: 1,
                    totalPages: 1,
                    hasNextPage: false,
                    hasPrevPage: false
                })
            }));
        });

        it('should default to page 1 and limit 20 when not provided', async () => {
            const limitMock = (jest.fn() as any).mockResolvedValue([]);
            const skipMock = (jest.fn() as any).mockReturnValue({ limit: limitMock });
            const sortMock = (jest.fn() as any).mockReturnValue({ skip: skipMock });
            (UserActivity.find as any).mockReturnValue({ sort: sortMock });
            (UserActivity.countDocuments as any).mockResolvedValue(0);
            (User.findById as any).mockReturnValue({ select: (jest.fn() as any).mockResolvedValue(null) });

            const { req, res, status } = buildMocks({ params: { id: validId }, query: {} });
            await getUserActivity(req as any, res);

            expect(status).toHaveBeenCalledWith(200);
            // skip(0) = (page 1 - 1) * limit 20
            expect(skipMock).toHaveBeenCalledWith(0);
            expect(limitMock).toHaveBeenCalledWith(20);
        });

        it('should clamp limit to max 100', async () => {
            const limitMock = (jest.fn() as any).mockResolvedValue([]);
            const skipMock = (jest.fn() as any).mockReturnValue({ limit: limitMock });
            const sortMock = (jest.fn() as any).mockReturnValue({ skip: skipMock });
            (UserActivity.find as any).mockReturnValue({ sort: sortMock });
            (UserActivity.countDocuments as any).mockResolvedValue(0);
            (User.findById as any).mockReturnValue({ select: (jest.fn() as any).mockResolvedValue(null) });

            const { req, res } = buildMocks({ params: { id: validId }, query: { limit: '500' } });
            await getUserActivity(req as any, res);

            // Limit should be clamped to 100
            expect(limitMock).toHaveBeenCalledWith(100);
        });

        it('should return 500 on database error', async () => {
            (UserActivity.find as any).mockReturnValue({
                sort: () => ({ skip: () => ({ limit: (jest.fn() as any).mockRejectedValue(new Error('DB error')) }) })
            });
            (UserActivity.countDocuments as any).mockResolvedValue(0);
            (User.findById as any).mockReturnValue({ select: (jest.fn() as any).mockResolvedValue(null) });

            const { req, res, status, json } = buildMocks({ params: { id: validId } });
            await getUserActivity(req as any, res);

            expect(status).toHaveBeenCalledWith(500);
            expect(json).toHaveBeenCalledWith({ message: 'Failed to fetch activity logs' });
        });
    });

    // ========================================
    // suspendUser
    // ========================================
    describe('suspendUser', () => {

        const validId = new mongoose.Types.ObjectId().toString();

        it('should return 400 for invalid action', async () => {
            const { req, res, status, json } = buildMocks({
                params: { id: validId },
                body: { action: 'ban' }
            });
            await suspendUser(req as any, res);

            expect(status).toHaveBeenCalledWith(400);
            expect(json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('Invalid action') }));
        });

        it('should return 400 for invalid ObjectId', async () => {
            const { req, res, status } = buildMocks({
                params: { id: '!!!' },
                body: { action: 'suspend' }
            });
            await suspendUser(req as any, res);

            expect(status).toHaveBeenCalledWith(400);
        });

        it('should return 404 when user not found', async () => {
            (User.findById as any).mockResolvedValue(null);

            const { req, res, status } = buildMocks({
                params: { id: validId },
                body: { action: 'suspend' }
            });
            await suspendUser(req as any, res);

            expect(status).toHaveBeenCalledWith(404);
        });

        it('should suspend user and clear refresh tokens', async () => {
            const mockUser = {
                _id: new mongoose.Types.ObjectId(),
                name: 'Student',
                email: 'student@test.com',
                status: 'active',
                refreshTokens: ['token1', 'token2'],
                save: jest.fn()
            };
            const mockAdmin = {
                _id: new mongoose.Types.ObjectId(),
                name: 'Admin',
                email: 'admin@test.com',
                role: 'admin'
            };

            // First findById returns target user, second returns admin
            (User.findById as any)
                .mockResolvedValueOnce(mockUser)
                .mockResolvedValueOnce(mockAdmin);

            const { req, res, status, json } = buildMocks({
                params: { id: validId },
                body: { action: 'suspend' }
            });
            await suspendUser(req as any, res);

            // Verify user was suspended
            expect(mockUser.status).toBe('suspended');
            expect(mockUser.refreshTokens).toEqual([]);
            expect(mockUser.save).toHaveBeenCalled();
            expect(status).toHaveBeenCalledWith(200);
            expect(json).toHaveBeenCalledWith(expect.objectContaining({
                message: expect.stringContaining('suspended')
            }));
        });

        it('should unsuspend user successfully', async () => {
            const mockUser = {
                _id: new mongoose.Types.ObjectId(),
                name: 'Student',
                email: 'student@test.com',
                status: 'suspended',
                refreshTokens: [],
                save: jest.fn()
            };
            const mockAdmin = {
                _id: new mongoose.Types.ObjectId(),
                name: 'Admin',
                email: 'admin@test.com',
                role: 'admin'
            };

            (User.findById as any)
                .mockResolvedValueOnce(mockUser)
                .mockResolvedValueOnce(mockAdmin);

            const { req, res, status, json } = buildMocks({
                params: { id: validId },
                body: { action: 'unsuspend' }
            });
            await suspendUser(req as any, res);

            // Verify user was unsuspended
            expect(mockUser.status).toBe('active');
            expect(mockUser.save).toHaveBeenCalled();
            expect(status).toHaveBeenCalledWith(200);
            expect(json).toHaveBeenCalledWith(expect.objectContaining({
                message: expect.stringContaining('unsuspended')
            }));
        });

        it('should log activity for both target user and admin', async () => {
            const mockUser = {
                _id: new mongoose.Types.ObjectId(),
                name: 'Student',
                email: 'student@test.com',
                status: 'active',
                refreshTokens: [],
                save: jest.fn()
            };
            const mockAdmin = {
                _id: new mongoose.Types.ObjectId(),
                name: 'Admin',
                email: 'admin@test.com',
                role: 'admin'
            };

            (User.findById as any)
                .mockResolvedValueOnce(mockUser)
                .mockResolvedValueOnce(mockAdmin);

            const { req, res } = buildMocks({
                params: { id: validId },
                body: { action: 'suspend' }
            });
            await suspendUser(req as any, res);

            // Two logActivity calls: one for target user, one for admin
            expect(logActivity).toHaveBeenCalledTimes(2);
        });

        it('should return 500 on database error', async () => {
            (User.findById as any).mockRejectedValue(new Error('DB error'));

            const { req, res, status, json } = buildMocks({
                params: { id: validId },
                body: { action: 'suspend' }
            });
            await suspendUser(req as any, res);

            expect(status).toHaveBeenCalledWith(500);
            expect(json).toHaveBeenCalledWith({ message: 'Failed to update user status' });
        });
    });

    // ========================================
    // getUserStats
    // ========================================
    describe('getUserStats', () => {

        it('should return aggregate user statistics', async () => {
            (User.countDocuments as any)
                .mockResolvedValueOnce(100)  // totalUsers
                .mockResolvedValueOnce(85)   // activeUsers
                .mockResolvedValueOnce(10)   // suspendedUsers
                .mockResolvedValueOnce(5);   // newToday

            const { req, res, json } = buildMocks();
            await getUserStats(req as any, res);

            // Verify four countDocuments calls
            expect(User.countDocuments).toHaveBeenCalledTimes(4);
            expect(json).toHaveBeenCalledWith({
                totalUsers: 100,
                activeUsers: 85,
                suspendedUsers: 10,
                newToday: 5
            });
        });

        it('should return 500 on database error', async () => {
            (User.countDocuments as any).mockRejectedValue(new Error('DB error'));

            const { req, res, status, json } = buildMocks();
            await getUserStats(req as any, res);

            expect(status).toHaveBeenCalledWith(500);
            expect(json).toHaveBeenCalledWith({ message: 'Failed to fetch stats' });
        });
    });
});
