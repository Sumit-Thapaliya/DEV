/** Read-only local diagnostic; no user data, credentials or database URL are printed. */
import { AppDataSource } from '../src/database/data-source.js';
async function main() {
  try {
    let started = performance.now();
    await AppDataSource.initialize();
    const connectMs = Math.round(performance.now() - started);
    const selectMs: number[] = [];
    for (let i = 0; i < 5; i++) {
      started = performance.now();
      await AppDataSource.query('SELECT 1');
      selectMs.push(Math.round(performance.now() - started));
    }
    console.log(
      JSON.stringify(
        {
          connectMs,
          selectMs,
          medianSelectMs: [...selectMs].sort((a, b) => a - b)[2],
        },
        null,
        2,
      ),
    );
  } finally {
    if (AppDataSource.isInitialized) await AppDataSource.destroy();
  }
}
main().catch(() => {
  console.error(
    'Database connection failed. Check your local backend environment and network.',
  );
  process.exitCode = 1;
});
