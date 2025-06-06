import { Notification, INotificationAttributes } from '../models/notification.model.js';
import { ProjectMember } from '../models/project-member.model.js';
import { Op } from 'sequelize';

interface CreateNotificationData {
  userId: number;
  message: string;
  type: 'comment' | 'mention' | 'status_change' | 'project_update';
  link?: string;
  projectId?: number;
  commentId?: number;
}

export class NotificationService {
  static async createNotification(data: CreateNotificationData): Promise<Notification> {
    // Create a new notification with required fields
    const notificationData: INotificationAttributes = {
      id: 0, // This will be overridden by the database
      userId: data.userId,
      message: data.message,
      type: data.type,
      read: false,
      link: data.link || null,
      projectId: data.projectId || null,
      commentId: data.commentId || null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    return await Notification.create(notificationData as any);
  }

  static async getUserNotifications(userId: number, limit: number = 50): Promise<Notification[]> {
    return await Notification.findAll({
      where: { userId },
      order: [['createdAt', 'DESC']],
      limit,
    });
  }

  static async markAsRead(notificationId: number): Promise<[number, Notification[]]> {
    return await Notification.update(
      { read: true },
      { where: { id: notificationId }, returning: true }
    );
  }

  static async markAllAsRead(userId: number): Promise<[number, Notification[]]> {
    return await Notification.update(
      { read: true },
      { 
        where: { userId, read: false },
        returning: true 
      }
    );
  }

  static async getUnreadCount(userId: number): Promise<number> {
    return await Notification.count({
      where: { userId, read: false }
    });
  }

  static async notifyProjectMembers(
    projectId: number,
    excludeUserId: number,
    message: string,
    type: 'comment' | 'mention' | 'status_change' | 'project_update',
    link?: string,
    commentId?: number
  ): Promise<Notification[]> {
    // Get all project members except the excluded user
    const members = await ProjectMember.findAll({
      where: {
        projectId,
        userId: { [Op.ne]: excludeUserId }
      },
      attributes: ['userId']
    });

    const notifications = [];
    for (const member of members) {
      const notification = await Notification.create({
        userId: member.userId,
        message,
        type,
        link,
        projectId,
        commentId,
        read: false
      });
      notifications.push(notification);
    }

    return notifications;
  }

  static async notifySpecificUsers(
    userIds: number[],
    message: string,
    type: 'comment' | 'mention' | 'status_change' | 'project_update',
    link?: string,
    projectId?: number,
    commentId?: number
  ): Promise<Notification[]> {
    const notifications = [];
    
    for (const userId of userIds) {
      const notification = await Notification.create({
        userId,
        message,
        type,
        link,
        projectId,
        commentId,
        read: false
      });
      notifications.push(notification);
    }
    
    return notifications;
  }
}

export default NotificationService;
