// chat.routes.ts — AI chatbot conversation routes with rate limiting and authentication.

/**
 * chat.routes.ts
 * 
 * Defines the API endpoint for the chatbot feature.
 * Sets up routing and applies middleware for security.
 * 
 * Security:
 * 1. Rate Limiting - Prevents abuse of the free Gemini API tier
 * 2. Express Router - Isolates chat routes from rest of API
 * 3. Authentication - Requires user to be logged in
 */

import express from 'express';
import rateLimit from 'express-rate-limit';
import { authenticate } from '../middleware/auth.middleware';
import { handleChatMessage } from '../controllers/chat.controller';

// Initialize router
const router = express.Router();

// Configure rate limiter
const chatLimiter = rateLimit({
    windowMs: 60 * 1000,  // 1 minute window
    max: 10, // Max 10 requests per window per IP (Gemini free tier allows 15 requests/minute)
    message: { error: "Too many requests. Please wait a minute." }, // JSON error response
    standardHeaders: true, // Return rate limit info in RateLimit-* headers
    legacyHeaders: false, // Disable X-RateLimit-* headers
});

// Define route
/**
 * @swagger
 * /api/chat:
 *   post:
 *     summary: Send message to chatbot
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - message
 *             properties:
 *               message:
 *                 type: string
 *               conversationId:
 *                 type: string
 *     responses:
 *       200:
 *         description: AI response
 */
router.post('/', authenticate, chatLimiter, handleChatMessage);

// Export router
export default router;
