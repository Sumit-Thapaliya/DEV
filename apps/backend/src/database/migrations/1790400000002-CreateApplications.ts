import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateApplications1790400000002 implements MigrationInterface {
  name = 'CreateApplications1790400000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "applications" (
        "applicationId" uuid NOT NULL DEFAULT gen_random_uuid(),
        "jobId" uuid NOT NULL,
        "candidateId" uuid NOT NULL,
        "status" character varying NOT NULL DEFAULT 'NEW',
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_applications" PRIMARY KEY ("applicationId"),
        CONSTRAINT "UQ_applications_job_candidate" UNIQUE ("jobId", "candidateId")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "applications"`);
  }
}
