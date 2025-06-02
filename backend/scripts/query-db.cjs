const { Sequelize } = require('sequelize');
const config = require('../config/config.json');

async function queryDatabase() {
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

    // Query projects
    const [projects] = await sequelize.query('SELECT * FROM "Projects"');
    console.log('Projects:', JSON.stringify(projects, null, 2));

    // Query project members
    const [members] = await sequelize.query('SELECT * FROM "ProjectMembers"');
    console.log('Project Members:', JSON.stringify(members, null, 2));

    // Query users
    const [users] = await sequelize.query('SELECT * FROM "Users"');
    console.log('Users:', JSON.stringify(users, null, 2));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await sequelize.close();
  }
}

queryDatabase();
