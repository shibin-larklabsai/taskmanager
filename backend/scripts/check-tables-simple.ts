import { sequelize } from '../src/config/database';
import '../src/models'; // Import all models

async function checkTables() {
  try {
    console.log('🔍 Connecting to the database...');
    await sequelize.authenticate();
    console.log('✅ Connected to the database successfully!');

    // Get all tables
    console.log('\n📋 Checking database tables...');
    const [tables] = await sequelize.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"
    );

    if (tables.length === 0) {
      console.log('No tables found in the database.');
      console.log('\n💡 Run the database sync script: npx tsx scripts/sync-db.ts');
      return;
    }

    console.log(`\nFound ${tables.length} tables in the database:`);
    console.table(tables);

    // Check for users table
    const hasUsersTable = tables.some((table: any) => table.table_name === 'users');
    
    if (hasUsersTable) {
      console.log('\n👥 Users table found. Checking for data...');
      const [users] = await sequelize.query('SELECT * FROM users LIMIT 5');
      
      if (Array.isArray(users) && users.length > 0) {
        console.log(`\nFound ${users.length} users in the database:`);
        console.table(users);
      } else {
        console.log('No users found in the users table.');
      }
    } else {
      console.log('\n❌ Users table not found. Database may need to be synced.');
      console.log('💡 Run: npx tsx scripts/sync-db.ts');
    }

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    console.error('\n🔧 Debug information:');
    console.log('- Check if PostgreSQL is running');
    console.log('- Verify database credentials in .env file');
    console.log('- Check if the database exists');
    console.log('- Check database connection settings');
    process.exit(1);
  } finally {
    await sequelize.close();
    console.log('\n🔌 Database connection closed.');
  }
}

// Run the check
checkTables();
