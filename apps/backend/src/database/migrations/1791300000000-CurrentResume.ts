import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CurrentResume1791300000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE users ADD COLUMN "resumeCanvas" jsonb, ADD COLUMN "resumePdf" bytea`);
    await queryRunner.query(`CREATE TABLE resume_assets (
      "userId" uuid NOT NULL REFERENCES users("userId") ON DELETE CASCADE,
      "assetId" varchar(160) NOT NULL,
      "mimeType" varchar(40) NOT NULL,
      data bytea NOT NULL,
      PRIMARY KEY ("userId", "assetId")
    )`);
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE resume_assets');
    await queryRunner.query('ALTER TABLE users DROP COLUMN "resumeCanvas", DROP COLUMN "resumePdf"');
  }
}
