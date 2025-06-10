import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

// Interface for the model attributes
export interface INotificationAttributes {
  id: number;
  userId: number;
  message: string;
  type: 'comment' | 'mention' | 'status_change' | 'project_update';
  read: boolean;
  link?: string | null;
  projectId?: number | null;
  commentId?: number | null;
  createdAt?: Date;
  updatedAt?: Date;
}

// Interface for creation attributes (optional fields marked with ?)
interface INotificationCreationAttributes extends Omit<INotificationAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

// Model definition
export class Notification extends Model<INotificationAttributes, INotificationCreationAttributes> implements INotificationAttributes {
  public id!: number;
  public userId!: number;
  public message!: string;
  public type!: 'comment' | 'mention' | 'status_change' | 'project_update';
  public read!: boolean;
  public link?: string;
  public projectId?: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

// Model initialization
Notification.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'user_id',
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    message: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    type: {
      type: DataTypes.ENUM('comment', 'mention', 'status_change', 'project_update'),
      allowNull: false,
      defaultValue: 'comment',
    },
    read: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    link: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    projectId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'project_id',
      references: {
        model: 'projects',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    commentId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'comment_id',
      references: {
        model: 'comments',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'created_at',
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'updated_at',
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    modelName: 'Notification',
    tableName: 'notifications',
    timestamps: true,
    underscored: true,
  }
);

export default Notification;
