import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPostedByToJobs1790400000006 implements MigrationInterface {
  name = 'AddPostedByToJobs1790400000006';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "jobs" ADD "postedBy" uuid`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "jobs" DROP COLUMN "postedBy"`);
  }
}
