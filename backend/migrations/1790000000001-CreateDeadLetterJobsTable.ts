import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateDeadLetterJobsTable1790000000001 implements MigrationInterface {
  name = 'CreateDeadLetterJobsTable1790000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "dead_letter_jobs_status_enum" AS ENUM ('pending','retrying','resolved','permanently_failed')`,
    );
    await queryRunner.query(`
      CREATE TABLE "dead_letter_jobs" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "queue_name" varchar NOT NULL,
        "job_name" varchar NOT NULL DEFAULT '__default__',
        "original_job_id" varchar,
        "payload" jsonb NOT NULL,
        "options" jsonb,
        "error" text,
        "stacktrace" text,
        "attempt_count" int NOT NULL DEFAULT 0,
        "recovery_attempts" int NOT NULL DEFAULT 0,
        "status" "dead_letter_jobs_status_enum" NOT NULL DEFAULT 'pending',
        "resolved_at" timestamp,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now()
      )`);
    await queryRunner.query(
      `CREATE INDEX "IDX_dead_letter_jobs_queue_status" ON "dead_letter_jobs" ("queue_name","status")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "dead_letter_jobs"`);
    await queryRunner.query(`DROP TYPE "dead_letter_jobs_status_enum"`);
  }
}
