import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePropertyListingDraftsTable1870600000000 implements MigrationInterface {
  name = 'CreatePropertyListingDraftsTable1870600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TABLE "property_listing_drafts" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "landlordId" uuid NOT NULL, "data" jsonb NOT NULL DEFAULT '{}', "currentStep" integer NOT NULL DEFAULT '1', "completedSteps" jsonb NOT NULL DEFAULT '[]', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "expiresAt" TIMESTAMP, CONSTRAINT "PK_ba2fcb38ff43f916a8662af51cf" PRIMARY KEY ("id"));
      EXCEPTION WHEN duplicate_table THEN null;
      END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE INDEX IF NOT EXISTS "IDX_2f1098f5325b4ed3facba21625" ON "property_listing_drafts" ("landlordId");
      EXCEPTION WHEN undefined_column THEN null;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_2f1098f5325b4ed3facba21625"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "property_listing_drafts"`);
  }
}
