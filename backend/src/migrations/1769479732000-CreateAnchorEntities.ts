import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAnchorEntities1769479732000 implements MigrationInterface {
  name = 'CreateAnchorEntities1769479732000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create supported_currencies table
    await queryRunner.query(`
      CREATE TABLE "supported_currencies" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "code" character varying(10) NOT NULL,
        "name" character varying NOT NULL,
        "type" character varying NOT NULL CHECK (type IN ('fiat', 'crypto')),
        "is_active" boolean NOT NULL DEFAULT true,
        "symbol" character varying,
        "decimal_places" integer,
        "exchange_rate_to_usd" decimal(10,6),
        "anchor_asset_code" character varying,
        "anchor_asset_issuer" character varying,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_supported_currencies" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_supported_currencies_code" UNIQUE ("code")
      )
    `);

    // Create anchor_transactions table
    await queryRunner.query(`
      CREATE TABLE "anchor_transactions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "type" character varying NOT NULL CHECK (type IN ('deposit', 'withdrawal')),
        "status" character varying NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
        "amount" decimal(20,8) NOT NULL,
        "fiat_currency" character varying(3) NOT NULL,
        "payment_method" character varying CHECK (payment_method IN ('SEPA', 'SWIFT', 'ACH')),
        "wallet_address" character varying,
        "destination" text,
        "anchor_transaction_id" character varying,
        "stellar_transaction_hash" character varying,
        "usdc_amount" decimal(20,8),
        "anchor_response" json,
        "error_message" text,
        "anchor_provider" character varying,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_anchor_transactions" PRIMARY KEY ("id")
      )
    `);

    // Add foreign key constraint
    await queryRunner.query(`
      ALTER TABLE "anchor_transactions"
      ADD CONSTRAINT "FK_anchor_transactions_user_id"
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
    `);

    // Insert default supported currencies
    await queryRunner.query(`
      INSERT INTO "supported_currencies" ("id", "code", "name", "type", "is_active", "symbol", "decimal_places", "exchange_rate_to_usd", "anchor_asset_code", "anchor_asset_issuer")
      VALUES
        (uuid_generate_v4(), 'USD', 'United States Dollar', 'fiat', true, '$', 2, 1.000000, NULL, NULL),
        (uuid_generate_v4(), 'EUR', 'Euro', 'fiat', true, '€', 2, 1.080000, NULL, NULL),
        (uuid_generate_v4(), 'GBP', 'British Pound Sterling', 'fiat', true, '£', 2, 1.270000, NULL, NULL),
        (uuid_generate_v4(), 'NGN', 'Nigerian Naira', 'fiat', true, '₦', 2, 0.000670, NULL, NULL),
        (uuid_generate_v4(), 'USDC', 'USD Coin', 'crypto', true, '$', 7, 1.000000, 'USDC', 'GA5ZSEJYB37JYG2FYGN2G6XCZMJEJRVO5N4X7XRQOV7P6B3M3Q5YHJMX')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove foreign key constraint
    await queryRunner.query(`ALTER TABLE "anchor_transactions" DROP CONSTRAINT "FK_anchor_transactions_user_id"`);

    // Drop tables
    await queryRunner.query(`DROP TABLE "anchor_transactions"`);
    await queryRunner.query(`DROP TABLE "supported_currencies"`);
  }
}