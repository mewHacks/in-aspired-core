// Backend Zod schemas for validation

import { z } from 'zod';

// Validate new user registration data
// Block malformed or weak input before it reaches controllers or database
export const signupSchema = z.object({
    body: z.object({
        name: z.string().trim().min(2, { message: "Name must be at least 2 characters" }),
        email: z.string().trim().email({ message: "Invalid email address" }),
        password: z
            .string()
            .min(8, { message: "Password must be at least 8 characters long" })
            .regex(/[a-zA-Z]/, { message: "Password must contain at least one letter" })
            .regex(/[0-9]/, { message: "Password must contain at least one number" }),
    }).strict(), // Strict mode to reject unexpected fields to prevent mass assignment vulnerabilities
});

// Validate login data
// Do not enforce password strength here, existing users may have older passwords
export const loginSchema = z.object({
    body: z.object({
        email: z.string().trim().email(),
        password: z.string().min(1, { message: "Password is required" }),
    }).strict(),
});

// Validate email data before initiating reset flow
// Prevent malformed reset requests
export const forgotPasswordSchema = z.object({
    body: z.object({
        email: z.string().trim().email({ message: "Invalid email address" }),
    }).strict(),
});

// Validate new password
// Ensure reset token exists in URL params
export const resetPasswordSchema = z.object({
    body: z.object({
        password: z.string().min(8, { message: "Password must be at least 8 characters" }),
    }).strict(),
    params: z.object({
        resettoken: z.string().min(40, { message: "Invalid token format" }), // Tokens are 40 chars hex strings
    }).strict(),
});

// Validate Google OAuth access token
// Do not verify token authenticity (done later)
export const googleLoginSchema = z.object({
    body: z.object({
        token: z.string().min(1, { message: "Google Access Token is required" })
    }).strict()
});

// Validate refresh token before issuing new access token
// Body is optional - refresh token comes from httpOnly cookie
export const refreshTokenSchema = z.object({
    body: z.object({
        token: z.string().optional()
    }).optional() // Allow empty body
});

// Ensure refresh token is provided for logout
// Body is optional - token comes from httpOnly cookie
export const logoutSchema = z.object({
    body: z.object({
        token: z.string().optional()
    }).optional() // Allow empty body
});
