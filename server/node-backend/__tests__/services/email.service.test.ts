// email.service.test.ts
// Tests for email service verifying nodemailer transport and send logic

/// <reference types="jest" />
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
// Define mocks starting with 'mock' to allow hoisting access
const mockSendMail = jest.fn();
const mockCreateTransport = jest.fn().mockReturnValue({
    sendMail: mockSendMail
});

// Mock nodemailer with proper default export structure for hoisting
jest.mock('nodemailer', () => ({
    __esModule: true,
    default: {
        createTransport: mockCreateTransport
    },
    createTransport: mockCreateTransport // Fallback for named imports
}));

import * as emailService from '../../src/services/email.service';

// Main test suite
describe('Email Service', () => {

    beforeEach(() => {
        // Clear mocks before each test
        jest.clearAllMocks();

        // Suppress console methods during test execution
        jest.spyOn(console, 'error').mockImplementation(() => { });
        jest.spyOn(console, 'log').mockImplementation(() => { });
    });

    // Test 1: Successful Email Send
    it('should send email successfully', async () => {
        // Mock successful send response
        (mockSendMail as any).mockResolvedValue({ messageId: '123' });

        const to = 'test@example.com';
        const subject = 'Test';
        const text = 'Body';

        // Call service
        const result = await emailService.sendEmail(to, subject, text);

        // Verify transport used with correct args
        expect(mockSendMail).toHaveBeenCalledWith(expect.objectContaining({
            to,
            subject,
            text
        }));
        expect(result).toHaveProperty('messageId', '123');
    });

    // Test 2: Error Handling
    it('should throw error if sending fails', async () => {
        // Mock failure
        (mockSendMail as any).mockRejectedValue(new Error('SMTP Error'));

        // Verify rejection
        await expect(emailService.sendEmail('to', 'sub', 'txt'))
            .rejects.toThrow('Email could not be sent');

        // Verify error logged
        expect(console.error).toHaveBeenCalled();
    });
});
