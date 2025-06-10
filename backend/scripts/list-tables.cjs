const { Sequelize } = require('sequelize');
const config = require('../config/config.json');

async function listTables() {
  // Use the development configuration
  const dbConfig = config.development;
  
  const sequelize = new Sequelize(
    dbConfig.database,
    dbConfig.username,
    dbConfig.password,
    {
      host: dbConfig.host,
      port: dbConfig.port,
      dialect: dbConfig.dialect,
      logging: console.log
    }
  );

  try {
    await sequelize.authenticate();
    console.log('Connection has been established successfully.');

    // List all tables in the database
    const [tables] = await sequelize.query(
      `SELECT table_name 
       FROM information_schema.tables 
       WHERE table_schema = 'public' 
       AND table_type = 'BASE TABLE'`
    );
    
    console.log('Database tables:', JSON.stringify(tables, null, 2));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await sequelize.close();
  }
}

listTables();
