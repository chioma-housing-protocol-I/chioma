import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateFraudAlertsTable1783300000000 implements MigrationInterface {
  name = 'CreateFraudAlertsTable1783300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "fraud_alerts" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "subject_type" character varying(32) NOT NULL,
        "subject_id" uuid NOT NULL,
        "score" integer NOT NULL,
        "decision" character varying(16) NOT NULL,
        "reasons" jsonb NOT NULL,
        "model_version" character varying(128) NOT NULL,
        "features" jsonb,
        "status" character varying(16) NOT NULL DEFAULT 'open',
        "resolved_at" TIMESTAMP,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_fraud_alerts_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_fraud_alerts_status_created" ON "fraud_alerts" ("status", "created_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_fraud_alerts_subject" ON "fraud_alerts" ("subject_type", "subject_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_fraud_alerts_subject"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_fraud_alerts_status_created"`,
    );
    await queryRunner.query(`DROP TABLE "fraud_alerts"`);
  }
}
