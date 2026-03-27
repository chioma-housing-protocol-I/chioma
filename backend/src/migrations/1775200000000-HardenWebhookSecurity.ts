import { MigrationInterface, QueryRunner } from 'typeorm';

export class HardenWebhookSecurity1775200000000 implements MigrationInterface {
  name = 'HardenWebhookSecurity1775200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "webhook_endpoints" ADD COLUMN IF NOT EXISTS "user_id" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "webhook_endpoints" ADD COLUMN IF NOT EXISTS "events" text NOT NULL DEFAULT ''`,
    );
    await queryRunner.query(
      `ALTER TABLE "webhook_endpoints" ADD COLUMN IF NOT EXISTS "secret" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "webhook_endpoints" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "webhook_endpoints" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP NOT NULL DEFAULT now()`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "webhook_deliveries" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "endpoint_id" uuid NOT NULL,
        "event" character varying NOT NULL,
        "payload" text NOT NULL,
        "response_status" integer,
        "response_body" text,
        "successful" boolean NOT NULL DEFAULT false,
        "attempt_count" integer NOT NULL DEFAULT 0,
        "next_retry_at" TIMESTAMP,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "delivered_at" TIMESTAMP,
        CONSTRAINT "PK_webhook_deliveries_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_webhook_deliveries_endpoint" FOREIGN KEY ("endpoint_id") REFERENCES "webhook_endpoints"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "webhook_deliveries"`);
    await queryRunner.query(
      `ALTER TABLE "webhook_endpoints" DROP COLUMN IF EXISTS "updated_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "webhook_endpoints" DROP COLUMN IF EXISTS "created_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "webhook_endpoints" DROP COLUMN IF EXISTS "secret"`,
    );
    await queryRunner.query(
      `ALTER TABLE "webhook_endpoints" DROP COLUMN IF EXISTS "events"`,
    );
    await queryRunner.query(
      `ALTER TABLE "webhook_endpoints" DROP COLUMN IF EXISTS "user_id"`,
    );
  }
}
