import { Sequelize } from 'sequelize';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env file
const envPath = path.resolve(process.cwd(), '.env');
console.log(`🔧 Loading environment from: ${envPath}`);
dotenv.config({ path: envPath });

// Debug: Log database connection details
console.log('\n🔍 Environment Variables:');
console.log(`DB_HOST: ${process.env.DB_HOST || 'not set'}`);
console.log(`DB_PORT: ${process.env.DB_PORT || 'not set'}`);
console.log(`DB_NAME: ${process.env.DB_NAME || 'not set'}`);
console.log(`DB_USER: ${process.env.DB_USER || 'not set'}`);
console.log(`NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
console.log('DB_PASSWORD:', process.env.DB_PASSWORD ? '*** (set)' : 'not set');

// Create a connection string for logging (without password)
const connectionString = `postgres://${process.env.DB_USER || 'postgres'}:*****@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || '5432'}/${process.env.DB_NAME || 'task_management'}`;
console.log(`\n🔌 Attempting to connect to: ${connectionString}`);

async function inspectDatabase() {
  const sequelize = new Sequelize(
    process.env.DB_NAME || 'task_management',
    process.env.DB_USER || 'postgres',
    process.env.DB_PASSWORD || 'shibin',
    {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 5432,
      dialect: 'postgres',
      logging: (sql) => {
        // Log only non-SELECT queries and errors
        if (!sql.includes('SELECT') || sql.includes('ERROR')) {
          console.log(`  [SQL] ${sql}`);
        }
      },
      logQueryParameters: true,
      benchmark: true
    }
  );

  try {
    console.log('🔍 Connecting to database...');
    await sequelize.authenticate();
    console.log('✅ Connected to database successfully!');

    // Get all tables in the public schema
    const [tables] = await sequelize.query(
      `SELECT table_name 
       FROM information_schema.tables 
       WHERE table_schema = 'public'
       ORDER BY table_name`
    );

    console.log(`\n📋 Found ${tables.length} tables in the database:`);
    
    for (const table of tables as Array<{ table_name: string }>) {
      const tableName = table.table_name;
      console.log(`\n📊 Table: ${tableName}`);
      
      try {
        // Get table columns
        const [columns] = await sequelize.query(
          `SELECT column_name, data_type, is_nullable, column_default
           FROM information_schema.columns 
           WHERE table_schema = 'public' 
           AND table_name = '${tableName}'
           ORDER BY ordinal_position`
        );
        
        console.log(`\n   Columns:`);
        console.table(columns);
        
        // Get row count
        const [countResult] = await sequelize.query(
          `SELECT COUNT(*) as count FROM "${tableName}"`
        );
        const rowCount = (countResult[0] as any).count;
        
        console.log(`   Total rows: ${rowCount}`);
        
        // Get sample data (up to 5 rows)
        if (rowCount > 0) {
          const [rows] = await sequelize.query(
            `SELECT * FROM "${tableName}" LIMIT 5`
          );
          console.log(`\n   Sample data (first ${Math.min(5, rowCount)} rows):`);
          console.table(rows);
        }
        
      } catch (error) {
        console.error(`   Error inspecting table ${tableName}:`, error.message);
      }
    }
    
  } catch (error: any) {
    console.error('\n❌ Error connecting to the database:');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error code:', error.parent?.code);
    console.error('Error detail:', error.parent?.detail);
    console.error('Error stack:', error.stack);
    
    // Additional debug information
    console.log('\n🔧 Debug information:');
    console.log('- Is PostgreSQL running?');
    console.log(`- Can you connect using: psql -h ${process.env.DB_HOST || 'localhost'} -p ${process.env.DB_PORT || '5432'} -U ${process.env.DB_USER || 'postgres'} -d ${process.env.DB_NAME || 'task_management'}`);
    console.log('- Check if the database and user exist');
    console.log('- Verify the password is correct');
    console.log('- Check if the PostgreSQL server is configured to accept connections (check pg_hba.conf)');
    console.log('- Check if the firewall allows connections to the PostgreSQL port');
  } finally {
    await sequelize.close();
    console.log('\n🔌 Database connection closed.');
  }
}

// Run the inspection
inspectDatabase();
