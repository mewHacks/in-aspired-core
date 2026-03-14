// activityLogger.test.ts
// Tests for activity logging: buildMeta helper, logActivity function, and middleware passthrough

/// <reference types="jest" />
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';

// Mock dependencies before importing the module under test
jest.mock('../../src/models/UserActivity');
jest.mock('../../src/socket/socketEmitter');

import { buildMeta, logActivity, activityLogger } from '../../src/middleware/activityLogger';
import UserActivity from '../../src/models/UserActivity';
import { getSocketIO } from '../../src/socket/socketEmitter';

// ==============================
// Main test suite
// ==============================
describe('Activity Logger', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    // ========================================
    // buildMeta
    // ========================================
    describe('buildMeta', () => {

        it('should map user fields to prefixed keys', () => {
            const user = {
                name: 'Alice',
                email: 'alice@test.com',
                role: 'student',
                authProvider: 'local',
                googleId: undefined
            };

            const result = buildMeta(user);

            expect(result).toEqual({
                userName: 'Alice',
                userEmail: 'alice@test.com',
                userRole: 'student',
                authProvider: 'local',
                googleId: undefined
            });
        });

        it('should merge additional meta into the result', () => {
            const user = { name: 'Bob', email: 'bob@test.com', role: 'admin' };
            const additionalMeta = { targetUserId: '123', action: 'delete' };

            const result = buildMeta(user, additionalMeta);

            expect(result).toEqual(expect.objectContaining({
                userName: 'Bob',
                userEmail: 'bob@test.com',
                userRole: 'admin',
                targetUserId: '123',
                action: 'delete'
            }));
        });

        it('should handle minimal user object with undefined fields', () => {
            const user = {};
            const result = buildMeta(user);

            expect(result).toEqual({
                userName: undefined,
                userEmail: undefined,
                userRole: undefined,
                authProvider: undefined,
                googleId: undefined
            });
        });

        it('should allow additional meta to override base fields', () => {
            const user = { name: 'Original' };
            const result = buildMeta(user, { userName: 'Override' });

            // Additional meta spreads last, so it overrides
            expect(result.userName).toBe('Override');
        });
    });

    // ========================================
    // logActivity
    // ========================================
    describe('logActivity', () => {

        const validUserId = new mongoose.Types.ObjectId().toString();

        it('should return early for invalid ObjectId', async () => {
            await logActivity({
                userId: 'invalid-short',
                activity: 'Test'
            });

            expect(UserActivity.create).not.toHaveBeenCalled();
        });

        it('should create activity record in database', async () => {
            const mockActivity = {
                _id: new mongoose.Types.ObjectId(),
                createdAt: new Date()
            };
            (UserActivity.create as any).mockResolvedValue(mockActivity);
            (getSocketIO as any).mockReturnValue(null); // No socket

            await logActivity({
                userId: validUserId,
                activity: 'Logged in',
                type: 'Auth',
                ip: '127.0.0.1',
                meta: { userName: 'Alice' }
            });

            expect(UserActivity.create).toHaveBeenCalledWith({
                userId: expect.any(mongoose.Types.ObjectId),
                activity: 'Logged in',
                type: 'Auth',
                ip: '127.0.0.1',
                meta: { userName: 'Alice' }
            });
        });

        it('should default type to General when not provided', async () => {
            const mockActivity = {
                _id: new mongoose.Types.ObjectId(),
                createdAt: new Date()
            };
            (UserActivity.create as any).mockResolvedValue(mockActivity);
            (getSocketIO as any).mockReturnValue(null);

            await logActivity({
                userId: validUserId,
                activity: 'Something'
            });

            expect(UserActivity.create).toHaveBeenCalledWith(
                expect.objectContaining({ type: 'General' })
            );
        });

        it('should broadcast via WebSocket when io is available', async () => {
            const mockActivity = {
                _id: new mongoose.Types.ObjectId(),
                createdAt: new Date()
            };
            (UserActivity.create as any).mockResolvedValue(mockActivity);

            // Mock Socket.IO server with emit and to methods
            const emitMock = jest.fn();
            const toMock = (jest.fn() as any).mockReturnValue({ emit: emitMock });
            const mockIO = { emit: emitMock, to: toMock };
            (getSocketIO as any).mockReturnValue(mockIO);

            await logActivity({
                userId: validUserId,
                activity: 'Test action',
                type: 'Admin',
                meta: { userName: 'Admin' }
            });

            // Should emit to all clients
            expect(emitMock).toHaveBeenCalledWith('activity:new', expect.objectContaining({
                activity: 'Test action',
                type: 'Admin'
            }));

            // Should emit to admin room
            expect(toMock).toHaveBeenCalledWith('admin-room');

            // Should emit type-specific event
            expect(emitMock).toHaveBeenCalledWith('activity:admin', expect.objectContaining({
                activity: 'Test action'
            }));
        });

        it('should not broadcast when io is null', async () => {
            const mockActivity = {
                _id: new mongoose.Types.ObjectId(),
                createdAt: new Date()
            };
            (UserActivity.create as any).mockResolvedValue(mockActivity);
            (getSocketIO as any).mockReturnValue(null);

            await logActivity({
                userId: validUserId,
                activity: 'Silent action'
            });

            // No emit calls since io is null — just verify create was called
            expect(UserActivity.create).toHaveBeenCalled();
        });

        it('should catch and log errors without throwing', async () => {
            (UserActivity.create as any).mockRejectedValue(new Error('DB write failed'));
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

            // Should not throw
            await logActivity({
                userId: validUserId,
                activity: 'Fail test'
            });

            expect(consoleSpy).toHaveBeenCalledWith('Activity log failed:', expect.any(Error));
            consoleSpy.mockRestore();
        });

        it('should return the created activity on success', async () => {
            const mockActivity = {
                _id: new mongoose.Types.ObjectId(),
                createdAt: new Date()
            };
            (UserActivity.create as any).mockResolvedValue(mockActivity);
            (getSocketIO as any).mockReturnValue(null);

            const result = await logActivity({
                userId: validUserId,
                activity: 'Return test'
            });

            expect(result).toBe(mockActivity);
        });
    });

    // ========================================
    // activityLogger middleware
    // ========================================
    describe('activityLogger middleware', () => {

        it('should call next() immediately (passthrough)', () => {
            const req = {} as Request;
            const res = {} as Response;
            const next = jest.fn() as unknown as NextFunction;

            activityLogger(req, res, next);

            expect(next).toHaveBeenCalledTimes(1);
        });
    });
});
