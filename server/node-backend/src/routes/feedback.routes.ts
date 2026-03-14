// feedback.routes.ts — User feedback submission and admin management routes.

import express from 'express';
import { 
  submitFeedback, 
  getMyFeedback,
  getAllFeedback,
  getFeedbackById,
  resolveFeedback,
  unresolveFeedback,
  deleteFeedback,
  getFeedbackStats
} from '../controllers/feedback.controller';
import { authenticate, adminOnly } from '../middleware/auth.middleware';
import { uploadFeedbackFiles } from '../middleware/upload';

const router = express.Router();

// USER ROUTES (require authentication)
// Submit feedback WITH file upload
router.post('/', authenticate, uploadFeedbackFiles, submitFeedback);

// Get my feedback history
router.get('/my', authenticate, getMyFeedback);

// ADMIN ROUTES (require authentication + admin role)
// Get all feedback (with filters, pagination)
router.get('/admin/all', authenticate, adminOnly, getAllFeedback);

// Get feedback statistics
router.get('/admin/stats', authenticate, adminOnly, getFeedbackStats);

// Get single feedback by ID
router.get('/admin/:id', authenticate, adminOnly, getFeedbackById);

// Resolve feedback
router.patch('/admin/:id/resolve', authenticate, adminOnly, resolveFeedback);

// Unresolve feedback (mark as pending again)
router.patch('/admin/:id/unresolve', authenticate, adminOnly, unresolveFeedback);

// Delete feedback
router.delete('/admin/:id', authenticate, adminOnly, deleteFeedback);

export default router;