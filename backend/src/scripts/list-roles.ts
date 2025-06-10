import { sequelize } from '../config/database.js';

async function listRoles() {
  try {
    console.log('🔍 Listing all roles from the database...');
    
    // Test the connection
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully.');
    
    // Get all roles using raw query
    const [roles] = await sequelize.query('SELECT * FROM roles');
    
    if (Array.isArray(roles) && roles.length === 0) {
      console.log('ℹ️  No roles found in the database.');
    } else {
      console.log(`✅ Found ${roles.length} roles in the database:`);
      console.table(roles);
    }
    
  } catch (error) {
    console.error('❌ Error listing roles:', error);
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
listRoles();
