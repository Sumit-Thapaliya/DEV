import { database } from './config/database.js';
import { env } from './config/env.js';
import { seedTestAccounts } from './database/seed.js';

const start = async () => {
  try {
    await database.connect();
    await seedTestAccounts();
  } catch (err) {
    console.error('Unable to connect to the database:', err);
    process.exit(1);
  }

  const { app } = await import('./app.js');

  const server = app.listen(env.PORT, () => {
    console.log(`API running on http://localhost:${env.PORT}`);
  });

  const gracefulShutdown = (signal: string) => {
    console.log(`\nReceived ${signal}. Gracefully shutting down...`);
    server.close(() => {
      void database.disconnect().finally(() => process.exit(0));
    });
  };

  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
};

void start();
