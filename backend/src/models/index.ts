import { Sequelize } from 'sequelize';
import sequelize from '../config/database.js';
import User from './user.model.js';
import Role from './role.model.js';
import UserRole from './user-role.model.js';
import Project from './project.model.js';
import ProjectMember from './project-member.model.js';
import Task from './task.model.js';
import { Comment } from './comment.model.js';

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
  ProjectMember,
  Task,
  Comment
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

// Project-User many-to-many associations are defined in their respective model files

// Define Comment associations
if (Comment && User && Project) {
  // Comment belongs to User
  Comment.belongsTo(User, {
    foreignKey: 'userId',
    as: 'user',
  });

  // Comment belongs to Project
  Comment.belongsTo(Project, {
    foreignKey: 'projectId',
    as: 'project',
  });

  // User has many Comments
  User.hasMany(Comment, {
    foreignKey: 'userId',
    as: 'comments',
  });

  // Project has many Comments
  Project.hasMany(Comment, {
    foreignKey: 'projectId',
    as: 'comments',
  });
}

// All associations are now defined in their respective model files

export { sequelize, User, Role, UserRole, Project, ProjectMember, Task, Comment };
export default db;
