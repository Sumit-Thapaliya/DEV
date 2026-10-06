import { MigrationInterface, QueryRunner } from 'typeorm';

export class StableUserFields1790400000000 implements MigrationInterface {
  name = 'StableUserFields1790400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "email" DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE "users" ADD "name" character varying`);
    await queryRunner.query(`ALTER TABLE "users" ADD "otpHash" character varying`);
    await queryRunner.query(`ALTER TABLE "users" ADD "otpExpiry" TIMESTAMP WITH TIME ZONE`);
    await queryRunner.query(`ALTER TABLE "users" ADD "companyName" character varying`);
    await queryRunner.query(`ALTER TABLE "users" ADD "contactNumber" character varying`);
    await queryRunner.query(`ALTER TABLE "users" ADD "avatar" text`);
    await queryRunner.query(`ALTER TABLE "users" ADD "isDeleted" boolean NOT NULL DEFAULT false`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "isDeleted"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "avatar"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "contactNumber"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "companyName"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "otpExpiry"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "otpHash"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "name"`);
    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "email" SET NOT NULL`);
  }
}
