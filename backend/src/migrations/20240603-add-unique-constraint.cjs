'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addConstraint('project_members', {
      fields: ['project_id', 'user_id'],
      type: 'unique',
      name: 'unique_project_user',
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeConstraint('project_members', 'unique_project_user');
  }
};
