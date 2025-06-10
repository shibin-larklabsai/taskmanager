import { webSocketService } from './websocket.service.js';
import type { Task, ITaskAttributes } from '../models/task.model.js';

class TaskEventsService {
  private static instance: TaskEventsService;

  private constructor() {}

  public static getInstance(): TaskEventsService {
    if (!TaskEventsService.instance) {
      TaskEventsService.instance = new TaskEventsService();
    }
    return TaskEventsService.instance;
  }

  public async emitTaskCreated(task: Task | ITaskAttributes): Promise<void> {
    try {
      const taskData = await this.prepareTaskData(task);
      webSocketService.emitToAll('task:created', taskData);
      
      // If task has an assignee, notify them
      const assignedToId = 'assignedToId' in task ? task.assignedToId : (task as any).assignedToId;
      if (assignedToId) {
        webSocketService.emitToUser(assignedToId, 'task:assigned', taskData);
      }
      
      // Always notify admins about new tasks
      webSocketService.emitToAdmins('admin:task:created', taskData);
    } catch (error) {
      console.error('Error emitting task created event:', error);
    }
  }

  public async emitTaskUpdated(task: Task | ITaskAttributes): Promise<void> {
    try {
      const taskData = await this.prepareTaskData(task);
      webSocketService.emitToAll('task:updated', taskData);
      
      // If task has an assignee, notify them
      const assignedToId = 'assignedToId' in task ? task.assignedToId : (task as any).assignedToId;
      if (assignedToId) {
        webSocketService.emitToUser(assignedToId, 'task:updated:assigned', taskData);
      }
    } catch (error) {
      console.error('Error emitting task updated event:', error);
    }
  }

  public emitTaskDeleted(taskId: string): void {
    try {
      webSocketService.emitToAll('task:deleted', { id: taskId });
    } catch (error) {
      console.error('Error emitting task deleted event:', error);
    }
  }

  private async prepareTaskData(task: Task | ITaskAttributes): Promise<any> {
    // If task is already a model instance with reload method, use it
    // Otherwise, create a plain object with the task data
    let fullTask;
    if ('reload' in task) {
      // It's a Sequelize model instance
      fullTask = await task.reload({
        include: [
          { 
            model: (await import('../models/user.model.js')).default,
            as: 'assignee',
            attributes: ['id', 'name', 'email']
          },
          { 
            model: (await import('../models/user.model.js')).default,
            as: 'creator',
            attributes: ['id', 'name', 'email']
          }
        ]
      });
    } else {
      // It's a plain object, just use it as is
      fullTask = task;
    }

    const response: any = {
      id: fullTask.id,
      title: fullTask.title,
      description: fullTask.description,
      status: fullTask.status,
      priority: fullTask.priority,
      dueDate: fullTask.dueDate,
      projectId: fullTask.projectId,
      createdAt: fullTask.createdAt,
      updatedAt: fullTask.updatedAt,
      // Handle both assignee and assignedTo naming
      assignedToId: (fullTask as any).assignedToId || (fullTask as any).assigneeId,
      createdById: (fullTask as any).createdById || (fullTask as any).creatorId
    };

    // Add associations if they exist
    if ('assignee' in fullTask) {
      response.assignee = (fullTask as any).assignee;
    } else if ('assignedTo' in fullTask) {
      response.assignee = (fullTask as any).assignedTo;
    }
    
    if ('creator' in fullTask) {
      response.creator = (fullTask as any).creator;
    } else if ('createdBy' in fullTask) {
      response.creator = (fullTask as any).createdBy;
    }

    return response;
  }
}

export const taskEventsService = TaskEventsService.getInstance();
