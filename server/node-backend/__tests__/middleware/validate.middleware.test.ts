// validate.middleware.test.ts
// Tests for Zod schema validation middleware: ensures invalid payloads are rejected before reaching controllers

/// <reference types="jest" />
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { Request, Response, NextFunction } from 'express';
import { validate } from '../../src/middleware/validate.middleware';
import { z } from 'zod';

describe('Validate Middleware', () => {
    let req: Partial<Request>;
    let res: Partial<Response>;
    let next: jest.Mock;

    beforeEach(() => {
        jest.clearAllMocks();

        req = {
            body: {},
            query: {},
            params: {}
        };
        res = {} as any;
        next = jest.fn();
    });

    // Test 1: Valid request body passes validation
    it('should call next() when body matches schema', async () => {
        const schema = z.object({
            body: z.object({
                email: z.string().email(),
                name: z.string().min(1)
            }),
            query: z.any(),
            params: z.any()
        });

        req.body = { email: 'test@example.com', name: 'John' };

        const middleware = validate(schema);
        await middleware(req as Request, res as Response, next as NextFunction);

        expect(next).toHaveBeenCalledTimes(1);
        // next() should be called with no arguments (not an error)
        expect(next).toHaveBeenCalledWith();
    });

    // Test 2: Invalid body calls next(error) — error is forwarded to error handler
    it('should call next(error) when body fails validation', async () => {
        const schema = z.object({
            body: z.object({
                email: z.string().email(),
                name: z.string().min(1)
            }),
            query: z.any(),
            params: z.any()
        });

        req.body = { email: 'not-an-email', name: '' };

        const middleware = validate(schema);
        await middleware(req as Request, res as Response, next as NextFunction);

        // next should be called with the ZodError
        expect(next).toHaveBeenCalledTimes(1);
        const errorArg = next.mock.calls[0][0] as any;
        expect(errorArg).toBeDefined();
        expect(errorArg.name).toBe('ZodError');
    });

    // Test 3: Validates query parameters
    it('should validate query parameters', async () => {
        const schema = z.object({
            body: z.any(),
            query: z.object({
                page: z.string().regex(/^\d+$/)
            }),
            params: z.any()
        });

        req.query = { page: 'abc' }; // Invalid — not a digit string

        const middleware = validate(schema);
        await middleware(req as Request, res as Response, next as NextFunction);

        expect(next).toHaveBeenCalledTimes(1);
        const errorArg = next.mock.calls[0][0] as any;
        expect(errorArg).toBeDefined();
        expect(errorArg.name).toBe('ZodError');
    });

    // Test 4: Validates route params
    it('should validate route params', async () => {
        const schema = z.object({
            body: z.any(),
            query: z.any(),
            params: z.object({
                id: z.string().min(1)
            })
        });

        req.params = { id: '' }; // Invalid — empty string

        const middleware = validate(schema);
        await middleware(req as Request, res as Response, next as NextFunction);

        expect(next).toHaveBeenCalledTimes(1);
        const errorArg = next.mock.calls[0][0] as any;
        expect(errorArg).toBeDefined();
        expect(errorArg.name).toBe('ZodError');
    });

    // Test 5: Valid query and params pass through
    it('should pass when all fields are valid', async () => {
        const schema = z.object({
            body: z.object({
                message: z.string().min(5)
            }),
            query: z.object({
                limit: z.string().optional()
            }),
            params: z.object({
                id: z.string().min(1)
            })
        });

        req.body = { message: 'Hello World' };
        req.query = { limit: '10' };
        req.params = { id: 'abc123' };

        const middleware = validate(schema);
        await middleware(req as Request, res as Response, next as NextFunction);

        expect(next).toHaveBeenCalledTimes(1);
        expect(next).toHaveBeenCalledWith();
    });
});
