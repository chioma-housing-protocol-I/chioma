import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Settlement offers let dispute parties negotiate (propose / counter /
 * accept / reject) before escalating to arbitration.
 */
export class CreateDisputeSettlementOffers1930800000000 implements MigrationInterface {
  name = 'CreateDisputeSettlementOffers1930800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "dispute_settlement_offers" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "dispute_id" integer NOT NULL,
        "proposed_by" uuid NOT NULL,
        "recipient_id" uuid NOT NULL,
        "amount" decimal(12,2) NULL,
        "terms" text NOT NULL,
        "status" varchar(20) NOT NULL DEFAULT 'PENDING',
        "parent_offer_id" uuid NULL,
        "response_note" text NULL,
        "responded_at" TIMESTAMP NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_dispute_settlement_offers_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_settlement_offers_dispute" FOREIGN KEY ("dispute_id")
          REFERENCES "disputes"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_settlement_offers_dispute_id" ON "dispute_settlement_offers" ("dispute_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_settlement_offers_dispute_id"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "dispute_settlement_offers"`);
  }
}
