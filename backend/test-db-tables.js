import { Sequelize } from 'sequelize';

async function checkTables() {
  const sequelize = new Sequelize('postgres://postgres:shibin@localhost:5432/task_management');
  
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully.');
    
    // Get all tables
    const [results] = await sequelize.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);
    
    console.log('\n📋 Database tables:');
    console.table(results);
    
    // Check if users table exists and has data
    try {
      const [users] = await sequelize.query('SELECT COUNT(*) as count FROM users');
      console.log('\n👥 Users table row count:', users[0].count);
      
      // Get sample users
      const [sampleUsers] = await sequelize.query('SELECT id, name, email FROM users LIMIT 5');
      console.log('\n👤 Sample users:');
      console.table(sampleUsers);
    } catch (err) {
      console.log('❌ Error querying users table:', err.message);
    }
    
  } catch (error) {
    console.error('❌ Unable to connect to the database:', error);
  } finally {
    await sequelize.close();
  }
}

checkTables();
