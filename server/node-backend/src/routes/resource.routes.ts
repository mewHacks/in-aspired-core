import express from 'express';
import { getRoomResources, addResource, reportResource, getRecommendedResources, getReportedResources, dismissReport, deleteResource } from '../controllers/resource.controller';
import { authenticate, adminOnly } from '../middleware/auth.middleware';

// Create a new Express router instance (initialize)
const router = express.Router();

// ADMIN ROUTES
// These must come FIRST before the /:roomId routes below,
// otherwise Express will mistake "admin" as a roomId
// Only admins can access these routes.

// GET /api/resources/admin/reported
// Admin fetches the list of all reported resources
// Used in the "Resource Reports" tab in Report Center page
router.get('/admin/reported', authenticate, adminOnly, getReportedResources);

// PATCH /api/resources/admin/:resourceId/dismiss
// Admin dismisses all reports on a resource and restores it to active
// Used when admin reviews a report and decides the resource is actually fine
router.patch('/admin/:resourceId/dismiss', authenticate, adminOnly, dismissReport);

// DELETE /api/resources/admin/:resourceId
// Admin permanently deletes a reported resource from the database
// Used when admin confirms the resource is genuinely inappropriate/harmful
router.delete('/admin/:resourceId', authenticate, adminOnly, deleteResource);

// PUBLIC ROUTES (for regular logged-in users)
// GET /api/resources/recommended?domain=Computing&level=Diploma
// Fetches curated/library resources filtered by domain and level
// Shown in the "Recommended" section of the Resources panel in virtual room

// Define routes
/**
 * @swagger
 * /api/resources/recommended:
 *   get:
 *     summary: Get curated resources
 *     tags: [Resources]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: domain
 *         schema:
 *           type: string
 *       - in: query
 *         name: level
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of curated resources
 */
router.get('/recommended', authenticate, getRecommendedResources); // Get library/recommended

// GET /api/resources/:roomId
// Fetches all user-uploaded resources for a specific room
// Only returns "active" resources (hidden/reported ones are excluded)
// Supports pagination with ?page=1&limit=20

/**
 * @swagger
 * /api/resources/{roomId}:
 *   get:
 *     summary: Get room resources
 *     tags: [Resources]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Paginated room resources
 */
router.get('/:roomId', authenticate, getRoomResources); // get all

// POST /api/resources/:roomId
// User uploads a new resource to a room
// Has rate limiting (max 5 per 10 mins) and banned word checking

/**
 * @swagger
 * /api/resources/{roomId}:
 *   post:
 *     summary: Add resource to room
 *     tags: [Resources]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - url
 *               - type
 *             properties:
 *               title:
 *                 type: string
 *               url:
 *                 type: string
 *               type:
 *                 type: string
 *               description:
 *                 type: string
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Resource added
 */
router.post('/:roomId', authenticate, addResource);

// POST /api/resources/report/:resourceId
// User reports a resource they think is inappropriate
// Saves the report reason inside the resource document
// Auto-hides the resource if it gets 2 or more reports
/**
 * @swagger
 * /api/resources/report/{resourceId}:
 *   post:
 *     summary: Report a resource
 *     tags: [Resources]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: resourceId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Resource reported
 */
router.post('/report/:resourceId', authenticate, reportResource);

// Export the router so it can be registered in the main app
export default router;