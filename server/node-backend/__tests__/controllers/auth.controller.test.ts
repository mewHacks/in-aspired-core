// auth.controller.test.ts
// Test file for authentication logic (signup success, signup duplicate, login success, login failure)

/// <reference types="jest" />
// Tells TypeScript to include Jest's type definitions
// Enables autocomplete and type checking for Jest functions (e.g., describe, it, expect, jest.fn)
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { Request, Response } from 'express';
import * as authController from '../../src/controllers/auth.controller';
import User from '../../src/models/User';
import bcrypt from 'bcryptjs'; // password comparison
import jwt from 'jsonwebtoken'; // JWT token generation
import crypto from 'crypto'; // refresh token generation

// Jest module mocks
jest.mock('../../src/models/User');
jest.mock('bcryptjs');
jest.mock('jsonwebtoken');
jest.mock('../../src/middleware/activityLogger', () => ({
    logActivity: jest.fn().mockResolvedValue(undefined as never),
    buildMeta: jest.fn().mockReturnValue({})
}));
jest.mock('../../src/services/email.service', () => ({
    sendEmail: jest.fn().mockImplementation(() => Promise.resolve()),
    sendVerificationEmail: jest.fn().mockImplementation(() => Promise.resolve())
}));

// Partial mock for crypto

// Load the real crypto module (not strictly required here, but useful if needed)
const originalCrypto = jest.requireActual('crypto');

// Mock crypto.randomBytes function to return deterministic data for repeatable and predictable tests
jest.spyOn(crypto, 'randomBytes').mockImplementation((size: number) => {
    return Buffer.from('mock-random-bytes');
});

// Mock crypto.createHash function to avoid real hashing logic
jest.spyOn(crypto, 'createHash').mockReturnValue({
    update: jest.fn().mockReturnThis(), // Allows method chaining
    digest: jest.fn().mockReturnValue('mock-hash'), // Returns fake hashed token
} as any);

