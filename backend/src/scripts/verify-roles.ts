import { sequelize } from '../config/database.js';

async function verifyRoles() {
  console.log('🔍 Verifying roles in the database...');
  
  try {
    // Test the connection
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully.');
    
    // Get all roles
    const [results] = await sequelize.query('SELECT * FROM roles');
    
    if (Array.isArray(results) && results.length > 0) {
      console.log(`✅ Found ${results.length} roles in the database:`);
      console.table(results);
    } else {
      console.log('ℹ️  No roles found in the database.');
    }
    
  } catch (error) {
    console.error('❌ Error verifying roles:', error);
  } finally {
    try {
      await sequelize.close();
    } catch (closeError) {
      console.error('❌ Error closing connection:', closeError);
    }
  }
}

// Run the function
verifyRoles();
