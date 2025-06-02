import { sequelize } from '../src/config/database';
import { QueryTypes } from 'sequelize';

async function verifyAdminAccess() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established.');

    // 1. Check if admin user exists
    const adminUser = await sequelize.query<{id: number, name: string, email: string}>(
      'SELECT id, name, email FROM users WHERE email = :email',
      {
        replacements: { email: 'admin@example.com' },
        type: QueryTypes.SELECT
      }
    );

    if (adminUser.length === 0) {
      console.log('❌ Admin user not found. Please run: npm run admin:fix');
      return;
    }

    console.log('\n👤 Admin User:');
    console.log(adminUser[0]);

    // 2. Check if admin role exists
    const adminRole = await sequelize.query(
      'SELECT id, name FROM roles WHERE name = :name',
      {
        replacements: { name: 'admin' },
        type: QueryTypes.SELECT
      }
    );

    if (adminRole.length === 0) {
      console.log('❌ Admin role not found. Please run: npm run admin:fix');
      return;
    }

    console.log('\n🔑 Admin Role:');
    console.log(adminRole[0]);

    // 3. Check if admin user has admin role
    const userRole = await sequelize.query(
      `SELECT ur.*, r.name as role_name 
       FROM user_roles ur 
       JOIN roles r ON ur.role_id = r.id 
       WHERE ur.user_id = :userId AND r.name = 'admin'`,
      {
        replacements: { userId: adminUser[0]?.id },
        type: QueryTypes.SELECT
      }
    );

    if (userRole.length === 0) {
      console.log('❌ Admin user does not have admin role. Please run: npm run admin:fix');
      return;
    }

    console.log('\n✅ Admin Access Verified:');
    console.log('- Admin user exists');
    console.log('- Admin role exists');
    console.log('- Admin user has admin role assigned');
    console.log('\nYou should now be able to access the admin panel at: http://localhost:3000/admin');
    console.log('Email: admin@example.com');
    console.log('Password: admin123');
    console.log('\nIf you still have issues, try logging out and back in.');

  } catch (error) {
    console.error('❌ Error verifying admin access:', error);
  } finally {
    await sequelize.close();
  }
}

// Run the verification
verifyAdminAccess();
