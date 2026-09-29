import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Creates `termination_reconciliations`, the durable per-agreement record of
 * the reconciliation run when a lease is terminated (prorated final rent,
 * deposit refund/escrow release, and the system's own multisig approval for
 * escrow release — see AgreementsService.terminate/retryTerminationReconciliation).
 * A unique index on `agreement_id` means a retry updates the existing row for
 * that agreement instead of accumulating duplicate reconciliation attempts.
 */
export class CreateTerminationReconciliationsTable1930500000000 implements MigrationInterface {
  name = 'CreateTerminationReconciliationsTable1930500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "termination_reconciliations" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "agreement_id" uuid NOT NULL,
        "termination_date" TIMESTAMP NOT NULL,
        "prorated_rent_owed" numeric(12,2) NOT NULL,
        "deposit_refund_status" character varying(20) NOT NULL DEFAULT 'pending',
        "deposit_refund_error" text,
        "escrow_release_status" character varying(20) NOT NULL DEFAULT 'pending',
        "escrow_release_error" text,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_termination_reconciliations" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_termination_reconciliations_agreement_id"
      ON "termination_reconciliations" ("agreement_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TABLE IF EXISTS "termination_reconciliations"`,
    );
  }
}
