import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds host/landlord response fields to `reviews` (one response per review).
 */
export class AddReviewResponse1930700000000 implements MigrationInterface {
  name = 'AddReviewResponse1930700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "reviews"
        ADD COLUMN IF NOT EXISTS "response" text NULL,
        ADD COLUMN IF NOT EXISTS "responded_at" TIMESTAMP NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "reviews"
        DROP COLUMN IF EXISTS "responded_at",
        DROP COLUMN IF EXISTS "response"
    `);
  }
}
