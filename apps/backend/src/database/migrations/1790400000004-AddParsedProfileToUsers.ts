import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddParsedProfileToUsers1790400000004 implements MigrationInterface {
  name = 'AddParsedProfileToUsers1790400000004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" ADD "parsedProfile" text`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "parsedProfile"`);
  }
}
