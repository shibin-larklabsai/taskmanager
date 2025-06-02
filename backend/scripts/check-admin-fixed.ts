import { sequelize } from '../src/config/database';
import { QueryTypes } from 'sequelize';

interface UserResult {
  id: number;
  name: string;
  email: string;
}

interface RoleResult {
  id: number;
  name: string;
  description: string | null;
}

interface UserRoleResult {
  user_id: number;
  role_id: number;
  role_name: string;
}

async function checkAdminUser() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established.');

    // 1. Check if admin user exists
    const adminUser = await sequelize.query<UserResult>(
      'SELECT id, name, email FROM users WHERE email = :email',
      {
        replacements: { email: 'admin@example.com' },
        type: QueryTypes.SELECT
      }
    );

    if (adminUser.length === 0) {
      console.log('❌ Admin user not found');
      return;
    }

    const user = adminUser[0];
    
    console.log('\n👤 Admin User Details:');
    console.log(`ID: ${user.id}`);
    console.log(`Name: ${user.name}`);
    console.log(`Email: ${user.email}`);
    
    // 2. Get all roles for the user
    const userRoles = await sequelize.query<UserRoleResult>(
      `SELECT ur.user_id, ur.role_id, r.name as role_name 
       FROM user_roles ur 
       JOIN roles r ON ur.role_id = r.id 
       WHERE ur.user_id = :userId`,
      {
        replacements: { userId: user.id },
        type: QueryTypes.SELECT
      }
    );

    console.log('\n🔍 User-Role Associations:');
    if (userRoles.length > 0) {
      userRoles.forEach(ur => {
        console.log(`- Role ID: ${ur.role_id}, Role Name: ${ur.role_name}`);
      });
    } else {
      console.log('No role associations found for this user');
    }

    // 3. Check if admin role exists
    const adminRole = await sequelize.query<RoleResult>(
      'SELECT id, name, description FROM roles WHERE name = :name',
      {
        replacements: { name: 'admin' },
        type: QueryTypes.SELECT
      }
    );

    if (adminRole.length > 0) {
      const role = adminRole[0];
      console.log(`\n✅ Found 'admin' role with ID: ${role.id}`);
      
      // Check if user has admin role
      const hasAdminRole = userRoles.some(ur => ur.role_name === 'admin');
      console.log(`🔐 User has admin role: ${hasAdminRole ? '✅ YES' : '❌ NO'}`);
      
      if (!hasAdminRole) {
        console.log('\n⚠️  The user exists but does not have admin role. You can fix this by running:');
        console.log('   npm run admin:fix');
      }
    } else {
      console.log('\n❌ Admin role not found in the database');
      console.log('   You can fix this by running: npm run admin:fix');
    }

  } catch (error) {
    console.error('❌ Error checking admin user:', error);
  } finally {
    await sequelize.close();
  }
}

// Run the check
checkAdminUser();
