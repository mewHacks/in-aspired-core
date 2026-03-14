// Encrypts and decrypts 2FA secrets using AES-256-GCM (detects tampering and avoids silent alters)
// Supports CIA, and together they serve Authenticated Encryption with Associated Data (AEAD)

import crypto from 'crypto';
import { CONFIG } from '../config/env';

// Get master encryption key from environment variable
const ENCRYPTION_KEY = CONFIG.TWO_FACTOR_ENCRYPTION_KEY;

// Decode base64 key to raw bytes
const KEY = Buffer.from(ENCRYPTION_KEY, 'base64');

// Validate key length, expects 256 bits (32 bytes) key
if (KEY.length !== 32) {
    throw new Error('Encryption key must be 32 bytes (base64)');
}

// Initialize GCM parameters
const IV_LENGTH = 12; // Random per encryption, unique per key
const AUTH_TAG_LENGTH = 16;

// Encrypts text using AES-256-GCM
export const encrypt = (text: string): string => {

    if (!text) {
        return '';
    }

    const iv = crypto.randomBytes(IV_LENGTH); // Generate fresh IV
    const cipher = crypto.createCipheriv('aes-256-gcm', KEY, iv); // Create AES-256 in GCM mode with key + IV

    // Encrypt text
    const encrypted = Buffer.concat([
        cipher.update(text, 'utf8'), // Encrypts data chunks
        cipher.final() // Flushes remaining bytes
    ]);

    // Get authentication tag which acts as a cryptographic checksum
    const authTag = cipher.getAuthTag();

    // Store iv : authTag : ciphertext
    return [
        iv.toString('base64'), // For decryption
        authTag.toString('base64'), // For integrity
        encrypted.toString('base64') // Encrypted data
    ].join(':');
};

// Decrypts text using AES-256-GCM
export const decrypt = (payload: string): string => {

    if (!payload) {
        return '';
    }

    // Extract and split payload into IV, auth tag and ciphertext
    const [ivB64, authTagB64, encryptedB64] = payload.split(':');

    // Validate payload in case any part is missing
    if (!ivB64 || !authTagB64 || !encryptedB64) {
        throw new Error('Invalid encrypted payload format');
    }

    // Convert stored base64 strings to raw bytes
    const iv = Buffer.from(ivB64, 'base64');
    const authTag = Buffer.from(authTagB64, 'base64');
    const encryptedText = Buffer.from(encryptedB64, 'base64');

    // Create decipher with the same algorithm, key and IV
    const decipher = crypto.createDecipheriv('aes-256-gcm', KEY, iv);

    // Validate against the stored auth tag
    decipher.setAuthTag(authTag);

    // Decrypt text
    const decrypted = Buffer.concat([
        decipher.update(encryptedText),
        decipher.final()
    ]);

    // Safely return original text
    return decrypted.toString('utf8');
};
