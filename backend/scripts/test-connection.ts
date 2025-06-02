import { testConnection } from '../src/config/database';

async function run() {
  try {
    console.log('Testing database connection...');
    await testConnection();
    console.log('✅ Database connection successful!');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  }
}

run();
