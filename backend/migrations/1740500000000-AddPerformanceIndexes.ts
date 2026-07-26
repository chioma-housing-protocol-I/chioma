import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPerformanceIndexes1740500000000 implements MigrationInterface {
  name = 'AddPerformanceIndexes1740500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ═══════════════════════════════════════════════════════════════════════
    // USERS TABLE INDEXES
    // ═══════════════════════════════════════════════════════════════════════

    // Index on wallet_address for Stellar authentication lookups
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_users_wallet_address" ON "users" ("wallet_address") WHERE "wallet_address" IS NOT NULL`,
    );

    // Composite index for active user queries with role filtering
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_users_role_is_active" ON "users" ("role", "is_active")`,
    );

    // Index for KYC status filtering
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_users_kyc_status" ON "users" ("kyc_status")`,
    );

    // Index for soft delete queries
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_users_deleted_at" ON "users" ("deleted_at")`,
    );

    // ═══════════════════════════════════════════════════════════════════════
    // PROPERTIES TABLE INDEXES
    // ═══════════════════════════════════════════════════════════════════════

    // Composite index for property search by status and type
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_properties_status_type" ON "properties" ("status", "type")`,
    );

    // Composite index for location-based queries
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_properties_city_status" ON "properties" ("city", "status")`,
    );

    // Index for price range queries
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_properties_price" ON "properties" ("price")`,
    );

    // ═══════════════════════════════════════════════════════════════════════
    // RENT_AGREEMENTS TABLE INDEXES
    // ═══════════════════════════════════════════════════════════════════════

    // Foreign key indexes for relationship queries
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_rent_agreements_landlord_id" ON "rent_agreements" ("landlord_id")`,
    );

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_rent_agreements_tenant_id" ON "rent_agreements" ("tenant_id")`,
    );

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_rent_agreements_agent_id" ON "rent_agreements" ("agent_id")`,
    );

    // Composite index for date range queries
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_rent_agreements_start_end_date" ON "rent_agreements" ("start_date", "end_date")`,
    );

    // Index for blockchain sync status
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_rent_agreements_on_chain_status" ON "rent_agreements" ("on_chain_status") WHERE "on_chain_status" IS NOT NULL`,
    );

    // ═══════════════════════════════════════════════════════════════════════
    // KYC TABLE INDEXES
    // ═══════════════════════════════════════════════════════════════════════

    // Composite index for status filtering by user
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_kyc_status_created_at" ON "kyc" ("status", "created_at")`,
    );

    // ═══════════════════════════════════════════════════════════════════════
    // STELLAR_ESCROWS TABLE INDEXES
    // ═══════════════════════════════════════════════════════════════════════

    // Index for rent agreement lookups
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_stellar_escrows_rent_agreement_id" ON "stellar_escrows" ("rent_agreement_id") WHERE "rent_agreement_id" IS NOT NULL`,
    );

    // Index for blockchain escrow ID lookups (if not already exists from previous migration)
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_stellar_escrows_blockchain_escrow_id" ON "stellar_escrows" ("blockchain_escrow_id") WHERE "blockchain_escrow_id" IS NOT NULL`,
    );

    // Index for dispute tracking
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_stellar_escrows_dispute_id" ON "stellar_escrows" ("dispute_id") WHERE "dispute_id" IS NOT NULL`,
    );

    // ═══════════════════════════════════════════════════════════════════════
    // DISPUTES TABLE INDEXES
    // ═══════════════════════════════════════════════════════════════════════

    // Foreign key indexes
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_disputes_agreement_id" ON "disputes" ("agreement_id")`,
    );

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_disputes_initiated_by" ON "disputes" ("initiated_by")`,
    );

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_disputes_resolved_by" ON "disputes" ("resolved_by") WHERE "resolved_by" IS NOT NULL`,
    );

    // Composite index for status and type filtering
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_disputes_status_type" ON "disputes" ("status", "dispute_type")`,
    );

    // Index for blockchain dispute tracking
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_disputes_blockchain_agreement_id" ON "disputes" ("blockchain_agreement_id") WHERE "blockchain_agreement_id" IS NOT NULL`,
    );

    // Index for transaction hash lookups
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_disputes_transaction_hash" ON "disputes" ("transaction_hash") WHERE "transaction_hash" IS NOT NULL`,
    );

    // ═══════════════════════════════════════════════════════════════════════
    // PAYMENTS TABLE INDEXES
    // ═══════════════════════════════════════════════════════════════════════

    // Index for agreement payment lookups
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_payments_agreement_id" ON "payments" ("agreement_id") WHERE "agreement_id" IS NOT NULL`,
    );

    // Composite index for status and date filtering
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_payments_status_created_at" ON "payments" ("status", "created_at")`,
    );

    // Index for payment method lookups
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_payments_payment_method_id" ON "payments" ("payment_method_id") WHERE "payment_method_id" IS NOT NULL`,
    );

    // ═══════════════════════════════════════════════════════════════════════
    // NOTIFICATIONS TABLE INDEXES
    // ═══════════════════════════════════════════════════════════════════════

    // Composite index for unread notifications by user
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_notifications_user_id_is_read" ON "notifications" ("user_id", "is_read")`,
    );

    // Index for notification type filtering
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_notifications_type_created_at" ON "notifications" ("type", "created_at")`,
    );

    // ═══════════════════════════════════════════════════════════════════════
    // ARBITERS TABLE INDEXES
    // ═══════════════════════════════════════════════════════════════════════

    // Index for active arbiter queries
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_arbiters_active" ON "arbiters" ("active")`,
    );

    // Index for user ID lookups
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_arbiters_user_id" ON "arbiters" ("user_id") WHERE "user_id" IS NOT NULL`,
    );

    // Index for transaction hash lookups
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_arbiters_transaction_hash" ON "arbiters" ("transaction_hash") WHERE "transaction_hash" IS NOT NULL`,
    );

    // ═══════════════════════════════════════════════════════════════════════
    // PROPERTY_IMAGES TABLE INDEXES
    // ═══════════════════════════════════════════════════════════════════════

    // Index for property image queries
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_property_images_property_id" ON "property_images" ("property_id")`,
    );

    // ═══════════════════════════════════════════════════════════════════════
    // PROPERTY_AMENITIES TABLE INDEXES
    // ═══════════════════════════════════════════════════════════════════════

    // Index for property amenity queries
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_property_amenities_property_id" ON "property_amenities" ("property_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes in reverse order
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_property_amenities_property_id"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_property_images_property_id"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_arbiters_transaction_hash"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_arbiters_user_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_arbiters_active"`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_notifications_type_created_at"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_notifications_user_id_is_read"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_payments_payment_method_id"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_payments_status_created_at"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_payments_agreement_id"`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_disputes_transaction_hash"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_disputes_blockchain_agreement_id"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_disputes_status_type"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_disputes_resolved_by"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_disputes_initiated_by"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_disputes_agreement_id"`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_stellar_escrows_dispute_id"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_stellar_escrows_blockchain_escrow_id"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_stellar_escrows_rent_agreement_id"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_kyc_status_created_at"`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_rent_agreements_on_chain_status"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_rent_agreements_start_end_date"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_rent_agreements_agent_id"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_rent_agreements_tenant_id"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_rent_agreements_landlord_id"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_properties_price"`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_properties_city_status"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_properties_status_type"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_users_deleted_at"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_users_kyc_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_users_role_is_active"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_users_wallet_address"`);
  }
}
