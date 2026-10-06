import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddResumeToUsers1790400000003 implements MigrationInterface {
  name = 'AddResumeToUsers1790400000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" ADD "resumeFileName" character varying`);
    await queryRunner.query(`ALTER TABLE "users" ADD "resumeData" text`);
    await queryRunner.query(`ALTER TABLE "users" ADD "resumeUploadedAt" TIMESTAMP WITH TIME ZONE`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "resumeUploadedAt"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "resumeData"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "resumeFileName"`);
  }
}
