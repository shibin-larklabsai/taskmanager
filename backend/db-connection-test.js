import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

const DB_NAME = process.env.DB_NAME || 'task_management';
const DB_USER = process.env.DB_USER || 'postgres';
const DB_PASSWORD = process.env.DB_PASSWORD || 'shibin';
const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = process.env.DB_PORT || '5000';

console.log('Testing database connection with the following settings:');
console.log(`- Host: ${DB_HOST}:${DB_PORT}`);
console.log(`- Database: ${DB_NAME}`);
console.log(`- User: ${DB_USER}`);

async function testConnection() {
  const sequelize = new Sequelize({
    database: DB_NAME,
    username: DB_USER,
    password: DB_PASSWORD,
    host: DB_HOST,
    port: parseInt(DB_PORT, 10),
    dialect: 'postgres',
    logging: console.log,
    dialectOptions: {
      ssl: false,
      connectTimeout: 10000,
    },
    retry: {
      max: 3,
    },
  });

  try {
    await sequelize.authenticate();
    console.log('✅ Connection has been established successfully.');
    
    // Test a simple query
    const [results] = await sequelize.query('SELECT 1 as test;');
    console.log('✅ Test query results:', results);
    
    // Check if database exists and is accessible
    const [dbResult] = await sequelize.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      { bind: [DB_NAME] }
    );
    
    if (dbResult.length > 0) {
      console.log(`✅ Database '${DB_NAME}' exists and is accessible`);
    } else {
      console.log(`❌ Database '${DB_NAME}' does not exist`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Unable to connect to the database:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

testConnection();
