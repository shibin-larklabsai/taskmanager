import { hash } from 'bcryptjs';
import { sequelize } from '../config/database.js';
import { QueryTypes } from 'sequelize';

async function resetAdminPassword() {
  const newPassword = 'admin123'; // Change this to your desired password
  const email = 'admin@example.com';

  try {
    // Hash the new password
    const saltRounds = 10;
    const hashedPassword = await hash(newPassword, saltRounds);

    // Update the user's password in the database
    const [updatedCount] = await sequelize.query(
      `UPDATE users SET password = :password WHERE email = :email`,
      {
        replacements: { password: hashedPassword, email },
        type: QueryTypes.UPDATE
      }
    );

    if (updatedCount === 1) {
      console.log('✅ Admin password reset successfully');
      console.log(`Email: ${email}`);
      console.log(`New Password: ${newPassword}`);
    } else {
      console.error('❌ Admin user not found');
    }
  } catch (error) {
    console.error('❌ Error resetting admin password:', error);
  } finally {
    await sequelize.close();
  }
}

resetAdminPassword();
