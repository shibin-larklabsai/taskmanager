import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

// Export the Role model and its types
export interface IRoleAttributes {
  id: number;
  name: string;
  description?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
}

export type IRoleCreationAttributes = Optional<IRoleAttributes, 'id'>;

class Role extends Model<IRoleAttributes, IRoleCreationAttributes> implements IRoleAttributes {
  public id!: number;
  public name!: string;
  public description!: string | null;
  
  // Timestamps
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
  public readonly deletedAt!: Date | null;
  
  // Associations
  public static associate(models: any): void {
    // Defined in the index file
  }
}

Role.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: {
          msg: 'Role name cannot be empty',
        },
        len: {
          args: [2, 50],
          msg: 'Role name must be between 2 and 50 characters long',
        },
      },
    },
    description: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: 'Role',
    tableName: 'roles',
    paranoid: true, // Enable soft deletes
    timestamps: true,
  },
);

export default Role;
