import { Sequelize } from 'sequelize';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Debug: Log all environment variables starting with DB_
console.log('Environment Variables:', Object.entries(process.env)
  .filter(([key]) => key.startsWith('DB_'))
  .reduce((obj, [key, val]) => ({
    ...obj,
    [key]: key.includes('PASSWORD') ? '***' : val
  }), {}));

const {
  DB_NAME = 'task_management',
  DB_USER = 'postgres',
  DB_PASSWORD = 'shibin',
  DB_HOST = 'localhost',
  DB_PORT = '5432', // Default PostgreSQL port
  NODE_ENV = 'development',
} = process.env;

console.log('Database Configuration:', {
  DB_NAME,
  DB_USER,
  DB_HOST,
  DB_PORT,
  NODE_ENV,
  'DB_PASSWORD': DB_PASSWORD ? '***' : 'Not set'
});

// Custom logging function to show only important messages
const logger = (msg: string) => {
  // Only log if it's a connection message or an error
  if (msg.includes('Executing') || msg.includes('SELECT 1+1')) {
    return; // Skip these messages
  }
  console.log(msg);
};

// Use connection string format which is more reliable
const connectionString = `postgres://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}`;
console.log('Connecting to database with connection string:', 
  `postgres://${DB_USER}:*****@${DB_HOST}:${DB_PORT}/${DB_NAME}`);

const sequelize = new Sequelize(connectionString, {
  dialect: 'postgres',
  logging: NODE_ENV === 'development' ? logger : false,
  define: {
    timestamps: true,
    underscored: true,
  },
  retry: {
    max: 3,
    timeout: 30000,
    backoffBase: 1000,
    backoffExponent: 1.5,
  },
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
  dialectOptions: {
    ssl: false,
    connectTimeout: 10000,
  },
});

const testConnection = async (): Promise<void> => {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection has been established successfully.');
  } catch (error) {
    console.error('❌ Unable to connect to the database:', error);
    throw error;
  }
};

export { testConnection, sequelize };

export default sequelize;
