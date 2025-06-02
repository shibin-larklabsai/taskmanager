import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';
import type User from './user.model';

export enum ProjectStatus {
  PLANNING = 'PLANNING',
  IN_PROGRESS = 'IN_PROGRESS',
  ON_HOLD = 'ON_HOLD',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

export interface IProjectAttributes {
  id: number;
  name: string;
  description: string | null;
  status: ProjectStatus;
  startDate: Date | null;
  endDate: Date | null;
  createdById: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

type IProjectCreationAttributes = Optional<IProjectAttributes, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>;

export class Project extends Model<IProjectAttributes, IProjectCreationAttributes> 
  implements IProjectAttributes {
  public id!: number;
  public name!: string;
  public description!: string | null;
  public status!: ProjectStatus;
  public startDate!: Date | null;
  public endDate!: Date | null;
  public createdById!: number;
  
  // Timestamps
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
  public readonly deletedAt!: Date | null;
  
  // Associations
  public creator?: User;
  
  // Define the associate method for model relationships
  public static associate(models: any): void {
    // Project belongs to a creator (User)
    Project.belongsTo(models.User, {
      foreignKey: 'createdById',
      as: 'creator'
    });

    // Project has many members (Users) through ProjectMember
    Project.belongsToMany(models.User, {
      through: models.ProjectMember,
      foreignKey: 'projectId',
      otherKey: 'userId',
      as: 'members'
    });

    // Project has many project members
    Project.hasMany(models.ProjectMember, {
      foreignKey: 'projectId',
      as: 'projectMembers'
    });
  }
  public members?: User[];
}

Project.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      field: 'id'
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: 'name',
      validate: {
        notEmpty: {
          msg: 'Project name cannot be empty',
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
      field: 'description'
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
      field: 'status'
    },
    startDate: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'start_date',
      validate: {
        notEmpty: {
          msg: 'Start date is required'
        },
      },
    },
    endDate: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'end_date',
      validate: {
        isDate: {
          msg: 'End date must be a valid date',
          args: true
        },
        isAfterStartDate: function(this: IProjectAttributes, value: Date | null) {
          if (value && this.startDate) {
            const endDate = new Date(value);
            const startDate = new Date(this.startDate);
            if (endDate <= startDate) {
              throw new Error('End date must be after start date');
            }
          }
          return true;
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
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT',
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
    modelName: 'Project',
    tableName: 'projects',
    timestamps: true,
    paranoid: true,
    underscored: true,
    defaultScope: {
      attributes: {
        exclude: ['deleted_at']
      }
    },
    scopes: {
      withDeleted: {
        paranoid: false
      }
    }
  }
);

export default Project;
