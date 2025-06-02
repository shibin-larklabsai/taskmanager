import { sequelize } from '../src/config/database';
import User from '../src/models/user.model';
import Role from '../src/models/role.model';
import UserRole from '../src/models/user-role.model';
import { hash } from 'bcryptjs';

async function fixAdminAccess() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established.');

    // Start a transaction
    const transaction = await sequelize.transaction();

    try {
      // 1. Ensure the admin role exists
      const [adminRole] = await Role.findOrCreate({
        where: { name: 'admin' },
        defaults: {
          name: 'admin',
          description: 'Administrator with full access'
        },
        transaction
      });

      console.log(`✅ Admin role: ${adminRole.name} (ID: ${adminRole.id})`);

      // 2. Find or create admin user
      const hashedPassword = await hash('admin123', 10);
      const [adminUser] = await User.findOrCreate({
        where: { email: 'admin@example.com' },
        defaults: {
          name: 'Admin User',
          email: 'admin@example.com',
          password: hashedPassword
        },
        transaction
      });

      console.log(`✅ Admin user: ${adminUser.email} (ID: ${adminUser.id})`);

      // 3. Assign admin role to user (using direct query to avoid association issues)
      await UserRole.findOrCreate({
        where: {
          userId: adminUser.id,
          roleId: adminRole.id
        },
        defaults: {
          userId: adminUser.id,
          roleId: adminRole.id
        },
        transaction
      });

      console.log('✅ Assigned admin role to admin user');

      // 4. Verify the assignment
      const userRole = await UserRole.findOne({
        where: {
          userId: adminUser.id,
          roleId: adminRole.id
        },
        transaction
      });

      if (userRole) {
        console.log('✅ Verification successful: Admin role is assigned to the admin user');
      } else {
        console.log('❌ Verification failed: Could not verify role assignment');
      }

      await transaction.commit();
      console.log('\n🎉 Admin access setup completed successfully!');
      console.log('You can now log in with:');
      console.log('Email: admin@example.com');
      console.log('Password: admin123');
      console.log('\nAccess the admin panel at: http://localhost:3000/admin');

    } catch (error) {
      await transaction.rollback();
      console.error('❌ Error during admin setup:', error);
      throw error;
    }
  } catch (error) {
    console.error('❌ Error connecting to database:', error);
  } finally {
    await sequelize.close();
  }
}

// Run the fix
fixAdminAccess();
