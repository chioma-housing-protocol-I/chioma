import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateFeatureFlagsTable1930200000000 implements MigrationInterface {
  name = 'CreateFeatureFlagsTable1930200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "feature_flags" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "key" character varying(100) NOT NULL,
        "description" character varying(255),
        "enabled" boolean NOT NULL DEFAULT true,
        "rollout_percentage" integer NOT NULL DEFAULT '100',
        "metadata" text,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_36d0344370584b4d6a953c53a69" UNIQUE ("key"),
        CONSTRAINT "PK_db657d344e9caacfc9d5cf8bbac" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_36d0344370584b4d6a953c53a6"
      ON "feature_flags" ("key")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "feature_flags"`);
  }
}
