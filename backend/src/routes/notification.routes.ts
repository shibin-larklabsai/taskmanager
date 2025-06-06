import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import * as notificationController from '../controllers/notification.controller';

const router = Router();

// Apply authentication middleware to all notification routes
router.use(authenticate);

// Get all notifications for the authenticated user
router.get('/', notificationController.getNotifications);

// Mark a specific notification as read
router.patch('/:id/read', notificationController.markAsRead);

// Mark all notifications as read for the current user
router.post('/read-all', notificationController.markAllAsRead);

// Get unread notification count for the current user
router.get('/unread-count', notificationController.getUnreadCount);

export default router;
