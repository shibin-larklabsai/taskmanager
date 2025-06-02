import { Sequelize, DataTypes } from 'sequelize';
import config from '../config/config.json';
import { User } from './user.model';
import { Project } from './project.model';
import { ProjectMember } from './project-member.model';

const env = process.env.NODE_ENV || 'development';
const dbConfig = config[env as keyof typeof config];

const sequelize = new Sequelize(
  dbConfig.database,
  dbConfig.username,
  dbConfig.password,
  {
    host: dbConfig.host,
    port: dbConfig.port,
    dialect: dbConfig.dialect,
    logging: dbConfig.logging || false,
  }
);

// Initialize models
const db = {
  User: User.initialize(sequelize, DataTypes),
  Project: Project.initialize(sequelize, DataTypes),
  ProjectMember: ProjectMember.initialize(sequelize, DataTypes),
  sequelize,
  Sequelize,
};

// Set up associations
Object.values(db).forEach((model: any) => {
  if (model.associate) {
    model.associate(db);
  }
});

export default db;
