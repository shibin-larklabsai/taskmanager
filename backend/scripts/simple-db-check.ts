import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function checkDatabase() {
  console.log('🔍 Checking database connection...');
  
  const config = {
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'task_management',
    password: process.env.DB_PASSWORD || 'shibin',
    port: parseInt(process.env.DB_PORT || '5432'),
  };

  console.log('\n🔧 Connection details:', {
    ...config,
    password: '***'
  });

  const pool = new Pool(config);
  
  try {
    // Test connection
    const client = await pool.connect();
    console.log('\n✅ Successfully connected to the database!');
    
    try {
      // List tables
      console.log('\n📋 Listing tables...');
      const tables = await client.query(
        "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"
      );
      
      if (tables.rows.length === 0) {
        console.log('No tables found in the database.');
      } else {
        console.log(`Found ${tables.rows.length} tables:`);
        console.table(tables.rows);
        
        // Show users table if it exists
        const hasUsersTable = tables.rows.some((row: any) => row.table_name === 'users');
        if (hasUsersTable) {
          console.log('\n👥 Users table data:');
          const users = await client.query('SELECT * FROM users LIMIT 5');
          console.table(users.rows);
        }
      }
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    console.error('\n🔧 Debug information:');
    console.log('- Is PostgreSQL running?');
    console.log('- Check if the database exists');
    console.log('- Verify the username and password are correct');
    console.log('- Check if the port is correct and not blocked by firewall');
    process.exit(1);
  } finally {
    await pool.end();
  }
}

checkDatabase();
