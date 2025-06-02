import { Request, Response } from 'express';
import { Task, TaskStatus, TaskPriority } from '../models/task.model.js';
import { ProjectMember, ProjectRole } from '../models/project-member.model.js';
import { sequelize } from '../config/database.js';
import { taskEventsService } from '../services/task-events.service.js';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        roles?: Array<{ name: string }>;
      };
    }
  }
}

type ControllerResponse = void;

export const TaskController = {
  // Create a new task
  createTask: async (req: Request, res: Response): Promise<ControllerResponse> => {
    let responseSent = false;
    
    const sendResponse = (status: number, data: any) => {
      if (!responseSent) {
        responseSent = true;
        res.status(status).json(data);
      }
    };

    try {
      const { 
        title, 
        description, 
        status = TaskStatus.TODO, 
        priority = TaskPriority.MEDIUM, 
        dueDate, 
        projectId, 
        assignedToId, 
        parentTaskId,
        estimatedHours
      } = req.body;

      const createdById = req.user?.id;

      if (!createdById) {
        return sendResponse(401, { success: false, message: 'User not authenticated' });
      }

      // Check if project exists and user has access
      const projectMember = await ProjectMember.findOne({
        where: {
          projectId,
          userId: createdById,
        },
      });

      if (!projectMember) {
        return sendResponse(403, { 
          success: false, 
          message: 'You do not have permission to create tasks in this project' 
        });
      }

      // Validate assignee if provided
      if (assignedToId) {
        const assignee = await ProjectMember.findOne({
          where: {
            projectId,
            userId: assignedToId,
          },
        });

        if (!assignee) {
          return sendResponse(400, {
            success: false,
            message: 'Cannot assign task to a user who is not a project member',
          });
        }
      }


      // Create the task
      const task = await Task.create({
        title,
        description,
        status,
        priority,
        dueDate,
        projectId,
        createdById,
        assignedToId,
        parentTaskId,
        estimatedHours,
        order: 0, // Will be updated
      });

      return sendResponse(201, {
        success: true,
        data: task,
        message: 'Task created successfully'
      });
    } catch (error: any) {
      console.error('Error creating task:', error);
      sendResponse(500, {
        success: false,
        message: 'Failed to create task',
        error: error.message,
      });
    }
  },

  // Get all tasks
  getTasks: async (req: Request, res: Response): Promise<ControllerResponse> => {
    let responseSent = false;
    
    const sendResponse = (status: number, data: any) => {
      if (!responseSent) {
        responseSent = true;
        res.status(status).json(data);
      }
    };

    try {
      const { projectId, status, priority, assigneeId, page = 1, limit = 10 } = req.query;
      const userId = req.user?.id;

      if (!userId) {
        return sendResponse(401, { success: false, message: 'User not authenticated' });
      }

      const whereClause: any = {};
      const include: any = [];

      if (projectId) whereClause.projectId = projectId;
      if (status) whereClause.status = status;
      if (priority) whereClause.priority = priority;
      if (assigneeId) whereClause.assignedToId = assigneeId;

      // Only show tasks from projects the user is a member of
      include.push({
        model: ProjectMember,
        where: { userId },
        attributes: [],
        required: true,
      });

      const offset = (Number(page) - 1) * Number(limit);

      const { count, rows: tasks } = await Task.findAndCountAll({
        where: whereClause,
        include,
        limit: Number(limit),
        offset,
        order: [['createdAt', 'DESC']],
      });

      sendResponse(200, {
        success: true,
        data: tasks,
        pagination: {
          total: count,
          page: Number(page),
          pages: Math.ceil(count / Number(limit)),
        },
      });
    } catch (error: any) {
      console.error('Error fetching tasks:', error);
      sendResponse(500, {
        success: false,
        message: 'Failed to fetch tasks',
        error: error.message,
      });
    }
  },

  // Get task by ID
  getTaskById: async (req: Request, res: Response): Promise<ControllerResponse> => {
    let responseSent = false;
    
    const sendResponse = (status: number, data: any) => {
      if (!responseSent) {
        responseSent = true;
        res.status(status).json(data);
      }
    };

    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return sendResponse(401, { success: false, message: 'User not authenticated' });
      }

      const task = await Task.findByPk(id, {
        include: [
          {
            model: ProjectMember,
            as: 'creator',
            attributes: ['id', 'userId'],
          },
          {
            model: ProjectMember,
            as: 'assignee',
            attributes: ['id', 'userId'],
          },
        ],
      });

      if (!task) {
        sendResponse(404, { success: false, message: 'Task not found' });
        return;
      }

      // Check if user has access to this task's project
      const hasAccess = await ProjectMember.findOne({
        where: {
          projectId: task.projectId,
          userId,
        },
      });

      if (!hasAccess) {
        sendResponse(403, {
          success: false,
          message: 'You do not have permission to view this task',
        });
        return;
      }

      sendResponse(200, { success: true, data: task });
    } catch (error: any) {
      console.error('Error fetching task:', error);
      sendResponse(500, {
        success: false,
        message: 'Failed to fetch task',
        error: error.message,
      });
    }
  },

  // Update task
  updateTask: async (req: Request, res: Response): Promise<ControllerResponse> => {
    let responseSent = false;
    
    const sendResponse = (status: number, data: any) => {
      if (!responseSent) {
        responseSent = true;
        res.status(status).json(data);
      }
    };

    try {
      const { id } = req.params;
      const userId = req.user?.id;
      const updates = req.body;

      if (!userId) {
        return sendResponse(401, { success: false, message: 'User not authenticated' });
      }

      const task = await Task.findByPk(id);
      if (!task) {
        sendResponse(404, { success: false, message: 'Task not found' });
        return;
      }

      // Check if user has permission to update this task
      const userMembership = await ProjectMember.findOne({
        where: {
          projectId: task.projectId,
          userId,
        },
      });

      if (!userMembership) {
        sendResponse(403, {
          success: false,
          message: 'You do not have permission to update this task',
        });
        return;
      }

      // Only project owners/managers or the task creator can update the task
      const isCreator = task.createdById === userId;
      const isManagerOrOwner = [ProjectRole.OWNER, ProjectRole.MANAGER].includes(
        userMembership.role as ProjectRole
      );

      if (!isCreator && !isManagerOrOwner) {
        sendResponse(403, {
          success: false,
          message: 'Only task creators, project managers, or owners can update this task',
        });
        return;
      }

      // If changing status to DONE, set completedAt
      if (updates.status === TaskStatus.DONE && task.status !== TaskStatus.DONE) {
        updates.completedAt = new Date();
      } else if (updates.status && updates.status !== TaskStatus.DONE) {
        updates.completedAt = null;
      }

      // If assigning to someone, validate they are a project member
      if (updates.assignedToId) {
        const assignee = await ProjectMember.findOne({
          where: {
            projectId: task.projectId,
            userId: updates.assignedToId,
          },
        });

        if (!assignee) {
          sendResponse(400, {
            success: false,
            message: 'Cannot assign task to a user who is not a project member',
          });
          return;
        }
      }

      await task.update(updates);

      // Reload the task with associations
      const updatedTask = await Task.findByPk(id, {
        include: [
          { model: ProjectMember, as: 'creator' },
          { model: ProjectMember, as: 'assignee' },
        ],
      });

      // Emit WebSocket event
      if (updatedTask) {
        await taskEventsService.emitTaskUpdated(updatedTask);
      }

      sendResponse(200, {
        success: true,
        data: updatedTask,
        message: 'Task updated successfully',
      });
    } catch (error: any) {
      console.error('Error updating task:', error);
      sendResponse(500, {
        success: false,
        message: 'Failed to update task',
        error: error.message,
      });
    }
  },

  // Delete task
  deleteTask: async (req: Request, res: Response): Promise<ControllerResponse> => {
    let responseSent = false;
    
    const sendResponse = (status: number, data: any) => {
      if (!responseSent) {
        responseSent = true;
        res.status(status).json(data);
      }
    };

    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return sendResponse(401, { success: false, message: 'User not authenticated' });
      }

      const task = await Task.findByPk(id);
      if (!task) {
        sendResponse(404, { success: false, message: 'Task not found' });
        return;
      }

      // Check if user has permission to delete this task
      const userMembership = await ProjectMember.findOne({
        where: {
          projectId: task.projectId,
          userId,
        },
      });

      if (!userMembership) {
        sendResponse(403, {
          success: false,
          message: 'You do not have permission to delete this task',
        });
        return;
      }

      // Only project owners/managers or the task creator can delete the task
      const isCreator = task.createdById === userId;
      const isManagerOrOwner = [ProjectRole.OWNER, ProjectRole.MANAGER].includes(
        userMembership.role as ProjectRole
      );

      if (!isCreator && !isManagerOrOwner) {
        sendResponse(403, {
          success: false,
          message: 'Only task creators, project managers, or owners can delete this task',
        });
        return;
      }

      // Get task ID before deletion
      const taskId = task.id.toString();
      
      // Delete the task
      await task.destroy();

      // Emit WebSocket event
      taskEventsService.emitTaskDeleted(taskId);

      sendResponse(200, { success: true, message: 'Task deleted successfully' });
    } catch (error: any) {
      console.error('Error deleting task:', error);
      sendResponse(500, {
        success: false,
        message: 'Failed to delete task',
        error: error.message,
      });
    }
  },

  // Reorder tasks (for drag and drop within the same status)
  reorderTasks: async (req: Request, res: Response): Promise<ControllerResponse> => {
    let responseSent = false;
    const transaction = await sequelize.transaction();
    
    const sendResponse = async (status: number, data: any, shouldRollback: boolean = true) => {
      if (!responseSent) {
        responseSent = true;
        if (shouldRollback) {
          await transaction.rollback();
        }
        res.status(status).json(data);
      }
    };

    try {
      const projectId = parseInt(req.params.projectId, 10);
      const { status, taskOrder } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return await sendResponse(401, { success: false, message: 'User not authenticated' });
      }

      // Check if user has access to this project
      const userMembership = await ProjectMember.findOne({
        where: {
          projectId,
          userId,
        },
        transaction,
      });

      if (!userMembership) {
        return await sendResponse(403, {
          success: false,
          message: 'You do not have permission to reorder tasks in this project',
        });
      }

      // Update the order of tasks
      const updatePromises = taskOrder.map((taskId: string, index: number) => 
        Task.update(
          { order: index },
          { 
            where: { 
              id: taskId, 
              projectId,
              status 
            },
            transaction,
          }
        )
      );

      await Promise.all(updatePromises);
      await transaction.commit();

      await sendResponse(200, {
        success: true,
        message: 'Tasks reordered successfully',
      }, false);
    } catch (error: any) {
      console.error('Error reordering tasks:', error);
      await sendResponse(500, {
        success: false,
        message: 'Failed to reorder tasks',
        error: error.message,
      });
    }
  },
};
