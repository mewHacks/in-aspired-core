// payment.service.test.ts
// ============================================================================
// Test suite for payment.service.ts
// ============================================================================
// This file tests the PaymentService class which handles:
// - Creating checkout sessions with LemonSqueezy (payment provider)
// - Verifying webhook signatures (HMAC-SHA256) for security
// - Processing order_created events from LemonSqueezy
// - Fulfillment: generating PDF reports and emailing them to customers
// - Retry logic for failed fulfillments
//
// Key testing patterns:
// - Mocking axios for LemonSqueezy API calls
// - Mocking Transaction/User models for database operations
// - Generating valid HMAC signatures for webhook tests
// - Testing async fulfillment chains with setTimeout waits
// - Testing error scenarios (invalid signatures, missing config, API failures)
// ============================================================================

/// <reference types="jest" />
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import crypto from 'crypto';

// ============================================================================
// MOCK CONFIGURATION
// ============================================================================
// Mock config/env with full SMTP + LEMONSQUEEZY structure so transitive imports don't crash.
// Provides test values for all required config properties.
jest.mock('../../src/config/env', () => ({
    CONFIG: {
        LEMONSQUEEZY: {
            STORE_ID: 'store_123',
            VARIANT_ID: 'variant_456',
            API_KEY: 'test_api_key',
            WEBHOOK_SECRET: 'test_webhook_secret'
        },
        CLIENT_URL: 'http://localhost:3000',
        SMTP: {
            SERVICE: '',
            HOST: 'localhost',
            PORT: 587,
            USER: 'test',
            PASS: 'test',
            FROM: 'test@test.com'
        }
    }
}));

// ============================================================================
// EXTERNAL DEPENDENCY MOCKS
// ============================================================================
jest.mock('../../src/models/Transaction');    // Database model for transactions
jest.mock('../../src/models/User');           // User model for email lookups
jest.mock('axios');                           // HTTP client for LemonSqueezy API
jest.mock('../../src/services/pdf.service', () => ({
    // Mock pdfService - we don't test PDF generation itself, just that it's called
    pdfService: {
        generateReport: jest.fn()
    }
}));
// Mock email service - test that sendPremiumReport is called, not email delivery
jest.mock('../../src/services/email.service', () => {
    const fn = jest.fn();
    (fn as any).mockResolvedValue(undefined);
    return {
        sendEmail: fn,
        sendPremiumReport: fn
    };
});

// ============================================================================
// IMPORTS
// ============================================================================
import { PaymentService, paymentService } from '../../src/services/payment.service';
import Transaction from '../../src/models/Transaction';
import User from '../../src/models/User';
import axios from 'axios';
import { CONFIG } from '../../src/config/env';
import { pdfService } from '../../src/services/pdf.service';
import { sendPremiumReport } from '../../src/services/email.service';
import { TransactionStatus, FulfillmentStatus } from '../../src/models/Transaction';

// ============================================================================
// TEST HELPERS
// ============================================================================

/**
 * Generates a valid HMAC-SHA256 signature for a raw body using the test webhook secret.
 * This mimics how LemonSqueezy signs webhook payloads.
 * 
 * @param rawBody - The raw request body buffer
 * @param secret - The webhook secret from config
 * @returns Hex-encoded HMAC-SHA256 signature
 */
function generateSignature(rawBody: Buffer, secret: string): string {
    const hmac = crypto.createHmac('sha256', secret);
    return hmac.update(rawBody).digest('hex');
}

/**
 * Builds a minimal LemonSqueezy order_created webhook payload.
 * Used to create test payloads for webhook handling tests.
 * 
 * @param overrides - Optional field overrides for customization
 * @returns Mock webhook payload object
 */
function buildOrderPayload(overrides: {
    userId?: string;
    total?: number;
    currency?: string;
    identifier?: string;
    status?: string;
    eventName?: string;
} = {}) {
    return {
        meta: {
            event_name: overrides.eventName ?? 'order_created',
            custom_data: {
                user_id: overrides.userId ?? 'user_abc'
            }
        },
        data: {
            attributes: {
                total: overrides.total ?? 999,
                currency: overrides.currency ?? 'MYR',
                identifier: overrides.identifier ?? 'txn_001',
                status: overrides.status ?? 'paid'
            }
        }
    };
}

