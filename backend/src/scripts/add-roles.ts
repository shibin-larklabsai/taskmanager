import { sequelize } from '../config/database.js';
import Role from '../models/role.model.js';

async function addRoles() {
  console.log('Starting to add roles...');
  
  const roles: Array<{ name: string; description: string }> = [
    { name: 'project_manager', description: 'Project Manager - Manages projects and teams' },
    { name: 'developer', description: 'Developer - Works on project tasks and features' },
    { name: 'tester', description: 'Tester - Tests and verifies project functionality' }
  ];

  try {
    console.log('🔍 Checking for existing roles...');
    
    // Sync the database to ensure the Role model is available
    console.log('Syncing database...');
    await sequelize.sync();
    
    // Check if roles already exist
    console.log('Querying for existing roles...');
    const existingRoles = await Role.findAll({
      where: {
        name: roles.map(role => role.name)
      }
    });

    console.log(`Found ${existingRoles.length} existing roles`);
    const existingRoleNames = existingRoles.map(role => role.name);
    const newRoles = roles.filter(role => !existingRoleNames.includes(role.name));

    if (newRoles.length === 0) {
      console.log('✅ All roles already exist in the database');
      return;
    }

    console.log(`\n➕ Adding ${newRoles.length} new roles to the database...`);
    
    // Add new roles
    for (const role of newRoles) {
      console.log(`Creating role: ${role.name}`);
      try {
        const createdRole = await Role.create(role);
        console.log(`✅ Created role: ${createdRole.name} (ID: ${createdRole.id})`);
      } catch (error) {
        console.error(`❌ Error creating role ${role.name}:`, error);
      }
    }

    console.log('\n✅ Successfully added new roles:');
    newRoles.forEach(role => console.log(`- ${role.name}: ${role.description}`));
    
  } catch (error) {
    console.error('❌ Error in addRoles function:', error);
  } finally {
    try {
      console.log('Closing database connection...');
      await sequelize.close();
      console.log('Database connection closed');
    } catch (closeError) {
      console.error('Error closing database connection:', closeError);
    }
  }
}

// Run the function
addRoles();
