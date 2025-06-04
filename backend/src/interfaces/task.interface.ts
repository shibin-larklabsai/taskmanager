import { Model } from 'sequelize';

export interface ITask {
  id: string;
  title: string;
  description?: string;
  status: 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE';
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  dueDate?: Date;
  projectId: string;
  assignedTo?: string;
  createdBy: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ITaskModel extends Model<ITask>, ITask {}

export interface ICreateTaskInput {
  title: string;
  description?: string;
  status?: 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE';
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  dueDate?: Date;
  projectId: string;
  assignedTo?: string;
  createdBy: string;
}

export interface IUpdateTaskInput {
  title?: string;
  description?: string;
  status?: 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE';
  priority?: 'LOW' | 'MEDIUM' | 'HIGH';
  dueDate?: Date;
  assignedTo?: string | null;
}
