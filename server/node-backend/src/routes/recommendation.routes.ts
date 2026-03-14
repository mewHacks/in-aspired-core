// recommendation.routes.ts — RIASEC-based course and career recommendation routes.

import { Router } from 'express';
import { getRecommendations, saveResult, getLatestResult, getMatchingCareers } from '../controllers/recommendation.controller';
import { authenticate } from '../middleware/auth.middleware';

// Create router
const router = Router();

// Define routes
/**
 * @swagger
 * /api/recommend:
 *   post:
 *     summary: Calculate RIASEC affinity and get recommendations
 *     tags: [Recommendations]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - scores
 *             properties:
 *               scores:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     type:
 *                       type: string
 *                     score:
 *                       type: number
 *     responses:
 *       200:
 *         description: Recommendations calculated
 *       502:
 *         description: Calculation service failed
 */
router.post('/recommend', getRecommendations); // Get recommendations (Public or implicitly handled)
/**
 * @swagger
 * /api/save:
 *   post:
 *     summary: Save recommendation result
 *     tags: [Recommendations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - scores
 *               - topDomains
 *               - recommendedCourses
 *             properties:
 *               scores:
 *                 type: array
 *                 items: {}
 *               topDomains:
 *                 type: array
 *                 items: {}
 *               recommendedCourses:
 *                 type: array
 *                 items: {}
 *     responses:
 *       201:
 *         description: Result saved
 */
router.post('/save', authenticate, saveResult); // Save result (Protected)
/**
 * @swagger
 * /api/latest:
 *   get:
 *     summary: Get latest result for user
 *     tags: [Recommendations]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Latest result
 *       404:
 *         description: No result found
 */
router.get('/latest', authenticate, getLatestResult); // Get latest result (Protected)

/**
 * @swagger
 * /api/careers/match:
 *   post:
 *     summary: Match careers based on RIASEC scores
 *     tags: [Recommendations]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - scores
 *             properties:
 *               scores:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     domain:
 *                       type: string
 *                     score:
 *                       type: number
 *     responses:
 *       200:
 *         description: Matched careers returned
 *       400:
 *         description: Invalid scores
 */
router.post('/careers/match', getMatchingCareers); // Match careers by RIASEC (Public)

// Export router
export default router;
