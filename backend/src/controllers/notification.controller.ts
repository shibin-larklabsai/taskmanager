import { Request, Response } from 'express';
import { Notification } from '../models/notification.model';

// Import the extended Request type from our type definitions
import '../types/express';

// Get all notifications for the authenticated user
export const getNotifications = async (req: Request, res: Response): Promise<Response> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const notifications = await Notification.findAll({
      where: { userId },
      order: [['createdAt', 'DESC']],
    });

    return res.status(200).json({
      success: true,
      data: notifications,
    });
  } catch (error) {
    console.error('Error in getNotifications:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Mark a specific notification as read
export const markAsRead = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const notification = await Notification.findOne({
      where: { id, userId },
    });

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    await notification.update({ read: true });

    // Emit real-time update via Socket.IO if available
    if (req.io) {
      req.io.to(`user_${userId}`).emit('notification:updated', notification);
    }

    return res.status(200).json({
      success: true,
      data: notification,
    });
  } catch (error) {
    console.error('Error in markAsRead:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Mark all notifications as read for the current user
export const markAllAsRead = async (req: Request, res: Response): Promise<Response> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    await Notification.update(
      { read: true },
      {
        where: { userId, read: false },
      }
    );

    // Emit real-time update via Socket.IO if available
    if (req.io) {
      req.io.to(`user_${userId}`).emit('notifications:markedAllRead');
    }

    return res.status(200).json({
      success: true,
      message: 'All notifications marked as read',
    });
  } catch (error) {
    console.error('Error in markAllAsRead:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Get unread notification count for the current user
export const getUnreadCount = async (req: Request, res: Response): Promise<Response> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const count = await Notification.count({
      where: { userId, read: false },
    });

    return res.status(200).json({
      success: true,
      count,
    });
  } catch (error) {
    console.error('Error in getUnreadCount:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export default {
  getNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount
};
