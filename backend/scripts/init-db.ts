import { sequelize } from '../src/config/database';
import User from '../src/models/user.model';
import Role from '../src/models/role.model';
import UserRole from '../src/models/user-role.model';
import Project from '../src/models/project.model';
import ProjectMember from '../src/models/project-member.model';

async function initializeDatabase() {
  try {
    console.log('🔄 Initializing database...');
    
    // Test the connection
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully.');
    
    // Sync all models with the database (force: true will drop tables if they exist)
    console.log('🔄 Syncing database models...');
    await sequelize.sync({ force: true });
    
    console.log('✅ Database synchronized successfully!');
    
    // Create default roles if they don't exist
    console.log('🔄 Creating default roles...');
    const [adminRole, userRole] = await Promise.all([
      Role.create({
        name: 'admin',
        description: 'Administrator with full access'
      }),
      Role.create({
        name: 'user',
        description: 'Regular user with standard permissions'
      })
    ]);
    
    console.log('✅ Default roles created:', { admin: adminRole.name, user: userRole.name });
    
    // Create a default admin user
    const bcrypt = await import('bcryptjs');
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    const adminUser = await User.create({
      name: 'Admin User',
      email: 'admin@example.com',
      password: hashedPassword
    });
    
    // Assign admin role to the admin user
    await UserRole.create({
      userId: adminUser.id,
      roleId: adminRole.id
    });
    
    console.log('✅ Default admin user created:', {
      email: adminUser.email,
      password: 'admin123' // Only for initial setup
    });
    
    console.log('\n🚀 Database initialization completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error initializing database:', error);
    process.exit(1);
  }
}

// Run the initialization
initializeDatabase();
