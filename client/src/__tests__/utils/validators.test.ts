// validators.test.ts
// Unit tests for utility validation functions (Checks email format, password strength/complexity and required fields)

import { describe, it, expect } from 'vitest';
import { validateEmail, validatePassword, validateName, validateConfirmPassword, validateTerms } from '../../utils/validators';

// Main test suite for validators
describe('Validators', () => {

    // Test suite for validateEmail function
    describe('validateEmail', () => {

        // Test 1: Validate empty email
        it('should return error for empty email', () => {
            const result = validateEmail('');
            expect(result.isValid).toBe(false);
            expect(result.error).toBe('Email is required');
        });

        // Test 2: Validate invalid email format
        it('should return error for invalid email format', () => {
            expect(validateEmail('invalid').isValid).toBe(false);
            expect(validateEmail('test@').isValid).toBe(false);
            expect(validateEmail('test@domain').isValid).toBe(false);
            expect(validateEmail('@domain.com').isValid).toBe(false);
        });

        // Test 3: Validate valid email format
        it('should return valid for correct email format', () => {
            expect(validateEmail('test@example.com').isValid).toBe(true);
            expect(validateEmail('user.name@domain.co.uk').isValid).toBe(true);
        });
    });

    // Test suite for validatePassword function
    describe('validatePassword', () => {

        // Test 1: Validate empty password
        it('should return error for empty password', () => {
            const result = validatePassword('');
            expect(result.isValid).toBe(false);
            expect(result.error).toBe('Password is required');
            expect(result.strength).toBe(0);
        });

        // Test 2: Validate password complexity
        it('should validate password complexity', () => {
            // Weak password (too short, no numbers/special)
            const weak = validatePassword('weak');
            expect(weak.isValid).toBe(false);
            expect(weak.error).toContain('8 characters');

            // Strong password
            const strong = validatePassword('StrongPass1!');
            expect(strong.isValid).toBe(true);
            expect(strong.strength).toBeGreaterThanOrEqual(4);
        });

        // Test 3: Validate password strength
        it('should calculate strength correctly', () => {
            // 1. Length >= 8
            // 2. Uppercase
            // 3. Lowercase
            // 4. Number
            // 5. Special char
            // "Pass1" -> Uppercase, Lowercase, Number (3 matches, length fail) -> Strength 3, but fails length requirement

            const result = validatePassword('Pass1');
            expect(result.isValid).toBe(false);
            // It has Uppercase, Lowercase, Number. Missing Length, Special. 
            // Strength logic in code: metRequirements count.
            // requirements: [length>=8, A-Z, a-z, 0-9, special]
            // "Pass1": length(F), A-Z(T), a-z(T), 0-9(T), special(F) -> strength 3
            expect(result.strength).toBe(3);
        });
    });

    // Test suite for validateName function
    describe('validateName', () => {

        // Test 1: Validate empty name
        it('should return error for empty name', () => {
            expect(validateName('').isValid).toBe(false);
        });

        // Test 2: Validate short name
        it('should return error for short name', () => {
            expect(validateName('A').isValid).toBe(false);
        });

        // Test 3: Validate invalid characters
        it('should return error for invalid characters', () => {
            expect(validateName('Name123').isValid).toBe(false);
        });

        // Test 4: Validate valid name
        it('should return valid for correct name', () => {
            expect(validateName('John Doe').isValid).toBe(true);
        });
    });

    // Test suite for validateConfirmPassword function
    describe('validateConfirmPassword', () => {

        // Test 1: Validate passwords do not match
        it('should return error when passwords do not match', () => {
            const result = validateConfirmPassword('password', 'different');
            expect(result.isValid).toBe(false);
            expect(result.error).toBe('Passwords do not match');
        });

        // Test 2: Validate passwords match
        it('should return valid when passwords match', () => {
            expect(validateConfirmPassword('password', 'password').isValid).toBe(true);
        });
    });

    // Test suite for validateTerms function
    describe('validateTerms', () => {

        // Test 1: Validate terms not accepted
        it('should return error when not accepted', () => {
            expect(validateTerms(false).isValid).toBe(false);
        });

        // Test 2: Validate terms accepted
        it('should return valid when accepted', () => {
            expect(validateTerms(true).isValid).toBe(true);
        });
    });
});
