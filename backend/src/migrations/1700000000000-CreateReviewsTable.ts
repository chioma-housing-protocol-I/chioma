import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateReviewsTable1700000000000 implements MigrationInterface {
  name = 'CreateReviewsTable1700000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "reviews" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "reviewer_id" uuid NOT NULL,
        "reviewee_id" uuid NOT NULL,
        "context" VARCHAR NOT NULL,
        "rating" INTEGER NOT NULL,
        "comment" TEXT,
        "anonymous" BOOLEAN DEFAULT false,
        "property_id" uuid,
        "created_at" TIMESTAMP DEFAULT now(),
        "reported" BOOLEAN DEFAULT false
      );
      CREATE INDEX "IDX_reviews_reviewer_id" ON "reviews" ("reviewer_id");
      CREATE INDEX "IDX_reviews_reviewee_id" ON "reviews" ("reviewee_id");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "reviews";');
  }
}
