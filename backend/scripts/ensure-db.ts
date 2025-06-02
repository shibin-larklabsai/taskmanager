import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function ensureDatabase() {
  console.log('🔍 Checking database setup...');
  
  const dbConfig = {
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    password: process.env.DB_PASSWORD || 'shibin',
    port: parseInt(process.env.DB_PORT || '5432'),
  };
  
  const dbName = process.env.DB_NAME || 'task_management';
  
  console.log('\n🔧 Using configuration:', {
    ...dbConfig,
    password: '***',
    database: dbName
  });
  
  // Connect to the default 'postgres' database first
  const pool = new Pool({
    ...dbConfig,
    database: 'postgres'
  });
  
  try {
    const client = await pool.connect();
    console.log('\n✅ Connected to PostgreSQL server');
    
    try {
      // Check if database exists
      const dbCheck = await client.query(
        'SELECT 1 FROM pg_database WHERE datname = $1',
        [dbName]
      );
      
      if (dbCheck.rows.length === 0) {
        console.log(`\n⚠️ Database '${dbName}' does not exist. Creating...`);
        await client.query(`CREATE DATABASE ${dbName}`);
        console.log(`✅ Created database '${dbName}'`);
      } else {
        console.log(`\n✅ Database '${dbName}' exists`);
      }
      
      // Now connect to the target database
      client.release();
      await pool.end();
      
      console.log(`\n🔍 Connecting to database '${dbName}'...`);
      const dbPool = new Pool({
        ...dbConfig,
        database: dbName
      });
      
      try {
        const dbClient = await dbPool.connect();
        console.log(`✅ Successfully connected to database '${dbName}'`);
        
        try {
          // Check if users table exists
          const tableCheck = await dbClient.query(
            "SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users'"
          );
          
          if (tableCheck.rows.length === 0) {
            console.log('\n⚠️ Tables not found. Running database sync...');
            // We'll need to run the sync script here
            console.log('Run: npx tsx scripts/sync-db.ts');
          } else {
            console.log('\n✅ Users table exists');
            
            // Show user count
            const userCount = await dbClient.query('SELECT COUNT(*) as count FROM users');
            console.log(`📊 Total users: ${userCount.rows[0].count}`);
            
            // Show sample users
            const users = await dbClient.query('SELECT * FROM users LIMIT 5');
            if (users.rows.length > 0) {
              console.log('\n👥 Sample users:');
              console.table(users.rows);
            }
          }
        } finally {
          dbClient.release();
        }
      } finally {
        await dbPool.end();
      }
      
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    console.error('\n🔧 Debug information:');
    console.log('- Is PostgreSQL running?');
    console.log('- Check if the PostgreSQL service is started');
    console.log('- Verify the username and password are correct');
    console.log('- Check if the port is correct and not blocked by firewall');
    process.exit(1);
  } finally {
    await pool.end();
  }
  
  console.log('\n✨ Database check completed');
}

ensureDatabase();
