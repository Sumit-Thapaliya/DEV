import type { MigrationInterface, QueryRunner } from 'typeorm';

export class ProfileViews1791400000000 implements MigrationInterface {
  async up(runner: QueryRunner): Promise<void> {
    await runner.query(`CREATE TABLE IF NOT EXISTS "profile_views" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "recruiterId" uuid NOT NULL,
      "candidateId" uuid NOT NULL,
      "createdAt" timestamptz NOT NULL DEFAULT now()
    )`);
    // Never silently discard existing history. If a manually-created table has
    // duplicates/orphans, migration fails for review instead of deleting rows.
    await runner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_profile_views_recruiter_candidate" ON "profile_views" ("recruiterId", "candidateId")`,
    );
    await runner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_profile_views_recruiter_created" ON "profile_views" ("recruiterId", "createdAt")`,
    );
    for (const [name, column] of [
      ['FK_profile_views_recruiter', 'recruiterId'],
      ['FK_profile_views_candidate', 'candidateId'],
    ]) {
      await runner.query(`DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '${name}' AND conrelid = 'profile_views'::regclass) THEN
          ALTER TABLE "profile_views" ADD CONSTRAINT "${name}" FOREIGN KEY ("${column}") REFERENCES "users"("userId") ON DELETE CASCADE;
        END IF;
      END $$`);
    }
  }
  async down(runner: QueryRunner): Promise<void> {
    await runner.query('DROP TABLE "profile_views"');
  }
}
