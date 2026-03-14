// users.controller.test.ts
// Tests for user profile management

/// <reference types="jest" />
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { Response } from 'express';
import * as userController from '../../src/controllers/users.controller';
import User from '../../src/models/User';
import { AuthenticatedRequest } from '../../src/types/express';

// Mock Mongoose Model
jest.mock('../../src/models/User', () => ({
    __esModule: true,
    default: {
        findByIdAndUpdate: jest.fn()
    }
}));

// Mock activity logger (controllers now call logActivity on profile update)
jest.mock('../../src/middleware/activityLogger', () => ({
    logActivity: jest.fn().mockResolvedValue(undefined as never),
    buildMeta: jest.fn().mockReturnValue({})
}));

describe('Users Controller', () => {
    let req: Partial<AuthenticatedRequest>;
    let res: Partial<Response>;
    let json: jest.Mock;
    let status: jest.Mock;

    beforeEach(() => {
        jest.clearAllMocks();

        // Suppress console.error
        jest.spyOn(console, 'error').mockImplementation(() => { });

        json = jest.fn();
        status = jest.fn(() => ({ json }));
        res = { status, json } as any;
        req = {
            body: {},
            ip: '127.0.0.1',
            user: { id: 'user-123', role: 'user' }
        };
    });

    // ========================================
    // updateCurrentUser
    // Description: Verifies profile updates
    // ========================================
    describe('updateCurrentUser', () => {

        // Test 1: Successful Update
        it('should update user and return new data', async () => {
            const updateData = { name: 'New Name', phone: '123456' };
            req.body = updateData;
            req.user = { id: 'user-123', role: 'user' } as any; // Mock req.user structure from middleware

            const mockUpdatedUser = { _id: { toString: () => 'user-123' }, ...updateData };
            (User.findByIdAndUpdate as any).mockResolvedValue(mockUpdatedUser);

            await userController.updateCurrentUser(req as AuthenticatedRequest, res as Response);

            expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
                'user-123',
                expect.objectContaining(updateData),
                { new: true, runValidators: true }
            );

            expect(json).toHaveBeenCalledWith(mockUpdatedUser);
        });

        // Test 2: User Not Found
        it('should return 404 if user does not exist', async () => {
            req.user = { id: 'user-999', role: 'user' } as any;
            (User.findByIdAndUpdate as any).mockResolvedValue(null);

            await userController.updateCurrentUser(req as AuthenticatedRequest, res as Response);

            expect(status).toHaveBeenCalledWith(404);
            expect(json).toHaveBeenCalledWith({ error: 'User not found' });
        });

        // Test 3: DB Error
        it('should return 500 on database error', async () => {
            req.user = { id: 'user-123', role: 'user' } as any;
            (User.findByIdAndUpdate as any).mockRejectedValue(new Error('DB Error'));

            await userController.updateCurrentUser(req as AuthenticatedRequest, res as Response);

            expect(status).toHaveBeenCalledWith(500);
            expect(json).toHaveBeenCalledWith({ error: 'Server error updating user' });
        });
    });
});
