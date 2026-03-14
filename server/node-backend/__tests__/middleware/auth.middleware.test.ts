// auth.middleware.test.ts
// Tests for authentication middleware: token extraction (cookie/header), verification, and error handling

/// <reference types="jest" />
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { authenticate, AuthRequest } from '../../src/middleware/auth.middleware';
import { CONFIG } from '../../src/config/env';

// Mock jsonwebtoken
jest.mock('jsonwebtoken');

// Mock User model (authenticate is now async and calls User.findById)
jest.mock('../../src/models/User', () => ({
    __esModule: true,
    default: {
        findById: jest.fn().mockReturnValue({
            select: jest.fn()
        })
    }
}));

import User from '../../src/models/User';

describe('Auth Middleware', () => {
    let req: Partial<AuthRequest>;
    let res: Partial<Response>;
    let next: NextFunction;
    let json: jest.Mock;
    let status: jest.Mock;

    beforeEach(() => {
        jest.clearAllMocks();

        // Mock req/res/next
        req = {
            cookies: {},
            headers: {}
        };
        json = jest.fn();
        status = jest.fn().mockReturnValue({ json });
        res = { status, json } as any;
        next = jest.fn();
    });

    // Test 1: No Token
    it('should return 401 if no token is provided', async () => {
        await authenticate(req as AuthRequest, res as Response, next);

        expect(status).toHaveBeenCalledWith(401);
        expect(json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringMatching(/no token/i) }));
        expect(next).not.toHaveBeenCalled();
    });

    // Test 2: Invalid Token
    it('should return 401 if token is invalid', async () => {
        req.cookies = { accessToken: 'invalid-token' };
        (jwt.verify as jest.Mock).mockImplementation(() => {
            throw new Error('Invalid signature');
        });

        await authenticate(req as AuthRequest, res as Response, next);

        expect(status).toHaveBeenCalledWith(401);
        expect(json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Invalid token' }));
        expect(next).not.toHaveBeenCalled();
    });

    // Test 3: Success via Cookie
    it('should authenticate successfully via Cookie', async () => {
        const mockUser = { id: 'user123', role: 'student' };
        req.cookies = { accessToken: 'valid-token' };

        (jwt.verify as jest.Mock).mockReturnValue(mockUser);

        // Mock User.findById().select() to return a user object
        const mockDbUser = {
            _id: { toString: () => 'user123' },
            role: 'student',
            status: 'active'
        };
        (User.findById as any).mockReturnValue({
            select: (jest.fn() as any).mockResolvedValue(mockDbUser)
        });

        await authenticate(req as AuthRequest, res as Response, next);

        expect(jwt.verify).toHaveBeenCalledWith('valid-token', CONFIG.JWT_SECRET);
        expect((req as AuthRequest).user).toEqual({ id: 'user123', role: 'student' });
        expect(next).toHaveBeenCalled();
    });

    // Test 4: Success via Header
    it('should authenticate successfully via Authorization Header', async () => {
        const mockUser = { id: 'user123', role: 'admin' };
        req.headers = { authorization: 'Bearer valid-header-token' };

        (jwt.verify as jest.Mock).mockReturnValue(mockUser);

        // Mock User.findById().select() to return a user object
        const mockDbUser = {
            _id: { toString: () => 'user123' },
            role: 'admin',
            status: 'active'
        };
        (User.findById as any).mockReturnValue({
            select: (jest.fn() as any).mockResolvedValue(mockDbUser)
        });

        await authenticate(req as AuthRequest, res as Response, next);

        expect(jwt.verify).toHaveBeenCalledWith('valid-header-token', CONFIG.JWT_SECRET);
        expect((req as AuthRequest).user).toEqual({ id: 'user123', role: 'admin' });
        expect(next).toHaveBeenCalled();
    });

    // Test 5: User not found in DB
    it('should return 401 if user is not found in database', async () => {
        req.cookies = { accessToken: 'valid-token' };
        (jwt.verify as jest.Mock).mockReturnValue({ id: 'deleted-user', role: 'student' });

        (User.findById as any).mockReturnValue({
            select: (jest.fn() as any).mockResolvedValue(null)
        });

        await authenticate(req as AuthRequest, res as Response, next);

        expect(status).toHaveBeenCalledWith(401);
        expect(json).toHaveBeenCalledWith({ error: 'User not found' });
        expect(next).not.toHaveBeenCalled();
    });

    // Test 6: Suspended user
    it('should return 403 if user is suspended', async () => {
        req.cookies = { accessToken: 'valid-token' };
        (jwt.verify as jest.Mock).mockReturnValue({ id: 'suspended-user', role: 'student' });

        const mockDbUser = {
            _id: { toString: () => 'suspended-user' },
            role: 'student',
            status: 'suspended'
        };
        (User.findById as any).mockReturnValue({
            select: (jest.fn() as any).mockResolvedValue(mockDbUser)
        });

        await authenticate(req as AuthRequest, res as Response, next);

        expect(status).toHaveBeenCalledWith(403);
        expect(json).toHaveBeenCalledWith({ error: 'Account is suspended' });
        expect(next).not.toHaveBeenCalled();
    });
});
