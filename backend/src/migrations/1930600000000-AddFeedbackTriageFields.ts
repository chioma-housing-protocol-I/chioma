import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds triage fields to `feedback` so admins can review submissions:
 * `status` (new/reviewed/actioned), the reviewing admin, and review time.
 */
export class AddFeedbackTriageFields1930600000000 implements MigrationInterface {
  name = 'AddFeedbackTriageFields1930600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "feedback"
        ADD COLUMN IF NOT EXISTS "status" varchar(20) NOT NULL DEFAULT 'new',
        ADD COLUMN IF NOT EXISTS "reviewed_by" uuid NULL,
        ADD COLUMN IF NOT EXISTS "reviewed_at" TIMESTAMP NULL
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_feedback_status_created_at" ON "feedback" ("status", "created_at")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_feedback_status_created_at"`,
    );
    await queryRunner.query(`
      ALTER TABLE "feedback"
        DROP COLUMN IF EXISTS "reviewed_at",
        DROP COLUMN IF EXISTS "reviewed_by",
        DROP COLUMN IF EXISTS "status"
    `);
  }
}
