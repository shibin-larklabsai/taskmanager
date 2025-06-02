import { DataTypes, Model, Optional, Op } from 'sequelize';
import sequelize from '../config/database';
import type User from './user.model';
import type Project from './project.model';

export enum TaskStatus {
  TODO = 'TODO',
  IN_PROGRESS = 'IN_PROGRESS',
  IN_REVIEW = 'IN_REVIEW',
  DONE = 'DONE',
  BLOCKED = 'BLOCKED'
}

export enum TaskPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT'
}

export interface ITaskAttributes {
  id: number;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: Date | null;
  projectId: number;
  createdById: number;
  assignedToId: number | null;
  parentTaskId: number | null;
  completedAt: Date | null;
  estimatedHours: number | null;
  actualHours: number | null;
  order: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

type ITaskCreationAttributes = Optional<ITaskAttributes, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>;

export class Task extends Model<ITaskAttributes, ITaskCreationAttributes> implements ITaskAttributes {
  public id!: number;
  public title!: string;
  public description!: string | null;
  public status!: TaskStatus;
  public priority!: TaskPriority;
  public dueDate!: Date | null;
  public completedAt!: Date | null;
  public estimatedHours!: number | null;
  public actualHours!: number | null;
  public order!: number;
  public projectId!: number;
  public createdById!: number;
  public assignedToId!: number | null;
  public parentTaskId!: number | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
  public readonly deletedAt!: Date | null;
  
  // Associations
  public project?: Project;
  public createdBy?: User;
  public assignedTo?: User | null;
  public parentTask?: Task | null;
  public subtasks?: Task[];
  
  // Virtual getters
  public get isCompleted(): boolean {
    return this.status === TaskStatus.DONE;
  }
  
  public get isOverdue(): boolean {
    if (!this.dueDate || this.isCompleted) return false;
    return new Date() > new Date(this.dueDate);
  }
  
  // Model relationships
  public static associate(models: any): void {
    Task.belongsTo(models.Project, {
      foreignKey: 'projectId',
      as: 'project',
    });
    
    Task.belongsTo(models.User, {
      foreignKey: 'createdById',
      as: 'createdBy',
    });
    
    Task.belongsTo(models.User, {
      foreignKey: 'assignedToId',
      as: 'assignedTo',
    });
    
    Task.belongsTo(models.Task, {
      foreignKey: 'parentTaskId',
      as: 'parentTask',
    });
    
    Task.hasMany(models.Task, {
      foreignKey: 'parentTaskId',
      as: 'subtasks',
    });
  }
}

// Model initialization
Task.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'Title cannot be empty',
        },
        len: {
          args: [3, 255],
          msg: 'Title must be between 3 and 255 characters',
        },
      },
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM(...Object.values(TaskStatus)),
      allowNull: false,
      defaultValue: TaskStatus.TODO,
      validate: {
        isIn: {
          args: [Object.values(TaskStatus)],
          msg: `Status must be one of: ${Object.values(TaskStatus).join(', ')}`,
        },
      },
    },
    priority: {
      type: DataTypes.ENUM(...Object.values(TaskPriority)),
      allowNull: false,
      defaultValue: TaskPriority.MEDIUM,
      validate: {
        isIn: {
          args: [Object.values(TaskPriority)],
          msg: `Priority must be one of: ${Object.values(TaskPriority).join(', ')}`,
        },
      },
    },
    dueDate: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'due_date',
      validate: {
        isDate: true,
        isAfterNow: (value: Date | null) => {
          if (value) {
            const date = new Date(value);
            if (isNaN(date.getTime())) {
              throw new Error('Due date must be a valid date');
            }
            if (date <= new Date()) {
              throw new Error('Due date must be in the future');
            }
          }
          return true;
        },
      },
    },
    projectId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'project_id',
      references: {
        model: 'projects',
        key: 'id',
      },
      onDelete: 'CASCADE',
      validate: {
        async exists(value: number) {
          const project = await sequelize.models.Project.findByPk(value);
          if (!project) {
            throw new Error('Project does not exist');
          }
        },
      },
    },
    createdById: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'created_by_id',
      references: {
        model: 'users',
        key: 'id',
      },
    },
    assignedToId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'assigned_to_id',
      references: {
        model: 'users',
        key: 'id',
      },
      validate: {
        async exists(value: number | null) {
          if (value) {
            const user = await sequelize.models.User.findByPk(value);
            if (!user) {
              throw new Error('Assigned user does not exist');
            }
          }
        },
      },
    },
    parentTaskId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'parent_task_id',
      references: {
        model: 'tasks',
        key: 'id',
      },
      onDelete: 'CASCADE',
      validate: {
        notSelf(value: number | null) {
          if (value && (this as any).id && value === (this as any).id) {
            throw new Error('A task cannot be a parent of itself');
          }
        },
        async exists(value: number | null) {
          if (value) {
            const parent = await Task.findByPk(value);
            if (!parent) {
              throw new Error('Parent task does not exist');
            }
            if (parent.parentTaskId) {
              throw new Error('Nested subtasks are not allowed');
            }
          }
        },
      },
    },
    completedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'completed_at',
    },
    estimatedHours: {
      type: DataTypes.FLOAT,
      allowNull: true,
      field: 'estimated_hours',
      validate: {
        min: {
          args: [0],
          msg: 'Estimated hours must be a positive number',
        },
      },
    },
    actualHours: {
      type: DataTypes.FLOAT,
      allowNull: true,
      field: 'actual_hours',
      validate: {
        min: {
          args: [0],
          msg: 'Actual hours must be a positive number',
        },
      },
    },
    order: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: {
          args: [0],
          msg: 'Order must be a non-negative number',
        },
      },
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'created_at',
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'updated_at',
    },
    deletedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'deleted_at',
    },
  },
  {
    sequelize,
    modelName: 'Task',
    tableName: 'tasks',
    timestamps: true,
    paranoid: true,
    underscored: true,
    scopes: {
      withDeleted: {
        paranoid: false,
      },
      active: {
        where: {
          status: {
            [Op.not]: TaskStatus.DONE,
          },
        },
      },
      completed: {
        where: {
          status: TaskStatus.DONE,
        },
      },
      forProject(projectId: number) {
        return {
          where: { projectId },
        };
      },
      forUser(userId: number) {
        return {
          where: { assignedToId: userId },
        };
      },
    },
    defaultScope: {
      attributes: {
        exclude: ['deletedAt'],
      },
      order: [
        ['status', 'ASC'],
        ['order', 'ASC'],
        ['dueDate', 'ASC'],
      ],
      include: [
        { 
          association: 'createdBy', 
          attributes: ['id', 'name', 'email'],
        },
        { 
          association: 'assignedTo', 
          attributes: ['id', 'name', 'email'],
        },
      ],
    },
  }
);

// Hooks
Task.beforeCreate(async (task: Task) => {
  // Set default order to the next available number
  if (task.order === undefined) {
    const result = await Task.max<number, Task>('order', {
      where: {
        projectId: task.projectId,
        parentTaskId: task.parentTaskId || null,
      } as any,
    });
    task.order = (result as number || 0) + 1;
  }
});

// Update timestamps when status changes
Task.beforeUpdate(async (task: Task) => {
  if (task.changed('status') && task.status === TaskStatus.DONE && !task.completedAt) {
    task.completedAt = new Date();
  } else if (task.changed('status') && task.status !== TaskStatus.DONE && task.completedAt) {
    task.completedAt = null;
  }
});

export default Task;
