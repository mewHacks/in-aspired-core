// course.routes.ts — Course CRUD routes with search, filtering, save/unsave, and archiving.

import express from 'express';
import {
    getAllCourses, getCourseById, createCourse, updateCourse, deleteCourse,
    saveCourse, unsaveCourse, checkCourseSaved, fetchSavedCourses,
    getArchivedCourses, toggleCourseArchive, vectorSearchCourses
} from '../controllers/course.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireAdmin } from '../middleware/requireAdmin.middleware';

// Initialize router
const router = express.Router();

// Define routes
// NOTE: Public routes are define first without middleware

// Define routes
/**
 * @swagger
 * /api/courses:
 *   get:
 *     summary: Get all courses
 *     tags: [Courses]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by title
 *     responses:
 *       200:
 *         description: List of courses
 */
router.get('/', authenticate, getAllCourses);

/**
 * @swagger
 * /api/courses/search:
 *   get:
 *     summary: Vector search courses
 *     tags: [Courses]
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: Search query for semantic search
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Maximum number of results
 *       - in: query
 *         name: level
 *         schema:
 *           type: string
 *           enum: [Foundation, Diploma, General Pre-U]
 *         description: Filter by course level
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [Public, Private]
 *         description: Filter by course type
 *       - in: query
 *         name: cost_level
 *         schema:
 *           type: string
 *           enum: ["< RM 20k", "RM 20k - 50k", "> RM 50k"]
 *         description: Filter by cost level
 *       - in: query
 *         name: domainIds
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *         description: Filter by domain IDs
 *       - in: query
 *         name: institutionId
 *         schema:
 *           type: string
 *         description: Filter by institution ID
 *     responses:
 *       200:
 *         description: Vector search results
 *       400:
 *         description: Bad request
 *       500:
 *         description: Server error
 */
router.get('/search', authenticate, vectorSearchCourses);

// Save/unsave courses (authenticated users)
router.get('/saved', authenticate, fetchSavedCourses);
router.get('/:id/saved', authenticate, checkCourseSaved);
router.post('/:id/save', authenticate, saveCourse);
router.post('/:id/unsave', authenticate, unsaveCourse);

{/* ADMIN ROUTES: Must be authenticated AND admin */ }
// Fetch all archived courses
router.get('/archived', authenticate, requireAdmin, getArchivedCourses);

// Create a new course
router.post('/', authenticate, requireAdmin, createCourse);

// Update course
router.put('/:id', authenticate, requireAdmin, updateCourse);

// Delete course
router.delete('/:id', authenticate, requireAdmin, deleteCourse);

// Toggle for archive/unarchive
router.patch('/archive-toggle/:id', authenticate, requireAdmin, toggleCourseArchive);

// Must be the LAST 
/**
 * @swagger
 * /api/courses/{id}:
 *   get:
 *     summary: Get course by ID
 *     tags: [Courses]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Course details
 *       404:
 *         description: Course not found
 */
router.get('/:id', authenticate, getCourseById);

// Export router
export default router;
