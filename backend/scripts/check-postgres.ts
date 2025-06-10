import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

interface DatabaseRow {
  [key: string]: any;
}

async function checkPostgres() {
  console.log('🔍 Checking PostgreSQL connection...');
  
  const config = {
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: 'postgres', // Connect to default database first
    password: process.env.DB_PASSWORD || 'shibin',
    port: parseInt(process.env.DB_PORT || '5432'),
  };

  console.log('\n🔧 Connection details:', {
    ...config,
    password: config.password ? '***' : 'not set'
  });

  const pool = new Pool(config);
  let client;
  
  try {
    client = await pool.connect();
    console.log('\n✅ Successfully connected to PostgreSQL!');
    
    // List all databases
    console.log('\n📋 Listing all databases:');
    const dbResult = await client.query('SELECT datname FROM pg_database WHERE datistemplate = false;');
    console.table(dbResult.rows);
    
    // Check if our database exists
    const dbName = process.env.DB_NAME || 'task_management';
    const dbExists = dbResult.rows.some((db: DatabaseRow) => db.datname === dbName);
    
    if (!dbExists) {
      console.log(`\n❌ Database '${dbName}' does not exist.`);
      console.log(`Run: CREATE DATABASE ${dbName};`);
    } else {
      console.log(`\n✅ Database '${dbName}' exists.`);
      
      // Release the client before ending the pool
      client.release();
      await pool.end();
      
      console.log(`\n🔍 Connecting to database '${dbName}'...`);
      const dbPool = new Pool({ ...config, database: dbName });
      const dbClient = await dbPool.connect();
      
      try {
        // List all tables
        console.log('\n📋 Listing all tables:');
        const tablesResult = await dbClient.query(
          "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"
        );
        
        if (tablesResult.rows.length === 0) {
          console.log('No tables found in the database.');
        } else {
          console.table(tablesResult.rows);
          
          // Show users table if it exists
          const usersTable = tablesResult.rows.find((t: DatabaseRow) => t.table_name === 'users');
          if (usersTable) {
            console.log('\n👥 Users table data:');
            const users = await dbClient.query('SELECT * FROM users LIMIT 5');
            console.table(users.rows);
          }
        }
      } finally {
        dbClient.release();
        await dbPool.end();
      }
    }
  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    console.error('\n🔧 Debug information:');
    console.log('- Is PostgreSQL running?');
    console.log('- Check if the service is started: `pg_ctl status` or `sudo systemctl status postgresql`');
    console.log('- Check if the port is correct and not blocked by firewall');
    console.log('- Verify the username and password are correct');
    process.exit(1);
  } finally {
    try {
      if (client) {
        client.release();
      }
      await pool.end();
    } catch (e) {
      console.error('Error cleaning up resources:', e);
    }
  }
}

checkPostgres();
