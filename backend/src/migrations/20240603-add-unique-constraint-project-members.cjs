'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add unique constraint for project_id and user_id combination
    await queryInterface.addConstraint('project_members', {
      fields: ['project_id', 'user_id'],
      type: 'unique',
      name: 'unique_project_user'
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Remove the constraint if we need to rollback
    await queryInterface.removeConstraint('project_members', 'unique_project_user');
  }
};
