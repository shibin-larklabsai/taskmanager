import { Request, Response } from 'express';
import { Comment, CommentAttributes } from '../models/comment.model';
import { Project } from '../models/project.model';
import { ProjectMember } from '../models/project-member.model';
import { ProjectRole } from '../models/project-member.model';

export class CommentController {
  // Create a new comment
  static createComment = async (req: Request, res: Response): Promise<Response> => {
    try {
      const { content, projectId } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
      }

      // Check if project exists
      const project = await Project.findByPk(projectId);
      if (!project) {
        return res.status(404).json({
          success: false,
          message: 'Project not found',
        });
      }

      // Check if user is a member of the project
      const isMember = await ProjectMember.findOne({
        where: { projectId, userId },
      });

      if (!isMember) {
        return res.status(403).json({
          success: false,
          message: 'You must be a member of the project to comment',
        });
      }

      // Create the comment
      const comment = await Comment.create({
        content,
        projectId,
        userId,
      });

      // Fetch the created comment with user details
      const createdComment = await Comment.findByPk(comment.id, {
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
        req.app.get('io').emit('comment:created', createdComment);
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

      // Check if user has access to the project
      const hasAccess = await ProjectMember.findOne({
        where: { projectId, userId },
      });

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to view these comments',
        });
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
      if (comment.userId !== userId) {
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

      const comment = await Comment.findByPk(commentId);

      if (!comment) {
        return res.status(404).json({
          success: false,
          message: 'Comment not found',
        });
      }

      // Check if user is the comment author or project admin/owner
      const isCommentAuthor = comment.userId === userId;
      const isProjectAdmin = await ProjectMember.findOne({
        where: {
          projectId: comment.projectId,
          userId,
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
