// notification.routes.ts — Push notification and in-app notification routes.

import express from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { getNotifications, getUnreadCount, markAsRead, markAllAsRead, deleteNotification, getVapidKey, subscribeToPush, unsubscribeFromPush } from '../controllers/notification.controller';

// Initialize router
const router = express.Router();

// Authentication middleware
router.use(authenticate);

// In-app notification routes
router.get('/', getNotifications);
router.get('/unread-count', getUnreadCount);
router.patch('/read-all', markAllAsRead);
router.patch('/:id/read', markAsRead);
router.delete('/:id', deleteNotification);

// Push notification routes
router.get('/vapid-key', getVapidKey);
router.post('/subscribe', subscribeToPush);
router.post('/unsubscribe', unsubscribeFromPush);


// Export router
export default router;
