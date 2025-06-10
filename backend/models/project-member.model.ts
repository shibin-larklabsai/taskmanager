import { Model, DataTypes, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export enum ProjectRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  MEMBER = 'member',
  VIEWER = 'viewer',
}

interface ProjectMemberAttributes {
  id: number;
  projectId: number;
  userId: number;
  role: ProjectRole;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

type ProjectMemberCreationAttributes = Optional<ProjectMemberAttributes, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>;

export class ProjectMember extends Model<ProjectMemberAttributes, ProjectMemberCreationAttributes> 
  implements ProjectMemberAttributes {
  public id!: number;
  public projectId!: number;
  public userId!: number;
  public role!: ProjectRole;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
  public readonly deletedAt!: Date | null;

  // Associations
  public project?: Project;
  public user?: User;

  public static initialize(sequelize: any, dataTypes: any) {
    return super.init(
      {
        id: {
          type: DataTypes.INTEGER,
          autoIncrement: true,
          primaryKey: true,
        },
        projectId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: {
            model: 'projects',
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        userId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: {
            model: 'users',
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        role: {
          type: DataTypes.ENUM(
            ProjectRole.OWNER,
            ProjectRole.ADMIN,
            ProjectRole.MEMBER,
            ProjectRole.VIEWER
          ),
          defaultValue: ProjectRole.VIEWER,
          allowNull: false,
        },
      },
      {
        sequelize,
        modelName: 'ProjectMember',
        tableName: 'project_members',
        timestamps: true,
        paranoid: true, // Enable soft deletes
        indexes: [
          {
            unique: true,
            fields: ['projectId', 'userId'],
            name: 'project_members_project_id_user_id_unique',
          },
        ],
      }
    );
  }

  public static associate(models: any) {
    // Define associations here
    ProjectMember.belongsTo(models.Project, {
      foreignKey: 'projectId',
      as: 'project',
    });

    ProjectMember.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user',
    });
  }
}

export default ProjectMember;
