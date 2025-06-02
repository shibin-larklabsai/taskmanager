const { Sequelize } = require('sequelize');
const config = require('../config/config.json');

async function checkMembers() {
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

    // Get all members of Project 1 with user details
    const [members] = await sequelize.query(`
      SELECT pm.*, u.email, u.name 
      FROM project_members pm
      JOIN users u ON pm.user_id = u.id
      WHERE pm.project_id = 1
    `);
    
    console.log('Project 1 Members:', JSON.stringify(members, null, 2));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await sequelize.close();
  }
}

checkMembers();
