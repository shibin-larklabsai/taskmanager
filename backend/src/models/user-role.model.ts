import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export interface IUserRoleAttributes {
  userId: number;
  roleId: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export type IUserRoleCreationAttributes = Optional<IUserRoleAttributes, 'createdAt' | 'updatedAt'>;

class UserRole extends Model<IUserRoleAttributes, IUserRoleCreationAttributes> 
  implements IUserRoleAttributes {
  public userId!: number;
  public roleId!: number;
  
  // Timestamps
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
  
  // Associations
  public static associate(models: any): void {
    // Defined in the index file
  }
}

UserRole.init(
  {
    userId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      references: {
        model: 'users',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    roleId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      references: {
        model: 'roles',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
  },
  {
    sequelize,
    modelName: 'UserRole',
    tableName: 'user_roles',
    timestamps: true,
    underscored: true,
  },
);

export default UserRole;
