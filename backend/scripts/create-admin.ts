import { hash } from 'bcryptjs';
import { sequelize } from '../src/config/database';
import User from '../src/models/user.model';
import Role from '../src/models/role.model';
import UserRole from '../src/models/user-role.model';

async function createAdminUser() {
  try {
    // Import models after database is connected
    await sequelize.authenticate();
    console.log('✅ Database connection established.');

    // Start a transaction
    const transaction = await sequelize.transaction();

    try {
      // Create or find admin role
      const [adminRole] = await Role.findOrCreate({
        where: { name: 'admin' },
        defaults: { name: 'admin', description: 'Administrator' },
        transaction
      });

      // Hash the password
      const hashedPassword = await hash('admin123', 10);

      // Create admin user
      const [adminUser] = await User.findOrCreate({
        where: { email: 'admin@example.com' },
        defaults: {
          name: 'Admin',
          email: 'admin@example.com',
          password: hashedPassword,
        },
        transaction
      });

      // Create the user-role association
      try {
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
        console.log('✅ User-role association created successfully');
      } catch (error) {
        console.error('Error creating user-role association:', error);
        throw error;
      }

      await transaction.commit();
      console.log('✅ Admin user created successfully!');
      console.log('Email: admin@example.com');
      console.log('Password: admin123');
    } catch (error) {
      await transaction.rollback();
      console.error('Transaction error:', error);
      throw error;
    }
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

createAdminUser();
