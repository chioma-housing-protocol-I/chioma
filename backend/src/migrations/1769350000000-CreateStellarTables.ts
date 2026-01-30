import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateStellarTables1769350000000 implements MigrationInterface {
  name = 'CreateStellarTables1769350000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create stellar_accounts table
    await queryRunner.query(`
      CREATE TABLE "stellar_accounts" (
        "id" SERIAL PRIMARY KEY,
        "user_id" uuid REFERENCES users(id) ON DELETE CASCADE,
        "public_key" VARCHAR(56) NOT NULL UNIQUE,
        "secret_key_encrypted" TEXT NOT NULL,
        "sequence_number" BIGINT DEFAULT 0,
        "account_type" VARCHAR(20) NOT NULL,
        "is_active" BOOLEAN DEFAULT true,
        "balance" DECIMAL(20,7) DEFAULT 0,
        "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create index on user_id for stellar_accounts
    await queryRunner.query(`
      CREATE INDEX "IDX_stellar_accounts_user_id" ON "stellar_accounts" ("user_id")
    `);

    // Create index on account_type for stellar_accounts
    await queryRunner.query(`
      CREATE INDEX "IDX_stellar_accounts_account_type" ON "stellar_accounts" ("account_type")
    `);

    // Create stellar_transactions table
    await queryRunner.query(`
      CREATE TABLE "stellar_transactions" (
        "id" SERIAL PRIMARY KEY,
        "transaction_hash" VARCHAR(64) UNIQUE NOT NULL,
        "from_account_id" INTEGER REFERENCES stellar_accounts(id) ON DELETE SET NULL,
        "to_account_id" INTEGER REFERENCES stellar_accounts(id) ON DELETE SET NULL,
        "asset_type" VARCHAR(16) NOT NULL,
        "asset_code" VARCHAR(12),
        "asset_issuer" VARCHAR(56),
        "amount" DECIMAL(20,7) NOT NULL,
        "fee_paid" INTEGER NOT NULL,
        "memo" TEXT,
        "memo_type" VARCHAR(10),
        "status" VARCHAR(20) NOT NULL,
        "ledger" INTEGER,
        "source_account" VARCHAR(56),
        "destination_account" VARCHAR(56),
        "idempotency_key" VARCHAR(64) UNIQUE,
        "error_message" TEXT,
        "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes for stellar_transactions
    await queryRunner.query(`
      CREATE INDEX "IDX_stellar_transactions_from_account" ON "stellar_transactions" ("from_account_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_stellar_transactions_to_account" ON "stellar_transactions" ("to_account_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_stellar_transactions_status" ON "stellar_transactions" ("status")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_stellar_transactions_created_at" ON "stellar_transactions" ("created_at")
    `);

    // Create stellar_escrows table
    await queryRunner.query(`
      CREATE TABLE "stellar_escrows" (
        "id" SERIAL PRIMARY KEY,
        "escrow_account_id" INTEGER REFERENCES stellar_accounts(id) UNIQUE NOT NULL,
        "source_account_id" INTEGER REFERENCES stellar_accounts(id) NOT NULL,
        "destination_account_id" INTEGER REFERENCES stellar_accounts(id) NOT NULL,
        "amount" DECIMAL(20,7) NOT NULL,
        "asset_type" VARCHAR(16) NOT NULL,
        "asset_code" VARCHAR(12),
        "asset_issuer" VARCHAR(56),
        "sequence_number" BIGINT NOT NULL,
        "status" VARCHAR(20) NOT NULL,
        "release_conditions" JSONB,
        "expiration_date" TIMESTAMP,
        "released_at" TIMESTAMP,
        "refunded_at" TIMESTAMP,
        "release_transaction_hash" VARCHAR(64),
        "refund_transaction_hash" VARCHAR(64),
        "rent_agreement_id" uuid,
        "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes for stellar_escrows
    await queryRunner.query(`
      CREATE INDEX "IDX_stellar_escrows_source_account" ON "stellar_escrows" ("source_account_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_stellar_escrows_destination_account" ON "stellar_escrows" ("destination_account_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_stellar_escrows_status" ON "stellar_escrows" ("status")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_stellar_escrows_expiration" ON "stellar_escrows" ("expiration_date")
    `);

    // Create function to update updated_at timestamp
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION update_stellar_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // Create triggers for updated_at
    await queryRunner.query(`
      CREATE TRIGGER stellar_accounts_updated_at
      BEFORE UPDATE ON stellar_accounts
      FOR EACH ROW
      EXECUTE FUNCTION update_stellar_updated_at();
    `);

    await queryRunner.query(`
      CREATE TRIGGER stellar_transactions_updated_at
      BEFORE UPDATE ON stellar_transactions
      FOR EACH ROW
      EXECUTE FUNCTION update_stellar_updated_at();
    `);

    await queryRunner.query(`
      CREATE TRIGGER stellar_escrows_updated_at
      BEFORE UPDATE ON stellar_escrows
      FOR EACH ROW
      EXECUTE FUNCTION update_stellar_updated_at();
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop triggers
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS stellar_escrows_updated_at ON stellar_escrows`,
    );
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS stellar_transactions_updated_at ON stellar_transactions`,
    );
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS stellar_accounts_updated_at ON stellar_accounts`,
    );

    // Drop function
    await queryRunner.query(
      `DROP FUNCTION IF EXISTS update_stellar_updated_at`,
    );

    // Drop indexes for stellar_escrows
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_stellar_escrows_expiration"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_stellar_escrows_status"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_stellar_escrows_destination_account"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_stellar_escrows_source_account"`,
    );

    // Drop indexes for stellar_transactions
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_stellar_transactions_created_at"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_stellar_transactions_status"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_stellar_transactions_to_account"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_stellar_transactions_from_account"`,
    );

    // Drop indexes for stellar_accounts
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_stellar_accounts_account_type"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_stellar_accounts_user_id"`,
    );

    // Drop tables
    await queryRunner.query(`DROP TABLE IF EXISTS "stellar_escrows"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "stellar_transactions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "stellar_accounts"`);
  }
}
