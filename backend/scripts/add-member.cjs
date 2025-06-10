const { Sequelize } = require('sequelize');
const config = require('../config/config.json');

async function addMember() {
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

    // Add test user (ID 11) as member of Project 1 with OWNER role
    const [result] = await sequelize.query(
      `INSERT INTO project_members (project_id, user_id, role, created_at, updated_at)
       VALUES (1, 11, 'OWNER', NOW(), NOW())
       ON CONFLICT (project_id, user_id) 
       DO UPDATE SET role = 'OWNER', updated_at = NOW()
       RETURNING *`
    );
    
    console.log('Successfully added test user as member of Project 1:', JSON.stringify(result, null, 2));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await sequelize.close();
  }
}

addMember();
