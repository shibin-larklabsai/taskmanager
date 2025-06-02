import { sequelize } from '../config/database.js';

const roles = [
  { name: 'project_manager', description: 'Project Manager - Manages projects and teams' },
  { name: 'developer', description: 'Developer - Works on project tasks and features' },
  { name: 'tester', description: 'Tester - Tests and verifies project functionality' }
];

async function addRolesDirectly() {
  console.log('Starting to add roles directly...');
  
  try {
    // Test the connection
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully.');
    
    // Start a transaction
    const transaction = await sequelize.transaction();
    
    try {
      // Check existing roles
      const [existingRoles] = await sequelize.query(
        'SELECT name FROM roles WHERE name IN (:roleNames)',
        {
          replacements: { roleNames: roles.map(r => r.name) },
          transaction
        }
      ) as [any[], unknown];
      
      const existingRoleNames = existingRoles.map((r: { name: string }) => r.name);
      const newRoles = roles.filter(role => !existingRoleNames.includes(role.name));
      
      if (newRoles.length === 0) {
        console.log('✅ All roles already exist in the database');
        return;
      }
      
      console.log(`\n➕ Adding ${newRoles.length} new roles to the database...`);
      
      // Add new roles
      for (const role of newRoles) {
        console.log(`Creating role: ${role.name}`);
        await sequelize.query(
          'INSERT INTO roles (name, description, "createdAt", "updatedAt") VALUES (?, ?, NOW(), NOW())',
          {
            replacements: [role.name, role.description],
            transaction
          }
        );
        console.log(`✅ Created role: ${role.name}`);
      }
      
      // Commit the transaction
      await transaction.commit();
      console.log('\n✅ Successfully added new roles:');
      newRoles.forEach(role => console.log(`- ${role.name}: ${role.description}`));
      
    } catch (error) {
      // Rollback the transaction if there's an error
      await transaction.rollback();
      throw error;
    }
    
  } catch (error) {
    console.error('❌ Error adding roles:', error);
  } finally {
    try {
      await sequelize.close();
      console.log('✅ Database connection closed.');
    } catch (closeError) {
      console.error('❌ Error closing connection:', closeError);
    }
  }
}

// Run the function
addRolesDirectly();
