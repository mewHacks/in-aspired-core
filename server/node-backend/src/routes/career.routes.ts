// career.routes.ts — Career CRUD routes with search, filtering, save/unsave, and archiving.

import express from 'express';
import {
    getAllCareers, getCareerById, createCareer, updateCareer, deleteCareer,
    saveCareer, unsaveCareer, checkCareerSaved, fetchSavedCareers,
    getArchivedCareers, toggleCareerArchive
} from '../controllers/career.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireAdmin } from '../middleware/requireAdmin.middleware';

const router = express.Router();

// Public routes
/**
 * @swagger
 * /api/careers:
 *   get:
 *     summary: Get all careers
 *     tags: [Careers]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by name
 *     responses:
 *       200:
 *         description: List of careers
 */
router.get('/', authenticate, getAllCareers);

// Save/unsave careers (authenticated users)
router.get('/saved', authenticate, fetchSavedCareers);
router.get('/:id/saved', authenticate, checkCareerSaved);
router.post('/:id/save', authenticate, saveCareer);
router.post('/:id/unsave', authenticate, unsaveCareer);

{/* ADMIN ROUTES: Must be authenticated AND admin */ }
// Fetch all archived careers
router.get('/archived', authenticate, requireAdmin, getArchivedCareers);

// Create a new career
/**
 * @swagger
 * /api/careers:
 *   post:
 *     summary: Create a new career
 *     tags: [Careers]
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
 *               - description
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               salary_low:
 *                 type: number
 *               salary_high:
 *                 type: number
 *     responses:
 *       201:
 *         description: Career created
 *       403:
 *         description: Admin access required
 */
router.post('/', authenticate, requireAdmin, createCareer);

// Update existing career by id
/**
 * @swagger
 * /api/careers/{id}:
 *   put:
 *     summary: Update career
 *     tags: [Careers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Career updated
 */
router.put('/:id', authenticate, requireAdmin, updateCareer);

// Delete career by id
/**
 * @swagger
 * /api/careers/{id}:
 *   delete:
 *     summary: Delete career
 *     tags: [Careers]
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
 *         description: Career deleted
 */
router.delete('/:id', authenticate, requireAdmin, deleteCareer);

// Toggle for archive/unarchive
router.patch('/archive-toggle/:id', authenticate, requireAdmin, toggleCareerArchive);

// Must be the LAST to avoid conflicts
/**
 * @swagger
 * /api/careers/{id}:
 *   get:
 *     summary: Get career by ID
 *     tags: [Careers]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Career details
 *       404:
 *         description: Career not found
 */
router.get('/:id', authenticate, getCareerById);

// Export router
export default router;
