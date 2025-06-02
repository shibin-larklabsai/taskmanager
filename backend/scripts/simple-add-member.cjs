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

    // First, check if the member already exists
    const [existing] = await sequelize.query(
      'SELECT * FROM project_members WHERE project_id = 1 AND user_id = 11'
    );

    if (existing.length > 0) {
      console.log('User is already a member of this project:', existing[0]);
    } else {
      // Add test user (ID 11) as member of Project 1 with OWNER role
      const [result] = await sequelize.query(
        `INSERT INTO project_members (project_id, user_id, role, created_at, updated_at)
         VALUES (1, 11, 'OWNER', NOW(), NOW())
         RETURNING *`
      );
      console.log('Successfully added test user as member of Project 1:', result[0]);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await sequelize.close();
  }
}

addMember();
