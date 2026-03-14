// room.routes.ts — Virtual study room CRUD routes with eligibility checks.

import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { getRooms, createRoom, getRoom, getEligibility, joinRoom } from '../controllers/room.controller';

// Initialize router
const router = Router();

// Apply authentication middleware to all routes
router.use(authenticate);

// Define routes
/**
 * @swagger
 * /api/rooms:
 *   get:
 *     summary: Get accessible rooms
 *     tags: [Rooms]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of rooms
 */
router.get('/', getRooms);
/**
 * @swagger
 * /api/rooms/eligibility:
 *   get:
 *     summary: Check room eligibility
 *     tags: [Rooms]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Eligibility status
 */
router.get('/eligibility', getEligibility);
/**
 * @swagger
 * /api/rooms:
 *   post:
 *     summary: Create a room
 *     tags: [Rooms]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - type
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               type:
 *                 type: string
 *               institutionId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Room created
 */
router.post('/', createRoom);
/**
 * @swagger
 * /api/rooms/{id}:
 *   get:
 *     summary: Get room details
 *     tags: [Rooms]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Room details
 */
router.get('/:id', getRoom);
/**
 * @swagger
 * /api/rooms/{id}/join:
 *   post:
 *     summary: Join a room
 *     tags: [Rooms]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Joined room
 */
router.post('/:id/join', joinRoom);

// Export router
export default router;
