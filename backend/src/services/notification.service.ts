import { Notification, INotificationAttributes } from '../models/notification.model.js';
import { ProjectMember } from '../models/project-member.model.js';
import { Project, ProjectStatus } from '../models/project.model.js';
import User from '../models/user.model.js';
import Role from '../models/role.model.js';
import { Op } from 'sequelize';

interface UserWithRoles extends User {
  roles?: Role[];
}

interface ProjectMemberWithUser extends ProjectMember {
  user?: UserWithRoles;
}

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
    // Get the project to check its status
    const project = await Project.findByPk(projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    // Get all users to notify
    const usersToNotify: Array<{ id: number; isTester: boolean }> = [];

    // 1. Get all project members except the excluded user
    const projectMembers = await ProjectMember.findAll({
      where: {
        projectId,
        userId: { [Op.ne]: excludeUserId }
      },
      include: [{
        model: User,
        as: 'user',
        include: [{
          model: Role,
          as: 'roles',
          through: { attributes: [] },
          required: false
        }]
      }]
    }) as unknown as ProjectMemberWithUser[];

    // Add project members to notify list
    projectMembers.forEach(member => {
      if (member.user) {
        usersToNotify.push({
          id: member.userId,
          isTester: member.user.roles?.some(role => role.name === 'tester') || false
        });
      }
    });

    // 2. If project is IN_PROGRESS, also get all testers who aren't already included
    if (project.status === ProjectStatus.IN_PROGRESS) {
      const allTesters = (await User.findAll({
        include: [{
          model: Role,
          as: 'roles',
          where: { name: 'tester' },
          through: { attributes: [] },
          required: true
        }],
        attributes: ['id']
      })) as unknown as Array<{ id: number }>;

      // Add testers who aren't already in the list
      const existingUserIds = new Set(usersToNotify.map(u => u.id));
      for (const tester of allTesters) {
        if (tester.id && !existingUserIds.has(tester.id) && tester.id !== excludeUserId) {
          usersToNotify.push({
            id: tester.id,
            isTester: true
          });
        }
      }
    }

    // Create notifications for all users to notify
    const notifications = [];
    const projectMemberIds = projectMembers.map(m => m.userId);
    
    for (const user of usersToNotify) {
      // For testers on IN_PROGRESS projects, modify the message to indicate they're being notified as a tester
      const isTesterNotification = user.isTester && 
        project.status === ProjectStatus.IN_PROGRESS && 
        !projectMemberIds.includes(user.id);
      
      const notificationMessage = isTesterNotification
        ? `[Tester Notification] ${message}`
        : message;

      const notification = await Notification.create({
        userId: user.id,
        message: notificationMessage,
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
