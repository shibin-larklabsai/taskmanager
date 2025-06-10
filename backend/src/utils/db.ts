import sequelize from '../config/database';

export const testConnection = async (): Promise<void> => {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection has been established successfully.');
  } catch (error) {
    console.error('❌ Unable to connect to the database:', error);
    throw error;
  }
};

export const syncDatabase = async (): Promise<void> => {
  try {
    // In development, use alter: true to update tables without dropping data
    // In production, you might want to use migrations instead
    const syncOptions = process.env.NODE_ENV === 'production' 
      ? { alter: true } 
      : { alter: true };
      
    await sequelize.sync(syncOptions);
    console.log('✅ Database & tables synchronized!');
  } catch (error) {
    console.error('❌ Unable to sync database:', error);
    throw error;
  }
};
