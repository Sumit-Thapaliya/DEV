import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateJobs1790400000001 implements MigrationInterface {
  name = 'CreateJobs1790400000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "jobs" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "title" character varying NOT NULL,
        "company" character varying NOT NULL,
        "location" character varying,
        "description" text,
        "status" character varying NOT NULL DEFAULT 'open',
        "source" character varying NOT NULL DEFAULT 'python',
        "metadata" jsonb,
        "isDeleted" boolean NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_jobs" PRIMARY KEY ("id")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "jobs"`);
  }
}
