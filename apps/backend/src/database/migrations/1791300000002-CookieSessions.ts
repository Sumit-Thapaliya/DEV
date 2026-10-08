import type { MigrationInterface, QueryRunner } from 'typeorm';
export class CookieSessions1791300000002 implements MigrationInterface {
  async up(runner: QueryRunner): Promise<void> {
    await runner.query('ALTER TABLE users ADD COLUMN "sessionVersion" integer NOT NULL DEFAULT 1');
  }
  async down(runner: QueryRunner): Promise<void> {
    await runner.query('ALTER TABLE users DROP COLUMN "sessionVersion"');
  }
}
