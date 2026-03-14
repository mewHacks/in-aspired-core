// contact.controller.test.ts
// Tests for contact form submission functionality

/// <reference types="jest" />
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { Request, Response } from 'express';
import * as contactController from '../../src/controllers/contact.controller';
import Contact from '../../src/models/Contact';
import { sendEmail } from '../../src/services/email.service';

// Mock xss and validator
// Using actual libraries for logic validation

// Mock Mongoose Model
jest.mock('../../src/models/Contact', () => {
    return {
        __esModule: true,
        default: jest.fn().mockImplementation(function (data: any) {
            console.log('Mock Constructor Data:', data);
            return {
                ...data,
                save: (jest.fn() as any).mockResolvedValue(data)
            };
        })
    };
});

// Mock Email Service
jest.mock('../../src/services/email.service', () => ({
    __esModule: true,
    sendEmail: jest.fn()
}));

// Mock Config
jest.mock('../../src/config/env', () => ({
    CONFIG: {
        OFFICIAL_EMAIL: 'official@test.com'
    }
}));

describe('Contact Controller', () => {

    // Initialize request, response, and mock functions
    let req: Partial<Request>;
    let res: Partial<Response>;
    let json: jest.Mock;
    let status: jest.Mock;

    beforeEach(() => {
        // Clear all mocks before each test
        jest.clearAllMocks();

        // Suppress console.error for expected failures
        jest.spyOn(console, 'error').mockImplementation(() => { });
        // jest.spyOn(console, 'log').mockImplementation(() => {});

        json = jest.fn();
        status = jest.fn(() => ({ json }));
        res = { status, json } as any;
        req = { body: {} };

        // Re-apply Mock Implementation due to resetMocks: true
        (Contact as unknown as jest.Mock).mockImplementation((data: any) => ({
            ...data,
            save: (jest.fn() as any).mockResolvedValue(data)
        }));
    });

    // ========================================
    // submitContactForm
    // Description: Verifies form validation, DB saving, and email sending
    // ========================================
    describe('submitContactForm', () => {
        const validData = {
            name: 'John Doe',
            email: 'john@example.com',
            topic: 'Sales',
            message: 'Hello World'
        };

        // Test 1: Missing Fields
        it('should return 400 if required fields are missing', async () => {
            req.body = { name: 'John' }; // Missing email/message

            await contactController.submitContactForm(req as Request, res as Response);

            expect(status).toHaveBeenCalledWith(400);
            expect(json).toHaveBeenCalledWith(expect.objectContaining({
                message: expect.stringContaining('required')
            }));
        });

        // Test 2: Invalid Email
        it('should return 400 if email is invalid', async () => {
            req.body = { ...validData, email: 'not-an-email' };

            await contactController.submitContactForm(req as Request, res as Response);

            expect(status).toHaveBeenCalledWith(400);
            expect(json).toHaveBeenCalledWith({ message: 'Invalid email address format.' });
        });

        // Test 3: Length Validation (Message too long)
        it('should return 400 if message exceeds limit', async () => {
            req.body = { ...validData, message: 'a'.repeat(2001) };

            await contactController.submitContactForm(req as Request, res as Response);

            expect(status).toHaveBeenCalledWith(400);
            expect(json).toHaveBeenCalledWith(expect.objectContaining({
                message: expect.stringContaining('Message is too long')
            }));
        });

        // Test 4: Successful Submission
        it('should save to DB and send email on valid input', async () => {
            req.body = validData;

            await contactController.submitContactForm(req as Request, res as Response);

            // Verify DB Save
            expect(Contact).toHaveBeenCalledWith(expect.objectContaining({
                name: 'John Doe',
                email: 'john@example.com',
                topic: 'Sales'
            }));

            // Verify Email Sent
            expect(sendEmail).toHaveBeenCalledWith(
                'official@test.com',
                expect.stringContaining('In-Aspired New Message'),
                expect.stringContaining('Hello World')
            );

            expect(status).toHaveBeenCalledWith(201);
        });

        // Test 5: DB/Email Error
        it('should return 500 if an error occurs', async () => {
            req.body = validData;

            // Mock email service to fail
            (sendEmail as any).mockRejectedValueOnce(new Error('SMTP Error'));

            await contactController.submitContactForm(req as Request, res as Response);

            expect(status).toHaveBeenCalledWith(500);
            expect(json).toHaveBeenCalledWith(expect.objectContaining({
                message: 'Server error. Please try again later.'
            }));
        });
    });
});
