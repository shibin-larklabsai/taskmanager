import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

async function checkDatabase() {
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

  try {
    // Test the connection
    await sequelize.authenticate();
    console.log('Connection has been established successfully.');

    // Check if users table exists
    const [tables] = await sequelize.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"
    );
    console.log('\nTables in database:');
    console.table(tables);

    // Check users table structure
    try {
      const [columns] = await sequelize.query(
        `SELECT column_name, data_type, is_nullable 
         FROM information_schema.columns 
         WHERE table_name = 'users'`
      );
      console.log('\nUsers table columns:');
      console.table(columns);

      // Check if there are any users
      const [users] = await sequelize.query('SELECT * FROM users');
      console.log('\nUsers in database:');
      console.table(users);
    } catch (error) {
      console.error('\nError checking users table:', error);
    }

  } catch (error) {
    console.error('Unable to connect to the database:', error);
  } finally {
    await sequelize.close();
  }
}

checkDatabase();
