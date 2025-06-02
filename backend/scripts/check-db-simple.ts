import { exec } from 'child_process';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const dbConfig = {
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'task_management',
  password: process.env.DB_PASSWORD || 'shibin',
  port: process.env.DB_PORT || '5432',
};

console.log('🔍 Checking database tables...');
console.log(`📊 Database: ${dbConfig.database}@${dbConfig.host}:${dbConfig.port}`);

// Build the psql command
const psqlCommand = `psql -U ${dbConfig.user} -h ${dbConfig.host} -p ${dbConfig.port} -d ${dbConfig.database} -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"`;

console.log('\n📋 Running command:');
console.log(psqlCommand.replace(/-p\s+\S+/, `-p ${dbConfig.port}`).replace(/-d\s+\S+/, `-d ${dbConfig.database}`));

// Set PGPASSWORD in the environment for the child process
const env = { ...process.env, PGPASSWORD: dbConfig.password };

exec(psqlCommand, { env }, (error, stdout, stderr) => {
  if (error) {
    console.error('❌ Error executing command:');
    console.error(stderr || error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Make sure PostgreSQL is running');
    console.log('2. Verify the database exists');
    console.log('3. Check your database credentials in .env');
    console.log('4. Ensure psql is in your PATH');
    return;
  }
  
  console.log('\n📋 Database tables:');
  console.log(stdout);
  
  if (stdout.includes('(0 rows)')) {
    console.log('\n❌ No tables found in the database.');
    console.log('💡 Run the database sync script:');
    console.log('   npx tsx scripts/sync-db.ts');
  }
});
