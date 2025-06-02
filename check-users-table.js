const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'task_management',
  password: process.env.DB_PASSWORD || 'shibin',
  port: process.env.DB_PORT || 5432,
});

async function checkUsersTable() {
  try {
    await client.connect();
    
    // Check users table structure
    const columns = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'users';
    `);
    
    console.log('\n📋 Users table columns:');
    console.table(columns.rows);
    
    // Check if there are any users in the database
    const users = await client.query('SELECT id, email, name, created_at FROM users LIMIT 5');
    console.log('\n👥 First 5 users:');
    console.table(users.rows);
    
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await client.end();
  }
}

checkUsersTable();
