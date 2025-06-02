import { Sequelize } from 'sequelize';

async function testConnection() {
  const sequelize = new Sequelize({
    database: 'task_manager',
    username: 'postgres',
    password: 'shibin',
    host: 'localhost',
    port: 5000,
    dialect: 'postgres',
    logging: console.log,
    dialectOptions: {
      ssl: false,
      connectTimeout: 10000,
    },
  });

  try {
    await sequelize.authenticate();
    console.log('✅ Connection has been established successfully.');
    
    // Test query
    const [results] = await sequelize.query('SELECT 1+1 AS result');
    console.log('✅ Test query result:', results);
    
    // Check if database exists
    const [dbExists] = await sequelize.query(
      "SELECT 1 FROM pg_database WHERE datname = 'task_management'"
    );
    console.log('✅ Database exists:', dbExists.length > 0);
    
    if (dbExists.length === 0) {
      console.log('⚠️  Database does not exist. Creating database...');
      await sequelize.query('CREATE DATABASE task_management');
      console.log('✅ Database created successfully');
    }
    
  } catch (error) {
    console.error('❌ Unable to connect to the database:', error);
  } finally {
    await sequelize.close();
  }
}

testConnection();
