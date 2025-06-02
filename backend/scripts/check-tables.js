import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

const sequelize = new Sequelize(
  process.env.DB_NAME || 'task_management',
  process.env.DB_USER || 'postgres',
  process.env.DB_PASSWORD || 'shibin',
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 5432,
    dialect: 'postgres',
    logging: console.log
  }
);

async function checkTables() {
  try {
    await sequelize.authenticate();
    console.log('Connection has been established successfully.');
    
    // Get all tables
    const [results] = await sequelize.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"
    );
    
    console.log('Tables in database:');
    results.forEach(row => {
      console.log(`- ${row.table_name}`);
    });
    
    // Check if users table exists and has data
    try {
      const [userTables] = await sequelize.query("SELECT * FROM users LIMIT 5");
      console.log('\nFirst 5 users:');
      console.log(userTables);
    } catch (error) {
      console.log('\nError querying users table. It might not exist yet.');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await sequelize.close();
  }
}

checkTables();
