import { Task, User } from '../models';
import { ITask, ICreateTaskInput, IUpdateTaskInput } from '../interfaces/task.interface';
import { NotFoundError } from '../utils/errors';

export class TaskService {
  /**
   * Create a new task
   */
  public async createTask(data: ICreateTaskInput): Promise<ITask> {
    return await Task.create({
      ...data,
      status: data.status || 'TODO'
    });
  }

  /**
   * Get task by ID with assigned user details
   */
  public async getTaskById(id: string): Promise<ITask | null> {
    return await Task.findByPk(id, {
      include: [
        {
          model: User,
          as: 'assignedUser',
          attributes: ['id', 'name', 'email']
        }
      ]
    });
  }

  /**
   * Get all tasks for a project
   */
  public async getProjectTasks(projectId: string): Promise<ITask[]> {
    return await Task.findAll({
      where: { projectId },
      include: [
        {
          model: User,
          as: 'assignedUser',
          attributes: ['id', 'name', 'email']
        }
      ],
      order: [['createdAt', 'DESC']]
    });
  }

  /**
   * Update a task
   */
  public async updateTask(id: string, data: IUpdateTaskInput): Promise<ITask> {
    const task = await Task.findByPk(id);
    if (!task) {
      throw new NotFoundError('Task not found');
    }

    return await task.update(data);
  }

  /**
   * Delete a task
   */
  public async deleteTask(id: string): Promise<boolean> {
    const deleted = await Task.destroy({
      where: { id }
    });
    
    if (deleted === 0) {
      throw new NotFoundError('Task not found');
    }
    
    return true;
  }


  /**
   * Get tasks assigned to a user
   */
  public async getUserAssignedTasks(userId: string): Promise<ITask[]> {
    return await Task.findAll({
      where: { assignedTo: userId },
      include: [
        {
          model: User,
          as: 'createdByUser',
          attributes: ['id', 'name', 'email']
        }
      ],
      order: [['createdAt', 'DESC']]
    });
  }
}

export default new TaskService();
