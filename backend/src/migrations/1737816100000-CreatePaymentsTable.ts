import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePaymentsTable1737816100000 implements MigrationInterface {
  name = 'CreatePaymentsTable1737816100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // Drop the old rent_payments table as we're creating a new comprehensive payments table
    await queryRunner.query(`DROP TABLE IF EXISTS "rent_payments" CASCADE`);

    // Create payment methods table
    await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "payment_methods" (
                "id" SERIAL PRIMARY KEY,
                "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
                "payment_type" VARCHAR(20) NOT NULL,
                "last_four" VARCHAR(4),
                "expiry_date" DATE,
                "is_default" BOOLEAN DEFAULT false,
                "metadata" JSONB,
                "encrypted_metadata" TEXT,
                "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

    // Create the new payments table
    await queryRunner.query(`
            CREATE TABLE "payments" (
                "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
                "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
                "agreement_id" uuid,
                "payment_method_id" INTEGER REFERENCES "payment_methods"("id"),
                "amount" DECIMAL(12,2) NOT NULL,
                "fee_amount" DECIMAL(12,2) DEFAULT 0.00,
                "net_amount" DECIMAL(12,2) DEFAULT 0.00,
                "currency" VARCHAR(3) DEFAULT 'NGN',
                "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
                "reference_number" VARCHAR(100),
                "processed_at" TIMESTAMP,
                "refunded_amount" DECIMAL(12,2) DEFAULT 0.00,
                "refund_reason" TEXT,
                "idempotency_key" VARCHAR(100),
                "metadata" JSONB,
                "notes" TEXT,
                "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT "fk_payments_agreement" 
                    FOREIGN KEY ("agreement_id") 
                    REFERENCES "rent_agreements"("id") 
                    ON DELETE SET NULL
            )
        `);

    // Create indexes for better query performance
    await queryRunner.query(
      `CREATE INDEX "idx_payments_user_id" ON "payments"("user_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_payments_processed_at" ON "payments"("processed_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_payments_status" ON "payments"("status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_payments_agreement_id" ON "payments"("agreement_id")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_payments_user_id_idempotency_key" ON "payments"("user_id", "idempotency_key") WHERE "idempotency_key" IS NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(
      `DROP INDEX IF EXISTS "uq_payments_user_id_idempotency_key"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_payments_agreement_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_payments_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_payments_processed_at"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_payments_user_id"`);

    // Drop the payments table
    await queryRunner.query(`DROP TABLE IF EXISTS "payments"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "payment_methods"`);

    // Recreate the old rent_payments table
    await queryRunner.query(`
        CREATE TABLE "rent_payments" (
          "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
          "amount" numeric(10,2) NOT NULL,
          "status" character varying NOT NULL DEFAULT 'pending',
          "paid_at" TIMESTAMP NOT NULL DEFAULT now(),
          "contract_id" uuid,
          CONSTRAINT "PK_deca3deaaf83de65c31d5efe8a3" PRIMARY KEY ("id")
        )
      `);

    await queryRunner.query(`
        ALTER TABLE "rent_payments" 
        ADD CONSTRAINT "FK_e19b070b0b7c5324b5c248efcdd" 
        FOREIGN KEY ("contract_id") 
        REFERENCES "rent_agreements"("id") 
        ON DELETE NO ACTION 
        ON UPDATE NO ACTION
      `);
  }
}
