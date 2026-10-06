import { AppDataSource } from '../database/data-source.js';

export const database = {
  async connect() {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }
    console.log('PostgreSQL database connected via TypeORM');
  },
  async disconnect() {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      console.log('PostgreSQL database disconnected');
    }
  },
};
