import dotenv from 'dotenv';
import path from 'path';

// Load .env file
dotenv.config();

// Helper to ensure an environment variable is present.
// If fallback is provided, use it. Otherwise, throw an error.
function getEnv(key: string, fallback?: string): string {
    const value = process.env[key];
    if (value === undefined) {
        if (fallback !== undefined) {
            return fallback;
        }
        throw new Error(`Critical Error: Environment variable ${key} is missing.`);
    }
    return value;
}

// Helper to ensure an environment variable is parsed as a number.
function getEnvNumber(key: string, fallback?: number): number {
    const value = process.env[key];
    if (value === undefined) {
        if (fallback !== undefined) {
            return fallback;
        }
        throw new Error(`Critical Error: Environment variable ${key} is missing.`);
    }
    const parsed = parseInt(value, 10);
    if (isNaN(parsed)) {
        throw new Error(`Critical Error: Environment variable ${key} must be a number.`);
    }
    return parsed;
}

// Define Official Email constant for reuse
const OFFICIAL_EMAIL = getEnv('OFFICIAL_EMAIL', 'inaspired.official@gmail.com');

// Export typed configuration
export const CONFIG = {
    // Server
    PORT: getEnvNumber('PORT', 5000),
    NODE_ENV: getEnv('NODE_ENV', 'development'),

    // Database
    MONGODB_URI: getEnv('MONGODB_URI'),

    // Redis (for socket state durability + Socket.IO adapter)
    REDIS_URL: getEnv('REDIS_URL', 'redis://localhost:6379'),

    // Security
    JWT_SECRET: getEnv('JWT_SECRET'),
    TWO_FACTOR_ENCRYPTION_KEY: getEnv('TWO_FACTOR_ENCRYPTION_KEY'),

    // External Services
    CLIENT_URL: getEnv('CLIENT_URL', 'http://localhost:5173'),

    // Email for Password Reset (Optional / Fallback)
    SMTP: {
        SERVICE: process.env.SMTP_SERVICE, // Optional
        HOST: getEnv('SMTP_HOST', 'sandbox.smtp.mailtrap.io'),
        PORT: getEnvNumber('SMTP_PORT', 2525),
        USER: getEnv('SMTP_USER', ''),
        PASS: getEnv('SMTP_PASS', ''),
        FROM_EMAIL: getEnv('SMTP_FROM_EMAIL', '"In-Aspired" <inaspired.official@gmail.com>')
    },

    // Email for Contact Us
    OFFICIAL_EMAIL,

    // Gemini API Key
    GEMINI_API_KEY: getEnv('GEMINI_API_KEY', ''), // Default to empty to prevent crash

    // Web Push (VAPID)
    VAPID_PUBLIC_KEY: getEnv('VAPID_PUBLIC_KEY', ''),
    VAPID_PRIVATE_KEY: getEnv('VAPID_PRIVATE_KEY', ''),
    VAPID_SUBJECT: getEnv('VAPID_SUBJECT', `mailto:${OFFICIAL_EMAIL}`),

    // LemonSqueezy (Payments)
    LEMONSQUEEZY: {
        STORE_ID: getEnv('LEMONSQUEEZY_STORE_ID', ''),
        VARIANT_ID: getEnv('LEMONSQUEEZY_VARIANT_ID', ''),
        API_KEY: getEnv('LEMONSQUEEZY_API_KEY', ''),
        WEBHOOK_SECRET: getEnv('LEMONSQUEEZY_WEBHOOK_SECRET', '')
    }
};
