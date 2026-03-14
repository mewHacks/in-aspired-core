// contact.routes.ts — Contact form submission routes with rate limiting.

import { Router } from "express";
import { submitContactForm } from "../controllers/contact.controller";
import { contactRateLimiter } from "../middleware/rateLimiter.middleware";

// Initialize router
const router = Router();

// Apply strict rate limiting to this route
/**
 * @swagger
 * /api/contact:
 *   post:
 *     summary: Submit contact form
 *     tags: [Contact]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - message
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               subject:
 *                 type: string
 *               message:
 *                 type: string
 *     responses:
 *       200:
 *         description: Email sent
 */
router.post("/", contactRateLimiter, submitContactForm);

// Export router
export default router;
