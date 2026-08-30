import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddVideoProcessingToDisputeEvidence1930200000000
  implements MigrationInterface
{
  name = 'AddVideoProcessingToDisputeEvidence1930200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "dispute_evidence_processing_status_enum" AS ENUM (
        'not_applicable', 'pending', 'processing', 'completed', 'failed'
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "dispute_evidence"
        ADD COLUMN "processing_status" "dispute_evidence_processing_status_enum"
          NOT NULL DEFAULT 'not_applicable',
        ADD COLUMN "video_variants" JSONB,
        ADD COLUMN "thumbnail_url" TEXT
    `);
    // Speeds up the video processor's lookup of pending/processing jobs.
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_dispute_evidence_processing_status"
        ON "dispute_evidence" ("processing_status")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_dispute_evidence_processing_status"`,
    );
    await queryRunner.query(`
      ALTER TABLE "dispute_evidence"
        DROP COLUMN "processing_status",
        DROP COLUMN "video_variants",
        DROP COLUMN "thumbnail_url"
    `);
    await queryRunner.query(
      `DROP TYPE "dispute_evidence_processing_status_enum"`,
    );
  }
}
