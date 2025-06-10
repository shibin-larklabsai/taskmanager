import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';
import type User from './user.model';
import type { Project } from './project.model';

// Define interfaces for better type safety
export enum ProjectRole {
  OWNER = 'OWNER',
  MANAGER = 'MANAGER',
  DEVELOPER = 'DEVELOPER',
  DESIGNER = 'DESIGNER',
  TESTER = 'TESTER',
  VIEWER = 'VIEWER'
}

export interface IProjectMemberAttributes {
  id: number;
  projectId: number;
  userId: number;
  role: ProjectRole;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

type IProjectMemberCreationAttributes = Optional<IProjectMemberAttributes, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>;

export class ProjectMember extends Model<IProjectMemberAttributes, IProjectMemberCreationAttributes> implements IProjectMemberAttributes {
  // Define the associate method for model relationships
  public static associate(models: any): void {
    // ProjectMember belongs to a Project
    ProjectMember.belongsTo(models.Project, {
      foreignKey: 'projectId',
      as: 'project'
    });

    // ProjectMember belongs to a User
    ProjectMember.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });
  }
  public id!: number;
  public projectId!: number;
  public userId!: number;
  public role!: ProjectRole;
  
  // Timestamps
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
  public readonly deletedAt!: Date | null;
  
  // Associations
  public project?: Project;
  public user?: User;
}

ProjectMember.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      field: 'id'
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
    role: {
      type: DataTypes.ENUM(
        ProjectRole.OWNER,
        ProjectRole.MANAGER,
        ProjectRole.DEVELOPER,
        ProjectRole.DESIGNER,
        ProjectRole.TESTER,
        ProjectRole.VIEWER
      ),
      allowNull: false,
      defaultValue: ProjectRole.VIEWER,
      field: 'role'
    },
    createdAt: {
      type: DataTypes.DATE,
      field: 'created_at'
    },
    updatedAt: {
      type: DataTypes.DATE,
      field: 'updated_at'
    },
    deletedAt: {
      type: DataTypes.DATE,
      field: 'deleted_at'
    }
  },
  {
    sequelize,
    modelName: 'ProjectMember',
    tableName: 'project_members',
    timestamps: true,
    paranoid: true,
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ['project_id', 'user_id'],
        name: 'unique_project_user'
      }
    ],
    defaultScope: {
      attributes: {
        exclude: ['deletedAt']
      }
    },
    scopes: {
      withDeleted: {
        paranoid: false
      }
    }
  }
);

// Export the ProjectMember class and types
export type { IProjectMemberCreationAttributes };
export default ProjectMember;
