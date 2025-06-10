const { sequelize } = require('../src/config/database');
const { Project, ProjectMember, User } = require('../src/models');

async function checkProjects() {
  try {
    await sequelize.authenticate();
    console.log('Database connection established successfully.');

    // Get all projects with their members
    const projects = await Project.findAll({
      include: [
        { 
          model: User, 
          as: 'creator', 
          attributes: ['id', 'name', 'email'] 
        },
        { 
          model: ProjectMember,
          include: [
            { 
              model: User,
              as: 'user',
              attributes: ['id', 'name', 'email']
            }
          ]
        }
      ]
    });

    console.log('Projects with members:', JSON.stringify(projects, null, 2));
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await sequelize.close();
  }
}

checkProjects();
