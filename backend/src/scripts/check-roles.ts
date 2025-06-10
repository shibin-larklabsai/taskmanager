import { sequelize } from '../config/database.js';
import Role from '../models/role.model.js';

async function checkRoles() {
  try {
    console.log('🔍 Checking database connection...');
    
    // Test the connection
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully.');
    
    // Sync models
    console.log('🔄 Syncing models...');
    await sequelize.sync();
    
    // Find all roles
    console.log('🔍 Fetching all roles...');
    const roles = await Role.findAll();
    
    if (roles.length === 0) {
      console.log('ℹ️  No roles found in the database.');
    } else {
      console.log(`✅ Found ${roles.length} roles in the database:`);
      roles.forEach(role => {
        console.log(`- ${role.name} (ID: ${role.id})`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error checking roles:', error);
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
checkRoles();
