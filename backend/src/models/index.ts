import { Sequelize } from 'sequelize';
import sequelize from '../config/database.js';
import User from './user.model.js';
import Role from './role.model.js';
import UserRole from './user-role.model.js';
import Project from './project.model.js';
import ProjectMember from './project-member.model.js';

// Define the database object type
type Models = {
  User: typeof User;
  Role: typeof Role;
  UserRole: typeof UserRole;
  Project: typeof Project;
  ProjectMember: typeof ProjectMember;
  [key: string]: any;
};

// Define the ModelStatic interface for better type safety
interface ModelStatic {
  associate?: (models: Models) => void;
  [key: string]: any;
}

// Initialize models
const db = {
  sequelize,
  Sequelize,
  User,
  Role,
  UserRole,
  Project,
  ProjectMember
};

// Set up associations
Object.keys(db).forEach(modelName => {
  const model = db[modelName as keyof typeof db] as unknown as ModelStatic;
  if (model?.associate) {
    model.associate(db);
  }
});

// Define User-Role many-to-many association
if (User && Role && UserRole) {
  // User belongs to many Roles (and vice versa) through UserRole
  User.belongsToMany(Role, {
    through: UserRole,
    foreignKey: 'userId',
    otherKey: 'roleId',
    as: 'roles'
  });

  Role.belongsToMany(User, {
    through: UserRole,
    foreignKey: 'roleId',
    otherKey: 'userId',
    as: 'users'
  });
}

// All associations are now defined in their respective model files

export { sequelize, User, Role, UserRole, Project, ProjectMember };
export default db;
