import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStrategicDatabaseIndexes1784000000000 implements MigrationInterface {
  name = 'AddStrategicDatabaseIndexes1784000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ========== notifications ==========
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_notifications_user_id" ON "notifications" ("user_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_notifications_is_read" ON "notifications" ("is_read")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_notifications_type" ON "notifications" ("type")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_notifications_created_at" ON "notifications" ("created_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_notifications_user_read" ON "notifications" ("user_id", "is_read")`,
    );

    // ========== disputes ==========
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_disputes_agreement_id" ON "disputes" ("agreement_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_disputes_initiated_by" ON "disputes" ("initiated_by")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_disputes_status" ON "disputes" ("status")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_disputes_dispute_type" ON "disputes" ("dispute_type")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_disputes_created_at" ON "disputes" ("created_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_disputes_status_type" ON "disputes" ("status", "dispute_type")`,
    );

    // ========== dispute_evidence ==========
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_dispute_evidence_dispute_id" ON "dispute_evidence" ("dispute_id")`,
    );

    // ========== dispute_comments ==========
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_dispute_comments_dispute_id" ON "dispute_comments" ("dispute_id")`,
    );

    // ========== payments ==========
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_payments_agreement_id" ON "payments" ("agreement_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_payments_status" ON "payments" ("status")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_payments_currency" ON "payments" ("currency")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_payments_reference_number" ON "payments" ("reference_number")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_payments_created_at" ON "payments" ("created_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_payments_user_status" ON "payments" ("user_id", "status")`,
    );

    // ========== payment_schedules ==========
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_payment_schedules_status" ON "payment_schedules" ("status")`,
    );

    // ========== property_images ==========
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_property_images_property_id" ON "property_images" ("property_id")`,
    );

    // ========== property_amenities ==========
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_property_amenities_property_id" ON "property_amenities" ("property_id")`,
    );

    // ========== rental_units ==========
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_rental_units_property_id" ON "rental_units" ("property_id")`,
    );

    // ========== rent_agreements ==========
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_rent_agreements_user_id" ON "rent_agreements" ("user_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_rent_agreements_admin_id" ON "rent_agreements" ("admin_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_rent_agreements_created_at" ON "rent_agreements" ("created_at")`,
    );

    // ========== rent_payments (legacy table: agreement_id + status only) ==========
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_rent_payments_agreement_id" ON "rent_payments" ("agreement_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_rent_payments_status" ON "rent_payments" ("status")`,
    );

    // ========== maintenance_requests ==========
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_maintenance_requests_property_id" ON "maintenance_requests" ("property_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_maintenance_requests_tenant_id" ON "maintenance_requests" ("tenant_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_maintenance_requests_landlord_id" ON "maintenance_requests" ("landlord_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_maintenance_requests_status" ON "maintenance_requests" ("status")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_maintenance_requests_priority" ON "maintenance_requests" ("priority")`,
    );

    // ========== message ==========
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_messages_sender_id" ON "message" ("sender_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_messages_receiver_id" ON "message" ("receiver_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_messages_timestamp" ON "message" ("timestamp")`,
    );

    // ========== participant ==========
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_participant_user_id" ON "participant" ("user_id")`,
    );

    // ========== chat_room ==========
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_chat_room_group_id" ON "chat_room" ("chat_group_id")`,
    );

    // ========== webhook_endpoints ==========
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_webhook_endpoints_user_id" ON "webhook_endpoints" ("user_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_webhook_endpoints_is_active" ON "webhook_endpoints" ("is_active")`,
    );

    // ========== webhook_deliveries ==========
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_webhook_deliveries_endpoint_id" ON "webhook_deliveries" ("endpoint_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_webhook_deliveries_successful" ON "webhook_deliveries" ("successful")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_webhook_deliveries_created_at" ON "webhook_deliveries" ("created_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_webhook_deliveries_next_retry" ON "webhook_deliveries" ("next_retry_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_webhook_deliveries_endpoint_status" ON "webhook_deliveries" ("endpoint_id", "successful")`,
    );

    // ========== file_metadata ==========
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_file_metadata_owner_id" ON "file_metadata" ("owner_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_file_metadata_file_type" ON "file_metadata" ("file_type")`,
    );

    // ========== kyc ==========
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_kyc_status" ON "kyc" ("status")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_kyc_user_id" ON "kyc" ("user_id")`,
    );

    // ========== feedback ==========
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_feedback_user_id" ON "feedback" ("user_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_feedback_created_at" ON "feedback" ("created_at")`,
    );

    // ========== api_keys ==========
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_api_keys_user_id" ON "api_keys" ("user_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_api_keys_status" ON "api_keys" ("status")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_api_keys_expires_at" ON "api_keys" ("expires_at")`,
    );

    // ========== stellar_transactions ==========
    // No agreement linkage column on this table (source_account/destination_account
    // only) — index status instead, which is what queries actually filter on.
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_stellar_tx_status" ON "stellar_transactions" ("status")`,
    );

    // ========== stellar_escrows ==========
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_stellar_escrows_agreement_id" ON "stellar_escrows" ("rent_agreement_id")`,
    );

    // ========== rent_obligation_nfts ==========
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_rent_obligation_nfts_agreement_id" ON "rent_obligation_nfts" ("agreement_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_rent_obligation_nfts_current_owner" ON "rent_obligation_nfts" ("current_owner")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_rent_obligation_nfts_status" ON "rent_obligation_nfts" ("status")`,
    );

    // ========== nft_transfers ==========
    // Table has no creation migration yet (entity-only); guard so this
    // migration stays runnable until that table is created.
    await queryRunner.query(`
      DO $$
      BEGIN
        IF to_regclass('public.nft_transfers') IS NOT NULL THEN
          CREATE INDEX IF NOT EXISTS "IDX_nft_transfers_token_id" ON "nft_transfers" ("token_id");
          CREATE INDEX IF NOT EXISTS "IDX_nft_transfers_from_to" ON "nft_transfers" ("from_address", "to_address");
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const indexes = [
      'IDX_notifications_user_id',
      'IDX_notifications_is_read',
      'IDX_notifications_type',
      'IDX_notifications_created_at',
      'IDX_notifications_user_read',
      'IDX_disputes_agreement_id',
      'IDX_disputes_initiated_by',
      'IDX_disputes_status',
      'IDX_disputes_dispute_type',
      'IDX_disputes_created_at',
      'IDX_disputes_status_type',
      'IDX_dispute_evidence_dispute_id',
      'IDX_dispute_comments_dispute_id',
      'IDX_payments_agreement_id',
      'IDX_payments_status',
      'IDX_payments_currency',
      'IDX_payments_reference_number',
      'IDX_payments_created_at',
      'IDX_payments_user_status',
      'IDX_payment_schedules_status',
      'IDX_property_images_property_id',
      'IDX_property_amenities_property_id',
      'IDX_rental_units_property_id',
      'IDX_rent_agreements_user_id',
      'IDX_rent_agreements_admin_id',
      'IDX_rent_agreements_created_at',
      'IDX_rent_payments_agreement_id',
      'IDX_rent_payments_status',
      'IDX_maintenance_requests_property_id',
      'IDX_maintenance_requests_tenant_id',
      'IDX_maintenance_requests_landlord_id',
      'IDX_maintenance_requests_status',
      'IDX_maintenance_requests_priority',
      'IDX_messages_sender_id',
      'IDX_messages_receiver_id',
      'IDX_messages_timestamp',
      'IDX_participant_user_id',
      'IDX_chat_room_group_id',
      'IDX_webhook_endpoints_user_id',
      'IDX_webhook_endpoints_is_active',
      'IDX_webhook_deliveries_endpoint_id',
      'IDX_webhook_deliveries_successful',
      'IDX_webhook_deliveries_created_at',
      'IDX_webhook_deliveries_next_retry',
      'IDX_webhook_deliveries_endpoint_status',
      'IDX_file_metadata_owner_id',
      'IDX_file_metadata_file_type',
      'IDX_kyc_status',
      'IDX_kyc_user_id',
      'IDX_feedback_user_id',
      'IDX_feedback_created_at',
      'IDX_api_keys_user_id',
      'IDX_api_keys_status',
      'IDX_api_keys_expires_at',
      'IDX_stellar_tx_status',
      'IDX_stellar_escrows_agreement_id',
      'IDX_rent_obligation_nfts_agreement_id',
      'IDX_rent_obligation_nfts_current_owner',
      'IDX_rent_obligation_nfts_status',
    ];

    for (const index of indexes) {
      await queryRunner.query(`DROP INDEX IF EXISTS "${index}"`);
    }

    await queryRunner.query(`
      DO $$
      BEGIN
        IF to_regclass('public.nft_transfers') IS NOT NULL THEN
          DROP INDEX IF EXISTS "IDX_nft_transfers_token_id";
          DROP INDEX IF EXISTS "IDX_nft_transfers_from_to";
        END IF;
      END $$;
    `);
  }
}
