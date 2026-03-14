// error.middleware.test.ts
// Tests for the centralized error handler: maps error types to correct HTTP status codes and messages

/// <reference types="jest" />
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { Request, Response, NextFunction } from 'express';
import { errorHandler } from '../../src/middleware/error.middleware';

// Mock CONFIG for stack trace visibility control
jest.mock('../../src/config/env', () => ({
    CONFIG: {
        NODE_ENV: 'production'
    }
}));

describe('Error Middleware', () => {
    let req: Partial<Request>;
    let res: Partial<Response>;
    let next: NextFunction;
    let json: jest.Mock;
    let status: jest.Mock;

    beforeEach(() => {
        jest.clearAllMocks();
        jest.spyOn(console, 'error').mockImplementation(() => {});

        json = jest.fn();
        status = jest.fn().mockReturnValue({ json });
        req = { method: 'GET', url: '/test' } as any;
        res = { status, json } as any;
        next = jest.fn();
    });

    // Test 1: Default 500 error for generic errors
    it('should return 500 for a generic error with no statusCode', () => {
        const err = new Error('Something went wrong');

        errorHandler(err as any, req as Request, res as Response, next);

        expect(status).toHaveBeenCalledWith(500);
        expect(json).toHaveBeenCalledWith(expect.objectContaining({
            success: false,
            message: 'Something went wrong'
        }));
    });

    // Test 2: Custom statusCode from AppError
    it('should use the statusCode from the error object', () => {
        const err: any = new Error('Not Found');
        err.statusCode = 404;

        errorHandler(err, req as Request, res as Response, next);

        expect(status).toHaveBeenCalledWith(404);
        expect(json).toHaveBeenCalledWith(expect.objectContaining({
            success: false,
            message: 'Not Found'
        }));
    });

    // Test 3: Mongoose CastError maps to 404
    it('should return 404 for Mongoose CastError (bad ObjectId)', () => {
        const err: any = new Error('Cast to ObjectId failed');
        err.name = 'CastError';

        errorHandler(err, req as Request, res as Response, next);

        expect(status).toHaveBeenCalledWith(404);
        expect(json).toHaveBeenCalledWith(expect.objectContaining({
            success: false,
            message: 'Resource not found'
        }));
    });

    // Test 4: MongoDB duplicate key error (code 11000) maps to 400
    it('should return 400 for MongoDB duplicate key error', () => {
        const err: any = new Error('E11000 duplicate key');
        err.code = 11000;

        errorHandler(err, req as Request, res as Response, next);

        expect(status).toHaveBeenCalledWith(400);
        expect(json).toHaveBeenCalledWith(expect.objectContaining({
            success: false,
            message: 'Duplicate field value entered'
        }));
    });

    // Test 5: Mongoose ValidationError maps to 400 with field messages
    it('should return 400 with combined field messages for ValidationError', () => {
        const err: any = new Error('Validation failed');
        err.name = 'ValidationError';
        err.errors = {
            email: { message: 'Email is required' },
            name: { message: 'Name is required' }
        };

        errorHandler(err, req as Request, res as Response, next);

        expect(status).toHaveBeenCalledWith(400);
        const responseBody = json.mock.calls[0][0] as any;
        expect(responseBody.success).toBe(false);
        expect(responseBody.message).toContain('Email is required');
        expect(responseBody.message).toContain('Name is required');
    });

    // Test 6: ZodError maps to 400 with formatted issue paths
    it('should return 400 for ZodError with formatted issue messages', () => {
        const err: any = new Error('Validation Error');
        err.name = 'ZodError';
        err.issues = [
            { path: ['body', 'email'], message: 'Invalid email' },
            { path: ['body', 'name'], message: 'Required' }
        ];

        errorHandler(err, req as Request, res as Response, next);

        expect(status).toHaveBeenCalledWith(400);
        const responseBody = json.mock.calls[0][0] as any;
        expect(responseBody.success).toBe(false);
        expect(responseBody.message).toContain('body.email: Invalid email');
        expect(responseBody.message).toContain('body.name: Required');
    });

    // Test 7: JWT JsonWebTokenError maps to 401
    it('should return 401 for JsonWebTokenError', () => {
        const err: any = new Error('invalid signature');
        err.name = 'JsonWebTokenError';

        errorHandler(err, req as Request, res as Response, next);

        expect(status).toHaveBeenCalledWith(401);
        expect(json).toHaveBeenCalledWith(expect.objectContaining({
            success: false,
            message: 'Invalid token. Please log in again.'
        }));
    });

    // Test 8: JWT TokenExpiredError maps to 401
    it('should return 401 for TokenExpiredError', () => {
        const err: any = new Error('jwt expired');
        err.name = 'TokenExpiredError';

        errorHandler(err, req as Request, res as Response, next);

        expect(status).toHaveBeenCalledWith(401);
        expect(json).toHaveBeenCalledWith(expect.objectContaining({
            success: false,
            message: 'Session expired. Please log in again.'
        }));
    });

    // Test 9: Stack trace is hidden in production
    it('should NOT include stack trace in production', () => {
        const err = new Error('Server Error');

        errorHandler(err as any, req as Request, res as Response, next);

        const responseBody = json.mock.calls[0][0] as any;
        expect(responseBody.stack).toBeUndefined();
    });

    // Test 10: Default message when error has no message
    it('should use "Server Error" when error message is empty', () => {
        const err: any = { statusCode: undefined, message: '', name: '' };

        errorHandler(err, req as Request, res as Response, next);

        expect(status).toHaveBeenCalledWith(500);
        expect(json).toHaveBeenCalledWith(expect.objectContaining({
            success: false,
            message: 'Server Error'
        }));
    });
});
