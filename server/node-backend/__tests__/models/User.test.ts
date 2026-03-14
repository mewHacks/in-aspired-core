// User.test.ts
// Unit tests for the User Mongoose model
// Verifies schema validation, pre-save password hashing, unique email constraint,
// and toJSON transformation that strips sensitive fields (password, tokens, etc.)

import { describe, it, expect } from '@jest/globals';
import bcrypt from 'bcryptjs';
import User from '../../src/models/User';

// Helper — executes the Mongoose pre-save hooks on a document without persisting to DB
// This allows testing bcrypt hashing logic in isolation
const runPreSave = async (doc: any) => {
    await new Promise<void>((resolve, reject) => {
        (User.schema as any).s.hooks.execPre('save', doc, (err: unknown) => {
            if (err) {
                reject(err);
                return;
            }
            resolve();
        });
    });
};

// Main test suite for User model
describe('User Model', () => {

    // Test 1: Valid user data passes schema validation
    it('should create a user successfully', async () => {
        const userData = {
            name: 'Test User',
            email: 'test@example.com',
            password: 'password123',
            role: 'student'
        };
        const user = new User(userData);

        // validate() resolves without error for valid data
        await expect(user.validate()).resolves.toBeUndefined();
        expect(user.name).toBe(userData.name);
        expect(user.email).toBe(userData.email);
    });

    // Test 2: Pre-save hook hashes the password using bcrypt
    it('should hash the password before saving', async () => {
        const password = 'mysecretpassword';
        const user = new User({
            name: 'Hash Tester',
            email: 'hash@example.com',
            password,
            role: 'student'
        });

        // Run pre-save hooks (which call bcrypt.hash)
        await runPreSave(user);

        // Password should now be a bcrypt hash, not the plaintext value
        expect(user.password).toBeDefined();
        expect(user.password).not.toBe(password);
        const isMatch = await bcrypt.compare(password, user.password as string);
        expect(isMatch).toBe(true);
    });

    // Test 3: Pre-save hook skips hashing if password field was not modified
    it('should not re-hash password if not modified', async () => {
        const password = 'password123';
        const user = new User({
            name: 'Rehash Tester',
            email: 'rehash@example.com',
            password
        });

        // First save — password gets hashed
        await runPreSave(user);
        const initialHash = user.password as string;

        // Simulate Mongoose marking the password as unmodified (e.g. updating name only)
        user.isModified = () => false;
        await runPreSave(user);

        // Password hash should remain unchanged
        expect(user.password).toBe(initialHash);
    });

    // Test 4: Schema validation rejects documents missing required fields
    it('should fail validation if required fields are missing', async () => {
        const user = new User({});
        let err: any;
        try {
            await user.validate();
        } catch (error) {
            err = error;
        }

        // Both name and email are required — errors should exist for each
        expect(err).toBeDefined();
        expect(err.errors.name).toBeDefined();
        expect(err.errors.email).toBeDefined();
    });

    // Test 5: Email field has a unique index constraint in the schema
    it('should enforce unique email constraint in the schema', () => {
        const emailPath: any = User.schema.path('email');
        expect(emailPath.options.unique).toBe(true);
    });

    // Test 6: toJSON transform removes sensitive fields from API responses
    it('should transform toJSON correctly (remove password/sensitive fields)', () => {
        const user = new User({
            name: 'JSON Tester',
            email: 'json@example.com',
            password: 'password123',
            loginAttempts: 5,
            twoFactorSecret: 'secret',
            refreshTokens: [{ token: 'abc', expires: new Date(), createdAt: new Date() }]
        });

        const json: any = user.toJSON();

        // Sensitive fields must be stripped from the JSON output
        expect(json.password).toBeUndefined();
        expect(json.loginAttempts).toBeUndefined();
        expect(json.refreshTokens).toBeUndefined();
        expect(json.twoFactorSecret).toBeUndefined();
        // _id is converted to id by the toJSON virtuals
        expect(json._id).toBeUndefined();
        expect(json.id).toBeDefined();
    });
});
