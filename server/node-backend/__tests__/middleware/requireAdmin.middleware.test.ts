// requireAdmin.middleware.test.ts
// Tests for admin role authorization: ensures only admin users can access protected routes

/// <reference types="jest" />
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { Response, NextFunction } from 'express';
import { requireAdmin } from '../../src/middleware/requireAdmin.middleware';
import { AuthRequest } from '../../src/middleware/auth.middleware';

// Mock @in-aspired/shared to provide UserRole
jest.mock('@in-aspired/shared', () => ({
    UserRole: {
        ADMIN: 'admin',
        STUDENT: 'student'
    }
}));

describe('requireAdmin Middleware', () => {
    let req: Partial<AuthRequest>;
    let res: Partial<Response>;
    let next: NextFunction;
    let json: jest.Mock;
    let status: jest.Mock;

    beforeEach(() => {
        jest.clearAllMocks();

        json = jest.fn();
        status = jest.fn().mockReturnValue({ json });
        req = {};
        res = { status, json } as any;
        next = jest.fn();
    });

    // Test 1: No user attached (authenticate middleware did not run or failed)
    it('should return 401 if req.user is not set', () => {
        requireAdmin(req as AuthRequest, res as Response, next);

        expect(status).toHaveBeenCalledWith(401);
        expect(json).toHaveBeenCalledWith({ message: 'Not authenticated' });
        expect(next).not.toHaveBeenCalled();
    });

    // Test 2: User exists but role is student (not admin)
    it('should return 403 if user role is student', () => {
        req.user = { id: 'user123', role: 'student' };

        requireAdmin(req as AuthRequest, res as Response, next);

        expect(status).toHaveBeenCalledWith(403);
        expect(json).toHaveBeenCalledWith({ message: 'Admin access only' });
        expect(next).not.toHaveBeenCalled();
    });

    // Test 3: User exists with admin role — should pass
    it('should call next() if user is admin', () => {
        req.user = { id: 'admin123', role: 'admin' };

        requireAdmin(req as AuthRequest, res as Response, next);

        expect(next).toHaveBeenCalled();
        expect(status).not.toHaveBeenCalled();
    });

    // Test 4: User with undefined role
    it('should return 403 if user role is undefined', () => {
        req.user = { id: 'user123', role: undefined as any };

        requireAdmin(req as AuthRequest, res as Response, next);

        expect(status).toHaveBeenCalledWith(403);
        expect(json).toHaveBeenCalledWith({ message: 'Admin access only' });
        expect(next).not.toHaveBeenCalled();
    });

    // Test 5: User with uppercase "ADMIN" string — middleware lowercases
    it('should handle uppercase role strings via toLowerCase()', () => {
        req.user = { id: 'admin123', role: 'ADMIN' as any };

        requireAdmin(req as AuthRequest, res as Response, next);

        // The middleware does: req.user.role?.toString().toLowerCase()
        // 'ADMIN'.toLowerCase() === 'admin' === UserRole.ADMIN
        expect(next).toHaveBeenCalled();
        expect(status).not.toHaveBeenCalled();
    });
});
