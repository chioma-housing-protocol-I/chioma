import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateFraudThresholdsTable1900920000000
  implements MigrationInterface
{
  name = 'CreateFraudThresholdsTable1900920000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "fraud_thresholds" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "key" character varying(100) NOT NULL DEFAULT 'default',
        "threshold_review" integer NOT NULL,
        "threshold_block" integer NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_fraud_thresholds_key" UNIQUE ("key"),
        CONSTRAINT "PK_fraud_thresholds_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_fraud_thresholds_key"
        ON "fraud_thresholds" ("key")
    `);

    // Seed the default row with the values that used to be hardcoded in
    // FraudModelService, so scoring behavior is unchanged until an admin
    // explicitly tunes them.
    await queryRunner.query(`
      INSERT INTO "fraud_thresholds" ("key", "threshold_review", "threshold_block")
      VALUES ('default', 45, 75)
      ON CONFLICT ("key") DO NOTHING
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "fraud_thresholds"`);
  }
}