// ============================================================================
// TEST SUITE
// ============================================================================
describe('PaymentService', () => {
    let service: PaymentService;

    // Create fresh service instance before each test
    beforeEach(() => {
        jest.clearAllMocks();
        service = new PaymentService();
    });

    // ========================================================================
    // createCheckoutSession - Initialize payment flow
    // ========================================================================
    // Tests the checkout session creation with LemonSqueezy.
    // Creates a payment link that redirects users to complete purchase.
    // The checkout includes custom data (user_id) for webhook correlation.
    // ========================================================================
    describe('createCheckoutSession', () => {

        // Test: Successful API call - verifies correct payload and returns checkout URL
        // LemonSqueezy returns { data: { attributes: { url } } } on success
        it('should call LemonSqueezy API and return checkout URL', async () => {
            const mockUrl = 'https://checkout.lemonsqueezy.com/checkout/abc123';
            (axios.post as any).mockResolvedValue({
                data: {
                    data: {
                        attributes: { url: mockUrl }
                    }
                }
            });

            const result = await service.createCheckoutSession('user1', 'user@test.com');

            // Verify the API was called with correct endpoint and headers
            expect(axios.post).toHaveBeenCalledWith(
                'https://api.lemonsqueezy.com/v1/checkouts',
                expect.objectContaining({
                    data: expect.objectContaining({
                        type: 'checkouts',
                        attributes: expect.objectContaining({
                            checkout_data: expect.objectContaining({
                                email: 'user@test.com',
                                custom: { user_id: 'user1' }
                            })
                        })
                    })
                }),
                expect.objectContaining({
                    headers: expect.objectContaining({
                        'Authorization': 'Bearer test_api_key'
                    })
                })
            );
            expect(result).toBe(mockUrl);
        });

        // Test: Redirect URL - verifies user is redirected to correct page after payment
        // The redirect_url is where LemonSqueezy sends users after completion
        it('should include redirect URL pointing to client', async () => {
            (axios.post as any).mockResolvedValue({
                data: { data: { attributes: { url: 'https://example.com' } } }
            });

            await service.createCheckoutSession('user1', 'user@test.com');

            const callArgs = (axios.post as any).mock.calls[0];
            const payload = callArgs[1];
            expect(payload.data.attributes.product_options.redirect_url).toBe(
                'http://localhost:3000/payment/success'
            );
        });

        // Test: Missing credentials - graceful fallback when env vars not set
        // Prevents crash in development without LemonSqueezy configured
        it('should return mock URL when LS credentials are missing', async () => {
            // Temporarily override CONFIG for this test
            const originalLS = CONFIG.LEMONSQUEEZY;
            (CONFIG as any).LEMONSQUEEZY = { STORE_ID: '', VARIANT_ID: '', API_KEY: '' };

            const result = await service.createCheckoutSession('user1', 'user@test.com');

            expect(result).toBe('https://lemonsqueezy.com/checkout/mock-url-for-testing');
            expect(axios.post).not.toHaveBeenCalled();

            // Restore original config
            (CONFIG as any).LEMONSQUEEZY = originalLS;
        });

        // Test: API failure - proper error handling when LemonSqueezy is down
        // Wraps API errors into user-friendly message
        it('should throw when LemonSqueezy API fails', async () => {
            (axios.post as any).mockRejectedValue(new Error('Network error'));

            await expect(service.createCheckoutSession('user1', 'user@test.com'))
                .rejects.toThrow('Payment initialization failed');
        });
    });

    // ========================================================================
    // handleWebhook — Signature Verification
    // ========================================================================
    // Tests webhook security: HMAC-SHA256 signature verification.
    // Webhooks must be verified to prevent spoofed payment events.
    // Uses timingSafeEqual to prevent timing attacks.
    // ========================================================================
    describe('handleWebhook — signature verification', () => {

        // Test: Valid signature - accepts properly signed webhook
        // The signature is generated using the same secret as the server
        it('should accept valid HMAC signature', async () => {
            const payload = buildOrderPayload();
            const rawBody = Buffer.from(JSON.stringify(payload));
            const sig = generateSignature(rawBody, 'test_webhook_secret');

            // Mock Transaction.findOne for idempotency check (no existing transaction)
            (Transaction.findOne as any).mockResolvedValue(null);
            // Mock Transaction constructor and save
            const mockSave = (jest.fn() as any).mockResolvedValue(undefined);
            (Transaction as any).mockImplementation(() => ({
                _id: 'txn_mock_id',
                status: TransactionStatus.COMPLETED,
                userId: 'user_abc',
                save: mockSave
            }));
            (Transaction.findByIdAndUpdate as any).mockResolvedValue(undefined);
            // Mock pdfService to resolve immediately so .then chain runs
            (pdfService.generateReport as any).mockResolvedValue(Buffer.from('pdf'));
            (User.findById as any).mockResolvedValue({ email: 'test@test.com', name: 'Test' });

            // Should not throw - signature is valid
            await expect(
                service.handleWebhook(rawBody, sig, payload)
            ).resolves.toBeUndefined();
        });

        // Test: Invalid signature - rejects tampered or forged webhooks
        // Security: Must reject any request with invalid signature
        it('should reject invalid HMAC signature', async () => {
            const payload = buildOrderPayload();
            const rawBody = Buffer.from(JSON.stringify(payload));

            await expect(
                service.handleWebhook(rawBody, 'invalid_signature', payload)
            ).rejects.toThrow('Invalid signature');
        });

        // Test: Missing secret - strict mode rejects when secret not configured
        // This prevents potential security issues from misconfiguration
        it('should reject when webhook secret is missing from config', async () => {
            const originalLS = CONFIG.LEMONSQUEEZY;
            (CONFIG as any).LEMONSQUEEZY = { ...originalLS, WEBHOOK_SECRET: '' };

            const payload = buildOrderPayload();
            const rawBody = Buffer.from(JSON.stringify(payload));

            await expect(
                service.handleWebhook(rawBody, 'any_sig', payload)
            ).rejects.toThrow('Server misconfiguration: Missing Webhook Secret');

            (CONFIG as any).LEMONSQUEEZY = originalLS;
        });
    });

    // ========================================================================
    // handleWebhook — Order Processing
    // ========================================================================
    // Tests the core order processing logic after signature verification.
    // Handles idempotency, transaction creation, and async fulfillment.
    // ========================================================================
    describe('handleWebhook — order processing', () => {

        /**
         * Helper function: calls handleWebhook with a valid signature for the given payload.
         * Reduces boilerplate in tests that need valid signatures.
         */
        async function callWebhookWithPayload(payload: any) {
            const rawBody = Buffer.from(JSON.stringify(payload));
            const sig = generateSignature(rawBody, 'test_webhook_secret');
            return service.handleWebhook(rawBody, sig, payload);
        }

        // Test: Idempotency - prevents duplicate processing of same transaction
        // LemonSqueezy may retry webhooks, we must not double-charge/email
        it('should skip duplicate transactions (idempotency)', async () => {
            const payload = buildOrderPayload({ identifier: 'txn_existing' });
            (Transaction.findOne as any).mockResolvedValue({ _id: 'existing' });

            await callWebhookWithPayload(payload);

            // Should NOT create a new Transaction - already processed
            expect(Transaction).not.toHaveBeenCalled();
        });

        // Test: Missing user_id - safety check prevents fulfillment without user
        // Webhooks without user_id cannot be delivered - skip processing
        it('should skip when userId is missing from custom_data', async () => {
            const payload = {
                meta: { event_name: 'order_created', custom_data: {} },
                data: { attributes: { total: 999, currency: 'MYR', identifier: 'txn_no_user', status: 'paid' } }
            };
            (Transaction.findOne as any).mockResolvedValue(null);

            await callWebhookWithPayload(payload);

            // Should NOT create a transaction when userId is missing
            expect(Transaction).not.toHaveBeenCalled();
        });

        // Test: Paid order - creates COMPLETED transaction for successful payments
        // Status 'paid' means payment was successful
        it('should create COMPLETED transaction for paid orders', async () => {
            const payload = buildOrderPayload({ status: 'paid', identifier: 'txn_new' });
            (Transaction.findOne as any).mockResolvedValue(null);

            const mockSave = (jest.fn() as any).mockResolvedValue(undefined);
            (Transaction as any).mockImplementation((data: any) => ({
                ...data,
                _id: 'txn_id_new',
                status: data.status,
                userId: 'user_abc',
                save: mockSave
            }));
            (Transaction.findByIdAndUpdate as any).mockResolvedValue(undefined);
            (pdfService.generateReport as any).mockResolvedValue(Buffer.from('pdf'));
            (User.findById as any).mockResolvedValue({ email: 'test@test.com', name: 'Test' });

            await callWebhookWithPayload(payload);

            expect(Transaction).toHaveBeenCalledWith(expect.objectContaining({
                userId: 'user_abc',
                provider: 'lemonsqueezy',
                providerTransactionId: 'txn_new',
                amount: 999,
                currency: 'MYR',
                status: TransactionStatus.COMPLETED,
                fulfillmentStatus: FulfillmentStatus.PENDING,
                productId: 'full_report_v1'
            }));
            expect(mockSave).toHaveBeenCalled();
        });

        // Test: Pending order - creates PENDING transaction for auth/pending payments
        // Payment not yet confirmed - wait for future webhook
        it('should create PENDING transaction for non-paid orders', async () => {
            const payload = buildOrderPayload({ status: 'pending', identifier: 'txn_pending' });
            (Transaction.findOne as any).mockResolvedValue(null);

            const mockSave = (jest.fn() as any).mockResolvedValue(undefined);
            (Transaction as any).mockImplementation((data: any) => ({
                ...data,
                _id: 'txn_id_pending',
                status: data.status,
                userId: 'user_abc',
                save: mockSave
            }));

            await callWebhookWithPayload(payload);

            expect(Transaction).toHaveBeenCalledWith(expect.objectContaining({
                status: TransactionStatus.PENDING
            }));
        });

        // Test: Non-order events - ignores events we don't handle
        // Only order_created triggers fulfillment; others are logged but skipped
        it('should ignore non-order_created events', async () => {
            const payload = buildOrderPayload({ eventName: 'subscription_updated' });
            // Need to mock findOne for the idempotency check that happens AFTER event routing
            // But for non-order_created events, handleOrderCreated is never called
            // The only thing that runs is signature verification + event check

            await callWebhookWithPayload(payload);

            // Transaction should not be created for non-order events
            expect(Transaction.findOne).not.toHaveBeenCalled();
        });

        // Test: PDF trigger - starts async fulfillment for completed orders
        // PDF generation happens in background to not block webhook response
        it('should trigger PDF generation for COMPLETED transactions', async () => {
            const payload = buildOrderPayload({ status: 'paid', identifier: 'txn_fulfill' });
            (Transaction.findOne as any).mockResolvedValue(null);

            const mockSave = (jest.fn() as any).mockResolvedValue(undefined);
            (Transaction as any).mockImplementation((data: any) => ({
                ...data,
                _id: 'txn_fulfill_id',
                status: TransactionStatus.COMPLETED,
                userId: 'user_abc',
                save: mockSave
            }));
            (Transaction.findByIdAndUpdate as any).mockResolvedValue(undefined);
            (pdfService.generateReport as any).mockResolvedValue(Buffer.from('pdf-data'));
            (User.findById as any).mockResolvedValue({ email: 'buyer@test.com', name: 'Buyer' });

            await callWebhookWithPayload(payload);

            // Wait for the async fulfillment chain to complete
            await new Promise(resolve => setTimeout(resolve, 50));

            // Verify PROCESSING status was set before PDF generation
            expect(Transaction.findByIdAndUpdate).toHaveBeenCalledWith(
                'txn_fulfill_id',
                { fulfillmentStatus: FulfillmentStatus.PROCESSING }
            );
            expect(pdfService.generateReport).toHaveBeenCalledWith('user_abc', 'txn_fulfill_id');
        });

        // Test: Email delivery - sends PDF to customer after generation
        // Combines PDF buffer with user info for email delivery
        it('should email PDF and mark DELIVERED on successful fulfillment', async () => {
            const payload = buildOrderPayload({ status: 'paid', identifier: 'txn_deliver' });
            (Transaction.findOne as any).mockResolvedValue(null);

            const pdfBuffer = Buffer.from('pdf-content');
            const mockSave = (jest.fn() as any).mockResolvedValue(undefined);
            (Transaction as any).mockImplementation((data: any) => ({
                ...data,
                _id: 'txn_deliver_id',
                status: TransactionStatus.COMPLETED,
                userId: 'user_abc',
                save: mockSave
            }));
            (Transaction.findByIdAndUpdate as any).mockResolvedValue(undefined);
            (pdfService.generateReport as any).mockResolvedValue(pdfBuffer);
            (User.findById as any).mockResolvedValue({ email: 'buyer@test.com', name: 'Buyer' });

            await callWebhookWithPayload(payload);
            // Wait for the async chain
            await new Promise(resolve => setTimeout(resolve, 50));

            expect(sendPremiumReport).toHaveBeenCalledWith(
                'buyer@test.com', 'Buyer', pdfBuffer, 'txn_deliver_id'
            );
            expect(Transaction.findByIdAndUpdate).toHaveBeenCalledWith(
                'txn_deliver_id',
                { fulfillmentStatus: FulfillmentStatus.DELIVERED }
            );
        });

        // Test: PDF failure - marks FAILED when PDF generation throws
        // Allows admin to retry later
        it('should mark FAILED when PDF generation fails', async () => {
            const payload = buildOrderPayload({ status: 'paid', identifier: 'txn_fail_pdf' });
            (Transaction.findOne as any).mockResolvedValue(null);

            const mockSave = (jest.fn() as any).mockResolvedValue(undefined);
            (Transaction as any).mockImplementation((data: any) => ({
                ...data,
                _id: 'txn_fail_id',
                status: TransactionStatus.COMPLETED,
                userId: 'user_abc',
                save: mockSave
            }));
            (Transaction.findByIdAndUpdate as any).mockResolvedValue(undefined);
            (pdfService.generateReport as any).mockRejectedValue(new Error('PDF engine crashed'));

            await callWebhookWithPayload(payload);
            await new Promise(resolve => setTimeout(resolve, 50));

            expect(Transaction.findByIdAndUpdate).toHaveBeenCalledWith(
                'txn_fail_id',
                { fulfillmentStatus: FulfillmentStatus.FAILED }
            );
        });

        // Test: User not found - marks FAILED when user no longer exists
        // Critical: cannot deliver without valid user record
        it('should mark FAILED when user not found for email delivery', async () => {
            const payload = buildOrderPayload({ status: 'paid', identifier: 'txn_no_user_email' });
            (Transaction.findOne as any).mockResolvedValue(null);

            const mockSave = (jest.fn() as any).mockResolvedValue(undefined);
            (Transaction as any).mockImplementation((data: any) => ({
                ...data,
                _id: 'txn_no_user_id',
                status: TransactionStatus.COMPLETED,
                userId: 'user_abc',
                save: mockSave
            }));
            (Transaction.findByIdAndUpdate as any).mockResolvedValue(undefined);
            (pdfService.generateReport as any).mockResolvedValue(Buffer.from('pdf'));
            (User.findById as any).mockResolvedValue(null); // User not found

            await callWebhookWithPayload(payload);
            await new Promise(resolve => setTimeout(resolve, 50));

            expect(Transaction.findByIdAndUpdate).toHaveBeenCalledWith(
                'txn_no_user_id',
                { fulfillmentStatus: FulfillmentStatus.FAILED }
            );
        });
    });

    // ========================================================================
    // retryFulfillment - Admin retry for failed fulfillments
    // ========================================================================
    // Tests the admin-facing retry functionality for failed transactions.
    // Allows manual retry of PDF generation and email delivery.
    // ========================================================================
    describe('retryFulfillment', () => {

        // Test: Not found - proper error when transaction ID is invalid
        it('should throw when transaction not found', async () => {
            (Transaction.findById as any).mockResolvedValue(null);

            await expect(service.retryFulfillment('missing_txn'))
                .rejects.toThrow('Transaction not found: missing_txn');
        });

        // Test: Already delivered - prevents duplicate delivery attempts
        // Don't retry already-successful fulfillments
        it('should throw when already delivered', async () => {
            (Transaction.findById as any).mockResolvedValue({
                _id: 'txn_delivered',
                fulfillmentStatus: FulfillmentStatus.DELIVERED,
                userId: 'user1'
            });

            await expect(service.retryFulfillment('txn_delivered'))
                .rejects.toThrow('Already delivered');
        });

        // Test: Retry process - sets PROCESSING and triggers PDF generation
        // Same flow as initial fulfillment but from failed state
        it('should set PROCESSING and trigger PDF generation', async () => {
            const mockTransaction = {
                _id: 'txn_retry',
                fulfillmentStatus: FulfillmentStatus.FAILED,
                userId: { toString: () => 'user_retry' }
            };
            (Transaction.findById as any).mockResolvedValue(mockTransaction);
            (Transaction.findByIdAndUpdate as any).mockResolvedValue(undefined);
            (pdfService.generateReport as any).mockResolvedValue(Buffer.from('pdf'));
            (User.findById as any).mockResolvedValue({ email: 'retry@test.com', name: 'Retry User' });

            await service.retryFulfillment('txn_retry');
            await new Promise(resolve => setTimeout(resolve, 50));

            expect(Transaction.findByIdAndUpdate).toHaveBeenCalledWith(
                'txn_retry',
                { fulfillmentStatus: FulfillmentStatus.PROCESSING }
            );
            expect(pdfService.generateReport).toHaveBeenCalledWith('user_retry', 'txn_retry');
        });

        // Test: Success on retry - marks DELIVERED after successful PDF + email
        it('should mark DELIVERED after successful retry', async () => {
            const mockTransaction = {
                _id: 'txn_retry_ok',
                fulfillmentStatus: FulfillmentStatus.FAILED,
                userId: { toString: () => 'user_retry_ok' }
            };
            (Transaction.findById as any).mockResolvedValue(mockTransaction);
            (Transaction.findByIdAndUpdate as any).mockResolvedValue(undefined);
            (pdfService.generateReport as any).mockResolvedValue(Buffer.from('pdf'));
            (User.findById as any).mockResolvedValue({ email: 'ok@test.com', name: 'OK' });

            await service.retryFulfillment('txn_retry_ok');
            await new Promise(resolve => setTimeout(resolve, 50));

            expect(sendPremiumReport).toHaveBeenCalledWith(
                'ok@test.com', 'OK', expect.any(Buffer), 'txn_retry_ok'
            );
            expect(Transaction.findByIdAndUpdate).toHaveBeenCalledWith(
                'txn_retry_ok',
                { fulfillmentStatus: FulfillmentStatus.DELIVERED }
            );
        });

        // Test: Retry failure - marks FAILED when retry also fails
        // Allows further retry attempts
        it('should mark FAILED when retry PDF generation fails', async () => {
            const mockTransaction = {
                _id: 'txn_retry_fail',
                fulfillmentStatus: FulfillmentStatus.FAILED,
                userId: { toString: () => 'user_retry_fail' }
            };
            (Transaction.findById as any).mockResolvedValue(mockTransaction);
            (Transaction.findByIdAndUpdate as any).mockResolvedValue(undefined);
            (pdfService.generateReport as any).mockRejectedValue(new Error('retry PDF failed'));

            await service.retryFulfillment('txn_retry_fail');
            await new Promise(resolve => setTimeout(resolve, 50));

            expect(Transaction.findByIdAndUpdate).toHaveBeenCalledWith(
                'txn_retry_fail',
                { fulfillmentStatus: FulfillmentStatus.FAILED }
            );
        });
    });

    // ========================================================================
    // Singleton verification
    // ========================================================================
    // Verifies the exported singleton instance is properly configured.
    // ============================================================================
    describe('paymentService singleton', () => {

        // Test: Instance check - ensures singleton is PaymentService instance
        it('should be an instance of PaymentService', () => {
            expect(paymentService).toBeInstanceOf(PaymentService);
        });
    });
});
