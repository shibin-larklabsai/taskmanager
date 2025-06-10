import { DataTypes, Model, Optional } from 'sequelize';
import bcrypt from 'bcryptjs';
import sequelize from '../config/database.js'; // Added .js extension for ES modules

export interface IUserAttributes {
  id: number;
  email: string;
  password: string;
  name: string;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
}

export type IUserCreationAttributes = Optional<IUserAttributes, 'id'>;

class User extends Model<IUserAttributes, IUserCreationAttributes> implements IUserAttributes {
  public id!: number;
  public email!: string;
  public password!: string;
  public name!: string;
  
  // Timestamps
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
  public readonly deletedAt!: Date | null;
  
  // Associations
  public static associate(models: any): void {
    // User can create many projects
    User.hasMany(models.Project, {
      foreignKey: 'createdById',
      as: 'createdProjects'
    });

    // User can be a member of many projects
    User.belongsToMany(models.Project, {
      through: models.ProjectMember,
      foreignKey: 'userId',
      otherKey: 'projectId',
      as: 'projects'
    });

    // User has many project memberships
    User.hasMany(models.ProjectMember, {
      foreignKey: 'userId',
      as: 'projectMembers'
    });
  }
}

User.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      field: 'id'
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      field: 'email',
      validate: {
        isEmail: {
          msg: 'Please provide a valid email address',
        },
        notEmpty: {
          msg: 'Email cannot be empty',
        },
      },
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'password',
      validate: {
        notEmpty: {
          msg: 'Password cannot be empty',
        },
        len: {
          args: [8, 100],
          msg: 'Password must be between 8 and 100 characters long',
        },
      },
      // Getter and setter for password
      get() {
        return this.getDataValue('password');
      },
      set(value: string) {
        // Only hash if the value is not already hashed
        if (value && !value.startsWith('$2a$') && !value.startsWith('$2b$') && !value.startsWith('$2y$')) {
          // The actual hashing will be done in the beforeCreate/beforeUpdate hooks
          this.setDataValue('password', value);
        } else {
          this.setDataValue('password', value);
        }
      }
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: 'name',
      validate: {
        notEmpty: {
          msg: 'Name cannot be empty',
        },
        len: {
          args: [2, 100],
          msg: 'Name must be between 2 and 100 characters long',
        },
      },
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
    modelName: 'User',
    tableName: 'users',
    paranoid: true, // Enable soft deletes
    timestamps: true,
    hooks: {
      // Ensure password is hashed before creating/updating
      beforeCreate: async (user: User) => {
        if (user.password) {
          console.log('\n🔑 Hashing new password during user creation');
          console.log('Original password length:', user.password.length);
          
          // Check if password is already hashed
          const isAlreadyHashed = user.password.startsWith('$2a$') || 
                                user.password.startsWith('$2b$') || 
                                user.password.startsWith('$2y$');
          
          if (isAlreadyHashed) {
            console.log('Password is already hashed, skipping rehashing');
            return;
          }
          
          const salt = await bcrypt.genSalt(10);
          const hash = await bcrypt.hash(user.password, salt);
          console.log('Password hashed successfully');
          console.log('Hash length:', hash.length);
          console.log('Hash starts with:', hash.substring(0, 10) + '...');
          
          // Verify the hash
          const isValid = await bcrypt.compare(user.password, hash);
          console.log('Hash verification:', isValid ? '✅ PASSED' : '❌ FAILED');
          
          if (!isValid) {
            throw new Error('Failed to generate valid password hash');
          }
          
          user.password = hash;
        }
      },
      beforeUpdate: async (user: User) => {
        if (user.changed('password') && user.password) {
          console.log('\n🔄 Updating password hash');
          console.log('New password length:', user.password.length);
          
          // Check if password is already hashed
          const isAlreadyHashed = user.password.startsWith('$2a$') || 
                                user.password.startsWith('$2b$') || 
                                user.password.startsWith('$2y$');
          
          if (isAlreadyHashed) {
            console.log('Password is already hashed, skipping rehashing');
            return;
          }
          
          const salt = await bcrypt.genSalt(10);
          const hash = await bcrypt.hash(user.password, salt);
          console.log('Password rehashed successfully');
          
          user.password = hash;
        }
      }
    },
    defaultScope: {
      attributes: { exclude: ['password'] },
    },
    scopes: {
      // Explicitly include password when needed
      withPassword: {
        attributes: { include: ['password'] },
      },
      // For login - include only necessary fields
      login: {
        attributes: ['id', 'email', 'password', 'name']
      }
    },
  },
);

// Export the User class as the default export
export default User;
