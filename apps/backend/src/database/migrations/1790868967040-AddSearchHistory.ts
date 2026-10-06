import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSearchHistory1790868967040 implements MigrationInterface {
    name = 'AddSearchHistory1790868967040'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "applications" DROP CONSTRAINT "UQ_applications_job_candidate"`);
        await queryRunner.query(`CREATE TABLE "search_history" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "role" character varying NOT NULL, "keyword" character varying NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_cb93c8f85dbdca85943ca494812" PRIMARY KEY ("id"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "search_history"`);
        await queryRunner.query(`ALTER TABLE "applications" ADD CONSTRAINT "UQ_applications_job_candidate" UNIQUE ("jobId", "candidateId")`);
    }

}
