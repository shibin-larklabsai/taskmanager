import { Model, DataTypes, Optional } from 'sequelize';
import { sequelize } from '../config/database';
import { ProjectMember } from './project-member.model';
import { User } from './user.model';

export enum ProjectStatus {
  PLANNING = 'planning',
  IN_PROGRESS = 'in_progress',
  ON_HOLD = 'on_hold',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

interface ProjectAttributes {
  id: number;
  name: string;
  description: string | null;
  status: ProjectStatus;
  startDate: Date | null;
  endDate: Date | null;
  createdById: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

type ProjectCreationAttributes = Optional<ProjectAttributes, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>;

export class Project extends Model<ProjectAttributes, ProjectCreationAttributes> 
  implements ProjectAttributes {
  public id!: number;
  public name!: string;
  public description!: string | null;
  public status!: ProjectStatus;
  public startDate!: Date | null;
  public endDate!: Date | null;
  public createdById!: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
  public readonly deletedAt!: Date | null;

  // Associations
  public creator?: User;
  public projectMembers?: ProjectMember[];
  public members?: User[];

  public static initialize(sequelize: any, dataTypes: any) {
    return super.init(
      {
        id: {
          type: DataTypes.INTEGER,
          autoIncrement: true,
          primaryKey: true,
        },
        name: {
          type: DataTypes.STRING(100),
          allowNull: false,
          validate: {
            notEmpty: {
              msg: 'Project name is required',
            },
            len: {
              args: [2, 100],
              msg: 'Project name must be between 2 and 100 characters',
            },
          },
        },
        description: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        status: {
          type: DataTypes.ENUM(
            ProjectStatus.PLANNING,
            ProjectStatus.IN_PROGRESS,
            ProjectStatus.ON_HOLD,
            ProjectStatus.COMPLETED,
            ProjectStatus.CANCELLED
          ),
          defaultValue: ProjectStatus.PLANNING,
          allowNull: false,
        },
        startDate: {
          type: DataTypes.DATE,
          allowNull: true,
          validate: {
            isDate: {
              msg: 'Start date must be a valid date',
              args: true
            },
            isAfterCurrentDate: (value: Date) => {
              if (value && new Date(value) < new Date()) {
                throw new Error('Start date must be in the future');
              }
              return true;
            },
          },
        },
        endDate: {
          type: DataTypes.DATE,
          allowNull: true,
          validate: {
            isDate: {
              msg: 'End date must be a valid date',
              args: true
            },
            isAfterStartDate: (value: Date) => {
              if (value && this.startDate && new Date(value) <= new Date(this.startDate)) {
                throw new Error('End date must be after start date');
              }
              return true;
            },
          },
        },
        createdById: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: {
            model: 'users',
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT',
        },
      },
      {
        sequelize,
        modelName: 'Project',
        tableName: 'projects',
        timestamps: true,
        paranoid: true, // Enable soft deletes
        defaultScope: {
          include: [
            {
              model: User,
              as: 'creator',
              attributes: ['id', 'name', 'email'],
            },
          ],
        },
        scopes: {
          withMembers: {
            include: [
              {
                model: ProjectMember,
                as: 'projectMembers',
                include: [
                  {
                    model: User,
                    as: 'user',
                    attributes: ['id', 'name', 'email'],
                  },
                ],
              },
            ],
          },
        },
      }
    );
  }

  public static associate(models: any) {
    // Define associations here
    Project.belongsTo(models.User, {
      foreignKey: 'createdById',
      as: 'creator',
    });

    Project.hasMany(models.ProjectMember, {
      foreignKey: 'projectId',
      as: 'projectMembers',
    });

    Project.belongsToMany(models.User, {
      through: models.ProjectMember,
      as: 'members',
      foreignKey: 'projectId',
    });
  }
}

export default Project;
