import type { Request, Response, NextFunction } from 'express';
import { TaskService } from '../services/task.service.js';
import { 
  NotFoundError, 
  ForbiddenError,
  BadRequestError
} from '../utils/errors.js';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        roles?: Array<{ name: string }>;
      };
    }
  }
}

type ControllerResponse = Promise<Response | void>;

interface TaskReorderData {
  taskId: string;
  newOrder: number;
  status: string;
  userId: string;
}

export class TaskController {
  private taskService: TaskService;

  constructor(taskService: TaskService) {
    this.taskService = taskService;
  }

  private async handleRequest<T>(
    _req: Request,
    res: Response,
    next: NextFunction,
    handler: () => Promise<T>,
    successStatus = 200
  ): Promise<Response | void> {
    try {
      const data = await handler();
      return res.status(successStatus).json({
        success: true,
        data
      });
    } catch (error) {
      next(error);
    }
  }

  private getUserId(req: Request): string {
    const userId = req.user?.id;
    if (!userId) {
      throw new ForbiddenError('User not authenticated');
    }
    return String(userId);
  }

  /**
   * Create a new task
   */
  public createTask = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): ControllerResponse => {
    const userId = this.getUserId(req);
    
    return this.handleRequest(
      req,
      res,
      next,
      async () => {
        const task = await this.taskService.createTask({
          ...req.body,
          createdBy: userId
        });
        return task;
      },
      201
    );
  };

  /**
   * Get task by ID
   */
  public getTaskById = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): ControllerResponse => {
    const { id } = req.params;
    if (!id) {
      throw new BadRequestError('Task ID is required');
    }

    return this.handleRequest(
      req,
      res,
      next,
      async () => {
        const task = await this.taskService.getTaskById(id);
        if (!task) {
          throw new NotFoundError('Task not found');
        }
        return task;
      }
    );
  };

  /**
   * Get all tasks for a project
   */
  public getProjectTasks = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): ControllerResponse => {
    const { projectId } = req.params;
    const { status, priority, assigneeId } = req.query;

    if (!projectId) {
      throw new BadRequestError('Project ID is required');
    }

    return this.handleRequest(
      req,
      res,
      next,
      async () => {
        const filterOptions = {
          status: status as string | undefined,
          priority: priority as string | undefined,
          assigneeId: assigneeId as string | undefined
        };
        return this.taskService.getProjectTasks(projectId, filterOptions);
      }
    );
  };

  /**
   * Update a task
   */
  public updateTask = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): ControllerResponse => {
    const { id } = req.params;
    const updates = req.body;

    if (!id) {
      throw new BadRequestError('Task ID is required');
    }

    if (Object.keys(updates).length === 0) {
      throw new BadRequestError('No update data provided');
    }

    return this.handleRequest(
      req,
      res,
      next,
      async () => {
        const task = await this.taskService.updateTask(id, updates);
        return task;
      }
    );
  };

  /**
   * Delete a task
   */
  public deleteTask = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): ControllerResponse => {
    const { id } = req.params;

    if (!id) {
      throw new BadRequestError('Task ID is required');
    }

    return this.handleRequest(
      req,
      res,
      next,
      async () => {
        await this.taskService.deleteTask(id);
        return { success: true, message: 'Task deleted successfully' };
      }
    );
  };

  /**
   * Reorder tasks within a status column
   */
  public reorderTasks = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): ControllerResponse => {
    const { taskId, newOrder, status } = req.body as TaskReorderData;
    const userId = this.getUserId(req);

    if (!taskId || newOrder === undefined || !status) {
      throw new BadRequestError('taskId, newOrder, and status are required');
    }

    return this.handleRequest(
      req,
      res,
      next,
      async () => {
        // TODO: Implement reorderTasks in TaskService
        throw new Error('reorderTasks not implemented');
      }
    );
  };
}

// Create a singleton instance of the controller
const taskController = new TaskController(new TaskService());

export default taskController;
