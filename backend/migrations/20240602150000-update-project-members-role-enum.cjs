'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // First, drop the existing constraint
    await queryInterface.sequelize.query(
      'ALTER TABLE project_members DROP CONSTRAINT IF EXISTS "project_members_role_check"'
    );

    // Then update the column type with the new enum values
    await queryInterface.sequelize.query(
      `ALTER TABLE project_members 
       ALTER COLUMN role TYPE VARCHAR(20) 
       USING (role::text)::VARCHAR(20)`
    );

    // Create a new constraint with the updated enum values
    await queryInterface.sequelize.query(
      `ALTER TABLE project_members 
       ADD CONSTRAINT project_members_role_check 
       CHECK (role IN ('OWNER', 'MANAGER', 'DEVELOPER', 'DESIGNER', 'TESTER', 'VIEWER'))`
    );
  },

  async down(queryInterface, Sequelize) {
    // Revert to the original enum values if needed
    await queryInterface.sequelize.query(
      'ALTER TABLE project_members DROP CONSTRAINT IF EXISTS "project_members_role_check"'
    );

    await queryInterface.sequelize.query(
      `ALTER TABLE project_members 
       ALTER COLUMN role TYPE VARCHAR(20) 
       USING (CASE 
         WHEN role = 'OWNER' THEN 'owner' 
         WHEN role = 'VIEWER' THEN 'viewer' 
         ELSE 'member' 
       END)::VARCHAR(20)`
    );

    await queryInterface.sequelize.query(
      `ALTER TABLE project_members 
       ADD CONSTRAINT project_members_role_check 
       CHECK (role IN ('owner', 'admin', 'member', 'viewer'))`
    );
  }
};