// Main test suite
describe('Auth Controller', () => {

    // Initialize reusable request/response mocks
    let req: Partial<Request>;
    let res: Partial<Response>;
    let json: jest.Mock;
    let status: jest.Mock;
    let cookie: jest.Mock;

    // Runs before each test
    beforeEach(() => {

        // Mock res.json()
        json = jest.fn();

        // Mock res.status()
        status = jest.fn().mockReturnValue({ json } as any);

        // Mock res.cookie()
        cookie = jest.fn();

        // Mock res.clearCookie()
        const clearCookie = jest.fn();

        // Mock Express request object
        req = {
            body: {}, // Filled per req
            ip: '127.0.0.1', // For logging
            headers: { 'user-agent': 'test-agent' },
            cookies: {}, // Initialize cookies
        };

        // Mock Express response object
        res = {
            status,
            json,
            cookie,
            clearCookie,
            locals: {},
        } as any;

        // Clear all previous mock calls and implementations
        jest.clearAllMocks();
    });

    // Test suite for signup route
    describe('signup', () => {

        // Test 1: Successful signup
        it('should register a new user successfully', async () => {

            // Simulate incoming signup request body
            req.body = { name: 'Test User', email: 'test@example.com', password: 'password123' };

            // Mock User.findOne to return null (no existing user)
            (User.findOne as any).mockResolvedValue(null);

            // Mock User.create to simulate successful user DB insert
            (User.create as any).mockResolvedValue({
                _id: 'user-id',
                name: 'Test User',
                email: 'test@example.com',
                role: 'user',
            });
            // Mock JWT signing to return a fake access token
            (jwt.sign as jest.Mock).mockReturnValue('mock-access-token');

            // Call the signup controller
            await authController.signup(req as Request, res as Response);

            // Verify email existence, user creation, token generation, HTTP 201 creation and success response
            expect(User.findOne).toHaveBeenCalledWith({ email: 'test@example.com' });
            expect(User.create).toHaveBeenCalled();
            expect(res.cookie).toHaveBeenCalledTimes(2); // Expect 2 cookies (access and refresh tokens)
            expect(res.status).toHaveBeenCalledWith(201);
            expect(json).toHaveBeenCalledWith(expect.objectContaining({
                message: 'Registration successful. Please check your email to verify your account before logging in.',
            }));
        });

        // Test 2: Email already exists
        it('should return 409 if email already exists', async () => {

            // Simulate incoming signup request body
            req.body = { name: 'Test User', email: 'test@example.com', password: 'password123' };

            // Mock User.findOne to return an existing user
            (User.findOne as any).mockResolvedValue({ _id: 'existing-id' });

            // Call the signup controller
            await authController.signup(req as Request, res as Response);

            // Expect HTTP 409 conflict and failed response
            expect(res.status).toHaveBeenCalledWith(409);
            expect(json).toHaveBeenCalledWith({ message: 'Email already registered' });
        });
    });

    // Test suite for login route
    describe('login', () => {

        // Test 1: Successful login
        it('should login successfully with correct credentials', async () => {

            // Simulate incoming login request body
            req.body = { email: 'test@example.com', password: 'password123' };

            // Mock user returned from DB
            const mockUser = {
                _id: 'user-id',
                name: 'Test User',
                email: 'test@example.com',
                password: 'hashed-password',
                isVerified: true,
                refreshTokens: [],
                save: jest.fn(), // Mock MongoDB save()
            };

            // Mock User.findOne to return the mock user from DB
            (User.findOne as any).mockResolvedValue(mockUser);

            // Mock bcrypt password comparison success
            (bcrypt.compare as any).mockResolvedValue(true);

            // Mock JWT signing to return a fake access token
            (jwt.sign as jest.Mock).mockReturnValue('mock-access-token');

            // Call the login controller
            await authController.login(req as Request, res as Response);

            // Verify password comparison, refresh token save to DB, request was not rejected (HTTP 401) and token generation
            expect(bcrypt.compare).toHaveBeenCalledWith('password123', 'hashed-password');
            expect(mockUser.save).toHaveBeenCalled(); // Should save refresh token
            expect(res.status).not.toHaveBeenCalledWith(401);
            expect(res.cookie).toHaveBeenCalledTimes(2); // Expect 2 cookies (access and refresh tokens)
        });

        // Test 2: Wrong password
        it('should return 401 for invalid credentials', async () => {

            // Simulate incoming login request body
            req.body = { email: 'test@example.com', password: 'wrongpassword' };

            // Mock user returned from DB
            const mockUser = {
                email: 'test@example.com',
                password: 'hashed-password',
                isVerified: true,
                loginAttempts: 0, // Track failed logins
                save: jest.fn(),
            };

            // Mock User.findOne to return the mock user from DB
            (User.findOne as any).mockResolvedValue(mockUser);

            // Mock bcrypt password comparison failure
            (bcrypt.compare as any).mockResolvedValue(false);

            // Call the login controller
            await authController.login(req as Request, res as Response);

            // Expect failed login (HTTP 401), failed response, failed login attempt to be saved and login attempt count incremented
            expect(res.status).toHaveBeenCalledWith(401);
            expect(json).toHaveBeenCalledWith({ message: 'Invalid credentials' });
            expect(mockUser.save).toHaveBeenCalled(); // Should save failed attempt
            expect(mockUser.loginAttempts).toBe(1);
        });
    });
    // Test suite for password reset
    describe('Password Reset', () => {

        // Test suite for forgotPassword
        describe('forgotPassword', () => {

            // Test 1: Send email if user exists
            it('should send an email if user exists', async () => {
                req.body = { email: 'test@example.com' };
                const mockUser = {
                    _id: { toString: () => 'user-id' },
                    email: 'test@example.com',
                    save: jest.fn(),
                };
                (User.findOne as any).mockResolvedValue(mockUser);
                const { sendEmail: sendEmailMock } = require('../../src/services/email.service');
                (sendEmailMock as jest.Mock).mockResolvedValue(undefined as never);

                await authController.forgotPassword(req as Request, res as Response);

                expect(User.findOne).toHaveBeenCalledWith({ email: 'test@example.com' });
                expect(mockUser.save).toHaveBeenCalled(); // Should save reset token
                expect(sendEmailMock).toHaveBeenCalled();
                expect(res.status).toHaveBeenCalledWith(200);
            });

            // Test 2: Return 404 if user does not exist
            it('should return 404 if user does not exist', async () => {
                req.body = { email: 'nonexistent@example.com' };
                (User.findOne as any).mockResolvedValue(null);

                await authController.forgotPassword(req as Request, res as Response);

                expect(res.status).toHaveBeenCalledWith(404);
                expect(json).toHaveBeenCalledWith({ message: 'User not found' });
            });
        });

        // Test suite for resetPassword
        describe('resetPassword', () => {
            const mockToken = 'valid-token';
            const mockHash = 'mock-hash'; // based on our crypto spy

            // Test 1: Reset password with valid token
            it('should reset password with valid token', async () => {
                req.params = { resettoken: mockToken };
                req.body = { password: 'newpassword123' };

                const mockUser = {
                    _id: { toString: () => 'user-id' },
                    save: jest.fn(),
                    authProvider: 'local'
                };
                (User.findOne as any).mockResolvedValue(mockUser);

                await authController.resetPassword(req as Request, res as Response);

                expect(User.findOne).toHaveBeenCalledWith(expect.objectContaining({
                    resetPasswordToken: expect.stringMatching(/mock-hash|[a-f0-9]{64}/)
                }));
                expect(mockUser.save).toHaveBeenCalled();
                expect(res.status).toHaveBeenCalledWith(200);
            });

            // Test 2: Return 400 for invalid/expired token
            it('should return 400 for invalid/expired token', async () => {
                req.params = { resettoken: 'invalid-token' };
                req.body = { password: 'newpassword123' };
                (User.findOne as any).mockResolvedValue(null); // No user found with this token

                await authController.resetPassword(req as Request, res as Response);

                expect(res.status).toHaveBeenCalledWith(400);
                expect(json).toHaveBeenCalledWith({ message: 'Invalid token' });
            });

            // Test 3: Reject reset for Google auth users
            it('should reject reset for Google auth users', async () => {
                req.params = { resettoken: mockToken };
                const mockUser = {
                    authProvider: 'google',
                    save: jest.fn()
                };
                (User.findOne as any).mockResolvedValue(mockUser);

                await authController.resetPassword(req as Request, res as Response);

                expect(res.status).toHaveBeenCalledWith(400);
                expect(json).toHaveBeenCalledWith({ message: 'This account uses Google login. Password reset is not available.' });
            });
        }); // Close resetPassword describe

        // Test suite for Google Login
        describe('Google Login', () => {
            const mockVerifiedPayload = {
                sub: 'google-id-123',
                email: 'google@example.com',
                name: 'Google User',
                picture: 'http://avatar.url',
                email_verified: true
            };

            beforeEach(() => {
                // Mock global fetch for Google API
                global.fetch = jest.fn() as any;
            });

            // Test 1: Login existing Google user successfully
            it('should login existing Google user successfully', async () => {
                req.body = { token: 'valid-google-token' };

                // Mock Google API success
                (global.fetch as any).mockResolvedValue({
                    ok: true,
                    json: async () => mockVerifiedPayload
                });

                // Mock DB finding existing user
                const mockUser = {
                    _id: 'user-id',
                    name: 'Google User',
                    email: 'google@example.com',
                    authProvider: 'google',
                    save: jest.fn(),
                    refreshTokens: []
                };
                (User.findOne as any).mockResolvedValue(mockUser);
                (jwt.sign as jest.Mock).mockReturnValue('mock-access-token');

                await authController.googleLogin(req as Request, res as Response);

                expect(global.fetch).toHaveBeenCalledWith('https://www.googleapis.com/oauth2/v3/userinfo', expect.any(Object));
                expect(mockUser.save).toHaveBeenCalled();
                expect(res.cookie).toHaveBeenCalledTimes(2);
                expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                    message: 'Google login successful'
                }));
            });

            // Test 2: Create new user if not found
            it('should create new user if not found', async () => {
                req.body = { token: 'valid-google-token' };

                // Mock Google API success
                (global.fetch as any).mockResolvedValue({
                    ok: true,
                    json: async () => mockVerifiedPayload
                });

                // Mock DB not finding user
                (User.findOne as any).mockResolvedValue(null);

                // Mock User.create
                const newUser = {
                    _id: 'new-id',
                    email: 'google@example.com',
                    role: 'student',
                    save: jest.fn()
                };
                (User.create as any).mockResolvedValue(newUser);

                await authController.googleLogin(req as Request, res as Response);

                expect(User.create).toHaveBeenCalledWith(expect.objectContaining({
                    email: 'google@example.com',
                    googleId: 'google-id-123',
                    authProvider: 'google'
                }));
                expect(res.status).toHaveBeenCalledWith(201);
            });

            // Test 3: Reject if email not verified by Google
            it('should reject if email not verified by Google', async () => {
                req.body = { token: 'valid-token' };
                (global.fetch as any).mockResolvedValue({
                    ok: true,
                    json: async () => ({ ...mockVerifiedPayload, email_verified: false })
                });

                await authController.googleLogin(req as Request, res as Response);

                expect(res.status).toHaveBeenCalledWith(400);
                expect(json).toHaveBeenCalledWith({ message: 'Email not verified by Google' });
            });

            // Test 4: Reject invalid token
            it('should reject invalid token', async () => {
                req.body = { token: 'invalid-token' };
                (global.fetch as any).mockResolvedValue({
                    ok: false
                });

                await authController.googleLogin(req as Request, res as Response);

                expect(res.status).toHaveBeenCalledWith(400);
                expect(json).toHaveBeenCalledWith({ message: 'Invalid access token' });
            });
        });

        // Test suite for Refresh Token
        describe('Refresh Token', () => {

            // Test 1: Refresh token successfully
            it('should refresh token successfully', async () => {

                // Mock cookies and user
                req.cookies = { refreshToken: 'valid-refresh-token' };
                const mockUser = {
                    _id: 'user-id',
                    email: 'test@example.com',
                    role: 'user',
                    refreshTokens: [{ token: 'mock-hash', expires: new Date(Date.now() + 10000) }], // mock-hash from our crypto spy
                    save: jest.fn()
                };
                (User.findOne as any).mockResolvedValue(mockUser);
                (jwt.sign as jest.Mock).mockReturnValue('new-access-token');

                await authController.refreshToken(req as Request, res as Response);

                expect(User.findOne).toHaveBeenCalled();
                expect(mockUser.save).toHaveBeenCalled();
                expect(res.cookie).toHaveBeenCalledTimes(2);
                expect(json).toHaveBeenCalledWith({ message: 'Token refreshed successfully' });
            });

            // Test 2: Return 401 if token is missing
            it('should return 401 if token is missing', async () => {
                req.cookies = {}; // No refresh token
                await authController.refreshToken(req as Request, res as Response);
                expect(res.status).toHaveBeenCalledWith(401);
            });

            // Test 3: Return 401 if token is invalid/expired
            it('should return 401 if token is invalid/expired', async () => {
                req.cookies = { refreshToken: 'bad-token' };
                (User.findOne as any).mockResolvedValue(null);
                await authController.refreshToken(req as Request, res as Response);
                expect(res.status).toHaveBeenCalledWith(401);
            });
        });

        // Test suite for Logout
        describe('Logout', () => {
            it('should logout successfully', async () => {
                req.cookies = { refreshToken: 'token-to-remove' };
                (User.findOneAndUpdate as any).mockResolvedValue({});
                // logout checks res.locals.userIdAfterLogin, ensure it's not set for this test
                (res as any).locals = {};

                await authController.logout(req as Request, res as Response);

                expect(User.findOneAndUpdate).toHaveBeenCalled();
                expect(res.clearCookie).toHaveBeenCalledTimes(2); // access and refresh
                expect(res.status).toHaveBeenCalledWith(200);
            });
        });
    });
});
