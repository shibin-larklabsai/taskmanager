import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

export interface CommentAttributes {
  id?: number;
  content: string;
  projectId: number;
  userId: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export class Comment extends Model<CommentAttributes> implements CommentAttributes {
  public id!: number;
  public content!: string;
  public projectId!: number;
  public userId!: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Comment.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'Comment content cannot be empty',
        },
        len: {
          args: [1, 2000],
          msg: 'Comment must be between 1 and 2000 characters',
        },
      },
    },
    projectId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'projects',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
  },
  {
    sequelize,
    modelName: 'comment',
    tableName: 'comments',
    timestamps: true,
    underscored: true,
  }
);

export default Comment;
