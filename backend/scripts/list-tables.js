const { Sequelize } = require('sequelize');
require('dotenv').config();

async function listTables() {
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
    await sequelize.authenticate();
    console.log('Connected to the database successfully.');
    
    const [results] = await sequelize.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"
    );
    
    console.log('\nTables in the database:');
    results.forEach(row => {
      console.log(`- ${row.table_name}`);
    });
    
    // Check users table
    try {
      const [users] = await sequelize.query('SELECT * FROM users');
      console.log('\nUsers in the database:');
      console.log(users);
    } catch (error) {
      console.log('\nNo users table found or error querying users:', error);
    }
    
  } catch (error) {
    console.error('Error connecting to the database:', error);
  } finally {
    await sequelize.close();
  }
}

listTables();
