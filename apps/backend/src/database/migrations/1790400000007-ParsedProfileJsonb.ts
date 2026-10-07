import { MigrationInterface, QueryRunner } from 'typeorm';

export class ParsedProfileJsonb1790400000007 implements MigrationInterface {
  name = 'ParsedProfileJsonb1790400000007';

  public async up(queryRunner: QueryRunner): Promise<void> {
    /* Resumes are stored as real JSON (jsonb) so the extracted data can be
       queried inside the database, not just as opaque text. */
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "parsedProfile" TYPE jsonb USING CASE WHEN "parsedProfile" IS NULL OR btrim("parsedProfile") = '' THEN NULL ELSE "parsedProfile"::jsonb END`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "parsedProfile" TYPE text USING CASE WHEN "parsedProfile" IS NULL THEN NULL ELSE "parsedProfile"::text END`,
    );
  }
}
