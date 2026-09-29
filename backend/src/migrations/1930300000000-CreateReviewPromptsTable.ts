import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateReviewPromptsTable1930300000000 implements MigrationInterface {
  name = 'CreateReviewPromptsTable1930300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "review_prompts" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "context" character varying NOT NULL,
        "source_id" uuid NOT NULL,
        "prompted_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_review_prompts_context_source_id" UNIQUE ("context", "source_id"),
        CONSTRAINT "PK_review_prompts_id" PRIMARY KEY ("id")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "review_prompts"`);
  }
}
