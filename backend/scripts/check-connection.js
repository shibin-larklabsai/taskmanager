const { Sequelize } = require('sequelize');
require('dotenv').config();

async function checkConnection() {
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
    console.log('✅ Connection has been established successfully.');
    
    // List all tables
    const [tables] = await sequelize.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"
    );
    
    console.log('\nTables in the database:');
    console.table(tables);
    
    // Check if users table exists
    try {
      const [users] = await sequelize.query('SELECT * FROM users');
      console.log('\nUsers in the database:');
      console.table(users);
    } catch (err) {
      console.log('\nError querying users table:', err.message);
    }
    
  } catch (error) {
    console.error('❌ Unable to connect to the database:', error);
  } finally {
    await sequelize.close();
  }
}

checkConnection();
