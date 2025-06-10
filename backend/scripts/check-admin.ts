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
    
    console.log('\n👤 Admin User:');
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

    if (userRoles.length > 0) {
      console.log('\n🔑 Assigned Roles:');
      userRoles.forEach(ur => {
        console.log(`- ${ur.role_name} (ID: ${ur.role_id})`);
        console.log(`- User ID: ${ur.user_id}, Role ID: ${ur.role_id}, Role: ${ur.role_name}`);
      });
    } else {
      console.log('No role associations found in user_roles table');
    }

  } catch (error) {
    console.error('❌ Error checking admin user:', error);
  } finally {
    await sequelize.close();
  }
}

checkAdminUser();
