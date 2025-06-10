import { sequelize } from '../src/config/database';
import '../src/models'; // Import all models
import { User, Role, UserRole, Project, ProjectMember } from '../src/models';
import { IUserAttributes } from '../src/models/user.model'; // Import the User attributes interface

async function syncDatabase() {
  try {
    console.log('🔄 Starting database synchronization...');
    
    // Test the database connection first
    console.log('🔍 Testing database connection...');
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully!');
    
    // Log current tables before sync
    try {
      const [tables] = await sequelize.query(
        "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"
      );
      console.log('\n📋 Current tables in database:');
      console.table(tables);
    } catch (error) {
      console.log('\n⚠️ Could not list existing tables:', error.message);
    }
    
    console.log('\n🔄 Syncing database models...');
    
    // Force sync will drop all tables and recreate them
    await sequelize.sync({ force: true, logging: console.log });
    
    console.log('\n✅ Database synchronized successfully!');
    
    // Verify tables after sync
    try {
      const [tables] = await sequelize.query(
        "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"
      );
      console.log('\n📋 Tables after sync:');
      console.table(tables);
      
      // Create default roles if they don't exist
      console.log('\n🔧 Creating default roles...');
      const [adminRole] = await Role.findOrCreate({
        where: { name: 'admin' },
        defaults: { name: 'admin', description: 'Administrator with full access' }
      });
      
      const [userRole] = await Role.findOrCreate({
        where: { name: 'user' },
        defaults: { name: 'user', description: 'Regular user' }
      });
      
      console.log('✅ Default roles created/verified');
      
      // Create default admin user if it doesn't exist
      console.log('\n🔧 Verifying admin user...');
      const [adminUser] = await User.findOrCreate({
        where: { email: 'admin@example.com' },
        defaults: {
          name: 'Admin User',
          email: 'admin@example.com',
          password: 'admin123' // In a real app, this should be hashed
        }
      });
      
      // Assign admin role to admin user
      // @ts-ignore - The addRole method is added by Sequelize but not in the type definitions
      await (adminUser as any).addRole(adminRole);
      
      console.log('✅ Admin user verified');
      
    } catch (error) {
      console.error('❌ Error during post-sync setup:', error);
      throw error;
    }
    
    console.log('\n✨ Database setup completed successfully!');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error syncing database:', error);
    process.exit(1);
  }
}

syncDatabase();
