// rateLimiter.middleware.test.ts
// Tests for rate limiters identifying abuse prevention logic

/// <reference types="jest" />
import { authRateLimiter, contactRateLimiter } from '../../src/middleware/rateLimiter.middleware';
import { describe, it, expect } from '@jest/globals';

describe('Rate Limiter Middleware', () => {
    type MockReq = {
        ip: string;
        method: string;
        originalUrl: string;
        headers: Record<string, string>;
    };

    type MockRes = {
        statusCode: number;
        body: any;
        finished: boolean;
        setHeader: (key: string, value: string) => void;
        status: (code: number) => MockRes;
        json: (payload: any) => MockRes;
        send: (payload: any) => MockRes;
        sendStatus: (code: number) => MockRes;
    };

    const createReq = (overrides: Partial<MockReq> = {}): MockReq => ({
        ip: '127.0.0.1',
        method: 'GET',
        originalUrl: '/test',
        headers: {},
        ...overrides
    });

    const createRes = (): MockRes => {
        const res: MockRes = {
            statusCode: 200,
            body: undefined,
            finished: false,
            setHeader: () => { },
            status(code: number) {
                res.statusCode = code;
                return res;
            },
            json(payload: any) {
                res.body = payload;
                res.finished = true;
                return res;
            },
            send(payload: any) {
                res.body = payload;
                res.finished = true;
                return res;
            },
            sendStatus(code: number) {
                res.status(code);
                res.finished = true;
                return res;
            }
        };
        return res;
    };

    const runMiddleware = async (mw: any, reqOverrides: Partial<MockReq> = {}) => {
        const req = createReq(reqOverrides);
        const res = createRes();
        let resolved = false;

        return await new Promise<{ status: number; body: any; nextCalled: boolean }>((resolve) => {
            const next = () => {
                if (!resolved) {
                    resolved = true;
                    resolve({ status: res.statusCode, body: res.body, nextCalled: true });
                }
            };

            Promise.resolve(mw(req, res, next)).then(() => {
                if (!resolved) {
                    resolved = true;
                    resolve({ status: res.statusCode, body: res.body, nextCalled: false });
                }
            });
        });
    };

    // Test 1: Auth Rate Limiter
    describe('authRateLimiter', () => {
        it('should allow requests within limit and block excess', async () => {
            // Max is 5. Send 5 valid requests.
            for (let i = 0; i < 5; i++) {
                const res = await runMiddleware(authRateLimiter);
                expect(res.status).toBe(200);
            }

            // 6th request should fail
            const blockedRes = await runMiddleware(authRateLimiter);
            expect(blockedRes.status).toBe(429); // Too Many Requests
            expect(blockedRes.body.message).toMatch(/too many attempts/i);
        });
    });

    // Test 2: Contact Rate Limiter
    describe('contactRateLimiter', () => {
        it('should allow requests within limit and block excess', async () => {
            // Max is 3. Send 3 valid requests.
            for (let i = 0; i < 3; i++) {
                const res = await runMiddleware(contactRateLimiter);
                expect(res.status).toBe(200);
            }

            // 4th request should fail
            const blockedRes = await runMiddleware(contactRateLimiter);
            expect(blockedRes.status).toBe(429);
            expect(blockedRes.body.message).toMatch(/too many messages/i);
        });
    });
});
