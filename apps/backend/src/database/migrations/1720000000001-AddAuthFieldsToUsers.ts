import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Extends the base users table (created in 1720000000000-CreateUsers) with
 * the columns the auth flow needs:
 *  - email becomes nullable (users may register with a phone number only)
 *  - phone (unique when present) as an alternative identifier
 *  - role (candidate | recruiter)
 *  - passwordHash (bcrypt) — plaintext passwords are never stored
 */
export class AddAuthFieldsToUsers1720000000001 implements MigrationInterface {
  name = 'AddAuthFieldsToUsers1720000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "users" ALTER COLUMN "email" DROP NOT NULL',
    );
    await queryRunner.query('ALTER TABLE "users" ADD "phone" character varying');
    await queryRunner.query(
      'CREATE UNIQUE INDEX "UQ_users_phone" ON "users" ("phone") WHERE "phone" IS NOT NULL',
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "role" character varying NOT NULL DEFAULT 'candidate'`,
    );
    await queryRunner.query(
      'ALTER TABLE "users" ADD "passwordHash" character varying',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX "UQ_users_phone"');
    await queryRunner.query('ALTER TABLE "users" DROP COLUMN "passwordHash"');
    await queryRunner.query('ALTER TABLE "users" DROP COLUMN "role"');
    await queryRunner.query('ALTER TABLE "users" DROP COLUMN "phone"');
    await queryRunner.query(
      'ALTER TABLE "users" ALTER COLUMN "email" SET NOT NULL',
    );
  }
}