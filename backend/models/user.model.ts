import { Model, DataTypes, Optional } from 'sequelize';
import { sequelize } from '../config/database';

interface UserAttributes {
  id: number;
  name: string;
  email: string;
  password: string;
  resetPasswordToken?: string | null;
  resetPasswordExpires?: Date | null;
  emailVerificationToken?: string | null;
  emailVerified: boolean;
  lastLogin?: Date | null;
  loginAttempts: number;
  lockUntil?: number | null;
  status: 'active' | 'inactive' | 'suspended' | 'pending';
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

type UserCreationAttributes = Optional<UserAttributes, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>;

export class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
  public id!: number;
  public name!: string;
  public email!: string;
  public password!: string;
  public resetPasswordToken!: string | null;
  public resetPasswordExpires!: Date | null;
  public emailVerificationToken!: string | null;
  public emailVerified!: boolean;
  public lastLogin!: Date | null;
  public loginAttempts!: number;
  public lockUntil!: number | null;
  public status!: 'active' | 'inactive' | 'suspended' | 'pending';
  // Timestamps
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
  public readonly deletedAt!: Date | null;

  // Associations
  public projects?: Project[];
  public projectMembers?: ProjectMember[];

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
              msg: 'Name is required',
            },
            len: {
              args: [2, 100],
              msg: 'Name must be between 2 and 100 characters',
            },
          },
        },
        email: {
          type: DataTypes.STRING(100),
          allowNull: false,
          unique: true,
          validate: {
            isEmail: {
              msg: 'Please provide a valid email address',
            },
            notEmpty: {
              msg: 'Email is required',
            },
          },
        },
        password: {
          type: DataTypes.STRING(100),
          allowNull: false,
          validate: {
            notEmpty: {
              msg: 'Password is required',
            },
            len: {
              args: [8, 100],
              msg: 'Password must be at least 8 characters long',
            },
          },
        },
        resetPasswordToken: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        resetPasswordExpires: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        emailVerificationToken: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        emailVerified: {
          type: DataTypes.BOOLEAN,
          defaultValue: false,
          allowNull: false,
        },
        lastLogin: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        loginAttempts: {
          type: DataTypes.INTEGER,
          defaultValue: 0,
          allowNull: false,
        },
        lockUntil: {
          type: DataTypes.BIGINT,
          allowNull: true,
        },
        status: {
          type: DataTypes.ENUM('active', 'inactive', 'suspended', 'pending'),
          defaultValue: 'pending',
          allowNull: false,
        },
      },
      {
        sequelize,
        modelName: 'User',
        tableName: 'users',
        paranoid: true, // Enable soft deletes
        timestamps: true,
        defaultScope: {
          attributes: { exclude: ['password', 'resetPasswordToken', 'resetPasswordExpires', 'emailVerificationToken'] },
        },
        scopes: {
          withPassword: {
            attributes: { include: ['password'] },
          },
          withTokens: {
            attributes: { include: ['resetPasswordToken', 'resetPasswordExpires', 'emailVerificationToken'] },
          },
        },
      }
    );
  }

  public static associate(models: any) {
    // Define associations here
    User.hasMany(models.Project, {
      foreignKey: 'createdById',
      as: 'createdProjects',
    });

    User.belongsToMany(models.Project, {
      through: models.ProjectMember,
      as: 'projects',
      foreignKey: 'userId',
    });

    User.hasMany(models.ProjectMember, {
      foreignKey: 'userId',
      as: 'projectMembers',
    });
  }
}

export default User;
