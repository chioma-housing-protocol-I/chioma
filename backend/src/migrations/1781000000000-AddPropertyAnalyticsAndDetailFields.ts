import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPropertyAnalyticsAndDetailFields1781000000000
  implements MigrationInterface
{
  name = 'AddPropertyAnalyticsAndDetailFields1781000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "properties"
      ADD COLUMN "view_count" integer NOT NULL DEFAULT 0
    `);
    await queryRunner.query(`
      ALTER TABLE "properties"
      ADD COLUMN "favorite_count" integer NOT NULL DEFAULT 0
    `);
    await queryRunner.query(`
      ALTER TABLE "properties"
      ADD COLUMN "last_viewed_at" TIMESTAMP
    `);
    await queryRunner.query(`
      ALTER TABLE "properties"
      ADD COLUMN "verification_status" character varying(50)
    `);
    await queryRunner.query(`
      ALTER TABLE "properties"
      ADD COLUMN "virtual_tour_url" character varying(500)
    `);
    await queryRunner.query(`
      ALTER TABLE "properties"
      ADD COLUMN "video_url" character varying(500)
    `);
    await queryRunner.query(`
      ALTER TABLE "properties"
      ADD COLUMN "floor_plan_url" character varying(500)
    `);
    await queryRunner.query(`
      ALTER TABLE "properties"
      ADD COLUMN "energy_rating" character varying(10)
    `);
    await queryRunner.query(`
      ALTER TABLE "properties"
      ADD COLUMN "pet_policy" character varying(100)
    `);
    await queryRunner.query(`
      ALTER TABLE "properties"
      ADD COLUMN "parking_spaces" integer
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "properties" DROP COLUMN IF EXISTS "parking_spaces"
    `);
    await queryRunner.query(`
      ALTER TABLE "properties" DROP COLUMN IF EXISTS "pet_policy"
    `);
    await queryRunner.query(`
      ALTER TABLE "properties" DROP COLUMN IF EXISTS "energy_rating"
    `);
    await queryRunner.query(`
      ALTER TABLE "properties" DROP COLUMN IF EXISTS "floor_plan_url"
    `);
    await queryRunner.query(`
      ALTER TABLE "properties" DROP COLUMN IF EXISTS "video_url"
    `);
    await queryRunner.query(`
      ALTER TABLE "properties" DROP COLUMN IF EXISTS "virtual_tour_url"
    `);
    await queryRunner.query(`
      ALTER TABLE "properties" DROP COLUMN IF EXISTS "verification_status"
    `);
    await queryRunner.query(`
      ALTER TABLE "properties" DROP COLUMN IF EXISTS "last_viewed_at"
    `);
    await queryRunner.query(`
      ALTER TABLE "properties" DROP COLUMN IF EXISTS "favorite_count"
    `);
    await queryRunner.query(`
      ALTER TABLE "properties" DROP COLUMN IF EXISTS "view_count"
    `);
  }
}
