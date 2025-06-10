import { Request, Response } from 'express';
import { Comment } from '../models/comment.model';
import { Project } from '../models/project.model';
import { ProjectMember, ProjectRole } from '../models/project-member.model';
import User from '../models/user.model';
import { AppError } from '../utils/errorHandler';
import { Op } from 'sequelize';
import NotificationService from '../services/notification.service';

// Extend Express Request type to include io and user
declare global {
  namespace Express {
    interface Request {
      io?: any; // Replace 'any' with the actual SocketIO Server type if available
      user?: {
        id: string;
        roles?: { name: string }[];
      };
    }
  }
}

export class CommentController {
  // Create a new comment
  static createComment = async (req: Request, res: Response): Promise<Response> => {
    try {
      const { content, projectId } = req.body;
      const userId = req.user?.id;
      
      if (!userId) {
        throw new AppError('User not authenticated', 401);
      }
      
      // Ensure userId is a number
      const userIdNum = typeof userId === 'string' ? parseInt(userId, 10) : userId;

      // Check if project exists
      const project = await Project.findByPk(projectId);
      if (!project) {
        throw new AppError('Project not found', 404);
      }

      // Get user with roles
      const user = await User.findByPk(userIdNum, {
        include: [{
          model: (User as any).associations.roles.target,
          as: 'roles',
          attributes: ['id', 'name'],
          through: { attributes: [] },
          required: false
        }]
      });

      if (!user) {
        throw new AppError('User not found', 404);
      }

      // Type assertion to handle roles
      const userWithRoles = user as any;
      const isAdmin = userWithRoles.roles?.some((role: { name: string }) => role.name === 'admin');
      const isTester = userWithRoles.roles?.some((role: { name: string }) => role.name === 'tester');

      // Check if user is a member of the project or is a tester on an in-progress project
      const isMember = await ProjectMember.findOne({
        where: { projectId, userId: userIdNum },
      });

      if (!isMember && !isAdmin) {
        if (!isTester || project.status !== 'IN_PROGRESS') {
          throw new AppError('You must be a member of the project to comment', 403);
        }
      }

      // Create the comment
      const comment = await Comment.create({
        content,
        projectId,
        userId: userIdNum,
      });

      if (!comment) {
        throw new AppError('Failed to create comment', 500);
      }

      // Fetch the created comment with user details
      const createdComment = await Comment.findByPk(comment.id, {
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'name', 'email']
          }
        ]
      });

      if (!createdComment) {
        throw new AppError('Failed to fetch created comment', 500);
      }

      // Emit WebSocket event for real-time updates
      if (req.io) {
        req.io.emit('comment:created', createdComment);
      }

      // Send notifications to other project members
      try {
        const project = await Project.findByPk(projectId);
        if (project) {
          // Get all developers and testers in the project
          const members = await ProjectMember.findAll({
            where: {
              projectId,
              userId: { [Op.ne]: userIdNum } // Exclude the comment author
            },
            include: [
              {
                model: User,
                as: 'user',  // Add the alias that matches your association
                attributes: ['id', 'name', 'email']
              }
            ]
          });

          // Send notifications
          for (const member of members) {
            // Get comment author info
            const commentAuthor = await User.findByPk(userIdNum, {
              attributes: ['id', 'name', 'email']
            });

            const notification = await NotificationService.createNotification({
              userId: member.userId,
              message: `New comment on project ${project.name}`,
              type: 'comment',
              link: `/projects/${projectId}`, // This will take user to the project with comments section open
              projectId,
              commentId: createdComment.id,
              metadata: {
                commentAuthor: commentAuthor?.name || 'A developer',
                commentContent: content, // The actual comment content
                projectName: project.name
              }
            });

            // Emit notification via WebSocket (using underscore to match frontend)
            if (req.io) {
              const roomName = `user_${member.userId}`;
              const notificationData = {
                ...notification,
                isBroadcast: false,
                targetUserId: member.userId
              };
              
              console.log(`[Comment] Sending notification to room: ${roomName}`, {
                notificationId: notification.id,
                userId: member.userId,
                projectId: projectId,
                commentId: createdComment.id,
                roomName,
                socketRooms: req.io.sockets.adapter.rooms
              });
              
              try {
                // Get all sockets in the room
                const socketsInRoom = await req.io.in(roomName).fetchSockets();
                console.log(`[Comment] Found ${socketsInRoom.length} sockets in room ${roomName}`);
                
                // Emit to the specific user's room
                req.io.to(roomName).emit('notification', notificationData);
                console.log(`[Comment] Notification sent to room ${roomName}`);
                
                // Also emit to the global namespace for any other listeners
                req.io.emit('notification', {
                  ...notificationData,
                  isBroadcast: true
                });
                console.log(`[Comment] Global notification broadcast for user ${member.userId}`);
                
                // Debug: List all rooms
                const rooms = Array.from(req.io.sockets.adapter.rooms.keys())
                  .filter(room => room.startsWith('user_'));
                console.log(`[Comment] Current user rooms:`, rooms);
                
              } catch (error) {
                console.error(`[Comment] Error sending notification to room ${roomName}:`, error);
                
                // Fallback: Try sending directly to user ID
                try {
                  console.log(`[Comment] Attempting direct emit to user ID: ${member.userId}`);
                  const sockets = await req.io.fetchSockets();
                  const userSockets = sockets.filter(s => s.user?.id === member.userId);
                  console.log(`[Comment] Found ${userSockets.length} sockets for user ${member.userId}`);
                  
                  userSockets.forEach(socket => {
                    socket.emit('notification', {
                      ...notification,
                      isDirect: true,
                      targetUserId: member.userId
                    });
                  });
                  console.log(`[Comment] Direct notification sent to user ${member.userId}`);
                } catch (fallbackError) {
                  console.error(`[Comment] Fallback notification failed for user ${member.userId}:`, fallbackError);
                }
              }
            } else {
              console.error('[Comment] WebSocket server (req.io) is not available');
            }
          }
        }
      } catch (error) {
        console.error('Error sending notifications:', error);
        // Don't fail the request if notification fails
      }

      return res.status(201).json({
        success: true,
        data: createdComment,
      });
    } catch (error: any) {
      console.error('Error creating comment:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to create comment',
        error: error.message,
      });
    }
  };

  // Get comments for multiple projects at once
  static getProjectsComments = async (req: Request, res: Response): Promise<Response> => {
    try {
      const { ids } = req.query;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
      }
      
      // Ensure userId is a number
      const userIdNum = typeof userId === 'string' ? parseInt(userId, 10) : userId;

      if (!ids || typeof ids !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'Project IDs are required',
        });
      }

      const projectIds = ids.split(',').map(id => parseInt(id.trim(), 10)).filter(Boolean);
      
      if (projectIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Valid project IDs are required',
        });
      }

      // Get user with roles
      const user = await User.findByPk(userIdNum, {
        include: [{
          model: (User as any).associations.roles.target,
          as: 'roles',
          attributes: ['id', 'name'],
          through: { attributes: [] },
          required: false
        }]
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
        });
      }

      // Type assertion to handle roles
      const userWithRoles = user as any;
      const isAdmin = userWithRoles.roles?.some((role: { name: string }) => role.name === 'admin');
      
      // If not admin, we need to check project memberships
      let accessibleProjectIds = [...projectIds];
      
      if (!isAdmin) {
        // Get all projects the user is a member of
        const memberProjects = await ProjectMember.findAll({
          where: { userId: userIdNum },
          attributes: ['projectId'],
          raw: true
        });
        
        const memberProjectIds = memberProjects.map(p => p.projectId);
        
        // Get all in-progress projects (testers can see these)
        const inProgressProjects = await Project.findAll({
          where: { 
            id: projectIds,
            status: 'IN_PROGRESS' 
          },
          attributes: ['id'],
          raw: true
        });
        
        const inProgressProjectIds = inProgressProjects.map(p => p.id);
        
        // Combine both sets of accessible projects
        accessibleProjectIds = projectIds.filter(id => 
          memberProjectIds.includes(id) || inProgressProjectIds.includes(id)
        );
      }

      // If no accessible projects, return empty array
      if (accessibleProjectIds.length === 0) {
        return res.status(200).json({
          success: true,
          data: []
        });
      }

      // Get all comments for accessible projects
      const comments = await Comment.findAll({
        where: { 
          projectId: accessibleProjectIds 
        },
        include: [
          {
            model: Comment.associations.user.target,
            as: 'user',
            attributes: ['id', 'name', 'email'],
          },
        ],
        order: [['createdAt', 'DESC']],
      });

      return res.status(200).json({
        success: true,
        data: comments,
      });
    } catch (error: any) {
      console.error('Error fetching projects comments:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch projects comments',
        error: error.message,
      });
    }
  };

  // Get comments for a project
  static getProjectComments = async (req: Request, res: Response): Promise<Response> => {
    try {
      const { projectId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
      }
      
      // Ensure userId is a number
      const userIdNum = typeof userId === 'string' ? parseInt(userId, 10) : userId;

      // Check if project exists and get its status
      const project = await Project.findByPk(projectId);
      if (!project) {
        return res.status(404).json({
          success: false,
          message: 'Project not found',
        });
      }

      // Get user with roles
      const user = await User.findByPk(userIdNum, {
        include: [{
          model: (User as any).associations.roles.target,
          as: 'roles',
          attributes: ['id', 'name'],
          through: { attributes: [] },
          required: false
        }]
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
        });
      }

      // Type assertion to handle roles
      const userWithRoles = user as any;
      const isAdmin = userWithRoles.roles?.some((role: { name: string }) => role.name === 'admin');
      
      // Check if user is a project member
      const isMember = await ProjectMember.findOne({
        where: { projectId, userId: userIdNum }
      });

      // If not admin and not a member, only allow access to in-progress projects
      if (!isAdmin && !isMember) {
        if (project.status !== 'IN_PROGRESS') {
          return res.status(403).json({
            success: false,
            message: 'You do not have permission to view these comments',
          });
        }
      }

      // Get all comments for the project
      const comments = await Comment.findAll({
        where: { projectId },
        include: [
          {
            model: Comment.associations.user.target,
            as: 'user',
            attributes: ['id', 'name', 'email'],
          },
        ],
        order: [['createdAt', 'DESC']],
      });

      return res.status(200).json({
        success: true,
        data: comments,
      });
    } catch (error: any) {
      console.error('Error fetching comments:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch comments',
        error: error.message,
      });
    }
  };

  // Update a comment
  static updateComment = async (req: Request, res: Response): Promise<Response> => {
    try {
      const { commentId } = req.params;
      const { content } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
      }
      
      // Ensure userId is a number
      const userIdNum = typeof userId === 'string' ? parseInt(userId, 10) : userId;

      if (!content || typeof content !== 'string' || content.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Comment content is required',
        });
      }

      const comment = await Comment.findByPk(commentId);

      if (!comment) {
        return res.status(404).json({
          success: false,
          message: 'Comment not found',
        });
      }

      // Check if user is the comment author
      if (comment.userId !== userIdNum) {
        return res.status(403).json({
          success: false,
          message: 'You can only edit your own comments',
        });
      }

      // Update the comment
      comment.content = content.trim();
      await comment.save();

      // Fetch the updated comment with user details
      const updatedComment = await Comment.findByPk(comment.id, {
        include: [
          {
            model: Comment.associations.user.target,
            as: 'user',
            attributes: ['id', 'name', 'email'],
          },
        ],
      });

      // Emit WebSocket event for real-time updates
      if (req.app.get('io')) {
        req.app.get('io').emit('comment:updated', updatedComment);
      }

      return res.status(200).json({
        success: true,
        data: updatedComment,
      });
    } catch (error: any) {
      console.error('Error updating comment:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update comment',
        error: error.message,
      });
    }
  };

  // Delete a comment
  static deleteComment = async (req: Request, res: Response): Promise<Response> => {
    try {
      const { commentId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
      }
      
      // Ensure userId is a number
      const userIdNum = typeof userId === 'string' ? parseInt(userId, 10) : userId;

      const comment = await Comment.findByPk(commentId);

      if (!comment) {
        return res.status(404).json({
          success: false,
          message: 'Comment not found',
        });
      }

      // Check if user is the comment author or project admin/owner
      const isCommentAuthor = comment.userId === userIdNum;
      const isProjectAdmin = await ProjectMember.findOne({
        where: {
          projectId: comment.projectId,
          userId: userIdNum,
          role: [ProjectRole.OWNER, ProjectRole.MANAGER],
        },
      });

      if (!isCommentAuthor && !isProjectAdmin) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to delete this comment',
        });
      }

      await comment.destroy();

      // Emit WebSocket event for real-time updates
      if (req.app.get('io')) {
        req.app.get('io').emit('comment:deleted', { id: commentId, projectId: comment.projectId });
      }

      return res.status(200).json({
        success: true,
        message: 'Comment deleted successfully',
      });
    } catch (error: any) {
      console.error('Error deleting comment:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to delete comment',
        error: error.message,
      });
    }
  };
}

export default CommentController;
