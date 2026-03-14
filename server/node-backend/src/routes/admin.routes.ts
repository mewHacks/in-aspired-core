// admin.routes.ts — Admin-only routes for user management, report center, and platform metrics.

import { Router } from 'express';
import { getAllUsers, getUserActivity, getUserStats, suspendUser } from '../controllers/admin.controller';
import { PaymentController } from '../controllers/payment.controller';
import { authenticate, authMiddleware, adminOnly } from '../middleware/auth.middleware';
import { activityLogger } from '../middleware/activityLogger';

const router = Router();

// 1. Authenticate first
router.use(authenticate);

// 2. Log activity AFTER auth (so req.user exists)
router.use(activityLogger);

// 3. Then check login
router.use(authMiddleware);

// 4. Then check admin
router.use(adminOnly);

// ----- User Monitoring -----
router.get('/users', getAllUsers);
router.get('/users/:id/activity', getUserActivity);
router.patch('/users/:id/suspend', suspendUser);
router.get('/users/stats', getUserStats);

// ----- Payment Fulfillment -----
router.post('/payment/retry/:transactionId', PaymentController.retryFulfillment);

export default router;
