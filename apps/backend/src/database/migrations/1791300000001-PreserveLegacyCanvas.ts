import type { MigrationInterface, QueryRunner } from 'typeorm';

/** Preserve pre-fix edits before a profile-field update replaces parsedProfile. */
export class PreserveLegacyCanvas1791300000001 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`UPDATE users SET "resumeCanvas" = "parsedProfile"
      WHERE "resumeCanvas" IS NULL AND jsonb_typeof("parsedProfile"->'pages') = 'array'
      AND jsonb_typeof("parsedProfile"->'assets') = 'object'`);
    await queryRunner.query(`INSERT INTO resume_assets ("userId", "assetId", "mimeType", data)
      SELECT u."userId", a.key, 'image/jpeg', decode(split_part(a.value->>'src', ',', 2), 'base64')
      FROM users u CROSS JOIN LATERAL jsonb_each(u."resumeCanvas"->'assets') a
      WHERE a.value->>'src' ~ '^data:image/jpeg;base64,[A-Za-z0-9+/=]+$'
      ON CONFLICT ("userId", "assetId") DO NOTHING`);
    await queryRunner.query(`UPDATE users u SET "resumeCanvas" = jsonb_set(u."resumeCanvas", '{assets}',
      COALESCE((SELECT jsonb_object_agg(a.key, CASE WHEN EXISTS (
        SELECT 1 FROM resume_assets r WHERE r."userId" = u."userId" AND r."assetId" = a.key)
        THEN jsonb_set(a.value, '{src}', to_jsonb('asset:' || a.key)) ELSE a.value END)
        FROM jsonb_each(u."resumeCanvas"->'assets') a), '{}'::jsonb))
      WHERE jsonb_typeof(u."resumeCanvas"->'assets') = 'object'`);
  }
  async down(_queryRunner: QueryRunner): Promise<void> {
    // Data-preserving migration: intentionally do not discard recovered edits.
  }
}
