import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAboutCompanyToUsers1790400000005 implements MigrationInterface {
  name = 'AddAboutCompanyToUsers1790400000005';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" ADD "aboutCompany" text`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "aboutCompany"`);
  }
}
