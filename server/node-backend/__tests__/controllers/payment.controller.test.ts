// payment.controller.test.ts
// Tests for payment checkout, webhook handling, and retry fulfillment

/// <reference types="jest" />
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { Request, Response } from 'express';
import { PaymentController } from '../../src/controllers/payment.controller';

// Mock payment service
jest.mock('../../src/services/payment.service', () => ({
    paymentService: {
        createCheckoutSession: jest.fn(),
        handleWebhook: jest.fn(),
        retryFulfillment: jest.fn()
    }
}));

// Mock User model
jest.mock('../../src/models/User', () => ({
    __esModule: true,
    default: {
        findById: jest.fn()
    }
}));

// Mock activity logger
jest.mock('../../src/middleware/activityLogger', () => ({
    logActivity: jest.fn(),
    buildMeta: jest.fn().mockReturnValue({})
}));

import { paymentService } from '../../src/services/payment.service';
import User from '../../src/models/User';

describe('Payment Controller', () => {
    let req: any;
    let res: any;
    let json: jest.Mock;
    let status: jest.Mock;
    let send: jest.Mock;

    beforeEach(() => {
        jest.clearAllMocks();
        jest.spyOn(console, 'error').mockImplementation(() => {});

        json = jest.fn();
        send = jest.fn();
        status = jest.fn().mockReturnValue({ json, send });
        req = {
            user: { id: 'user123' },
            params: {},
            body: {},
            ip: '127.0.0.1',
            get: jest.fn()
        };
        res = { status, json, send } as any;
    });

    // ========================================
    // createCheckout
    // ========================================
    describe('createCheckout', () => {

        // Test 1: Unauthenticated user
        it('should return 401 if user is not authenticated', async () => {
            req.user = undefined;

            await PaymentController.createCheckout(req, res);

            expect(status).toHaveBeenCalledWith(401);
            expect(json).toHaveBeenCalledWith({ error: 'Unauthorized' });
        });

        // Test 2: User not found in DB
        it('should return 404 if user not found in DB', async () => {
            (User.findById as any).mockResolvedValue(null);

            await PaymentController.createCheckout(req, res);

            expect(status).toHaveBeenCalledWith(404);
            expect(json).toHaveBeenCalledWith({ error: 'User not found' });
        });

        // Test 3: Successful checkout
        it('should return checkout URL on success', async () => {
            const mockUser = {
                _id: { toString: () => 'user123' },
                email: 'user@test.com',
                name: 'Test User'
            };
            (User.findById as any).mockResolvedValue(mockUser);
            (paymentService.createCheckoutSession as any).mockResolvedValue('https://checkout.lemonsqueezy.com/test');

            await PaymentController.createCheckout(req, res);

            expect(paymentService.createCheckoutSession).toHaveBeenCalledWith('user123', 'user@test.com');
            expect(status).toHaveBeenCalledWith(200);
            expect(json).toHaveBeenCalledWith({ url: 'https://checkout.lemonsqueezy.com/test' });
        });

        // Test 4: Service error
        it('should return 500 on payment service failure', async () => {
            const mockUser = { _id: { toString: () => 'user123' }, email: 'user@test.com' };
            (User.findById as any).mockResolvedValue(mockUser);
            (paymentService.createCheckoutSession as any).mockRejectedValue(new Error('LemonSqueezy API error'));

            await PaymentController.createCheckout(req, res);

            expect(status).toHaveBeenCalledWith(500);
            expect(json).toHaveBeenCalledWith({ error: 'Failed to initiate checkout' });
        });
    });

    // ========================================
    // handleWebhook
    // ========================================
    describe('handleWebhook', () => {

        // Test 5: Missing rawBody
        it('should return 400 if rawBody is missing', async () => {
            req.rawBody = undefined;
            req.body = {};
            (req.get as any).mockReturnValue('some-signature');

            await PaymentController.handleWebhook(req, res);

            expect(status).toHaveBeenCalledWith(400);
            expect(send).toHaveBeenCalledWith('Invalid request: Missing raw body');
        });

        // Test 6: Successful webhook processing
        it('should process webhook and return 200', async () => {
            req.rawBody = Buffer.from('{"test": true}');
            req.body = {
                meta: {
                    event_name: 'order_created',
                    custom_data: { user_id: 'user123' }
                },
                data: { id: 'order_456' }
            };
            (req.get as any).mockReturnValue('valid-signature');
            (paymentService.handleWebhook as any).mockResolvedValue(undefined);

            const mockUser = { _id: 'user123', name: 'Test User', email: 'test@test.com' };
            (User.findById as any).mockResolvedValue(mockUser);

            await PaymentController.handleWebhook(req, res);

            expect(paymentService.handleWebhook).toHaveBeenCalledWith(
                req.rawBody,
                'valid-signature',
                req.body
            );
            expect(status).toHaveBeenCalledWith(200);
            expect(send).toHaveBeenCalledWith('Webhook received');
        });

        // Test 7: Signature error returns 400
        it('should return 400 for signature verification failures', async () => {
            req.rawBody = Buffer.from('{}');
            req.body = {};
            (req.get as any).mockReturnValue('bad-signature');
            (paymentService.handleWebhook as any).mockRejectedValue(new Error('Invalid signature'));

            await PaymentController.handleWebhook(req, res);

            expect(status).toHaveBeenCalledWith(400);
            expect(send).toHaveBeenCalledWith('Webhook failed');
        });

        // Test 8: Non-signature error returns 500
        it('should return 500 for non-signature errors', async () => {
            req.rawBody = Buffer.from('{}');
            req.body = {};
            (req.get as any).mockReturnValue('sig');
            (paymentService.handleWebhook as any).mockRejectedValue(new Error('Database connection failed'));

            await PaymentController.handleWebhook(req, res);

            expect(status).toHaveBeenCalledWith(500);
            expect(send).toHaveBeenCalledWith('Webhook failed');
        });
    });

    // ========================================
    // retryFulfillment
    // ========================================
    describe('retryFulfillment', () => {

        // Test 9: Successful retry
        it('should retry fulfillment and return success', async () => {
            req.params = { transactionId: 'txn_123' };
            (paymentService.retryFulfillment as any).mockResolvedValue(undefined);

            await PaymentController.retryFulfillment(req, res);

            expect(paymentService.retryFulfillment).toHaveBeenCalledWith('txn_123');
            expect(status).toHaveBeenCalledWith(200);
            expect(json).toHaveBeenCalledWith({ message: 'Retry triggered successfully' });
        });

        // Test 10: Retry failure
        it('should return 500 on retry failure', async () => {
            req.params = { transactionId: 'txn_123' };
            (paymentService.retryFulfillment as any).mockRejectedValue(new Error('Transaction not found'));

            await PaymentController.retryFulfillment(req, res);

            expect(status).toHaveBeenCalledWith(500);
            expect(json).toHaveBeenCalledWith({ error: 'Transaction not found' });
        });
    });
});
