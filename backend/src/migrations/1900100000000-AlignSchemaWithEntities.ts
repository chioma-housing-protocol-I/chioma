import { MigrationInterface, QueryRunner } from 'typeorm';

export class AlignSchemaWithEntities1900100000000 implements MigrationInterface {
  name = 'AlignSchemaWithEntities1900100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "tenant_screening_requests" DROP CONSTRAINT "FK_tenant_screening_requests_requester"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tenant_screening_requests" DROP CONSTRAINT "FK_tenant_screening_requests_tenant"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tenant_screening_reports" DROP CONSTRAINT "FK_tenant_screening_reports_screening"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tenant_screening_consents" DROP CONSTRAINT "FK_tenant_screening_consents_tenant"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tenant_screening_consents" DROP CONSTRAINT "FK_tenant_screening_consents_screening"`,
    );
    await queryRunner.query(
      `ALTER TABLE "rent_payments" DROP CONSTRAINT "FK_5b62ad4907dfe7bdbf50691a31e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "property_availability" DROP CONSTRAINT "fk_property_availability_property"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" DROP CONSTRAINT "FK_12fd861c33c885f01b9a7da7d93"`,
    );
    await queryRunner.query(
      `ALTER TABLE "webhook_deliveries" DROP CONSTRAINT "FK_webhook_deliveries_endpoint"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_notification_preferences" DROP CONSTRAINT "FK_user_notification_preferences_user"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_file_metadata_owner_id"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_file_metadata_file_type"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_users_wallet_address"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_users_role_is_active"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_users_kyc_status"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_users_deleted_at"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_stellar_tx_status"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_stellar_escrows_rent_agreement_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_stellar_escrows_blockchain_escrow_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_stellar_escrows_dispute_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_stellar_escrows_multi_sig"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_stellar_escrows_time_locked"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_stellar_escrows_linked_dispute"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_stellar_escrows_agreement_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_tenant_screening_requests_tenant_status"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_tenant_screening_requests_requester_status"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_tenant_screening_consents_screening_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_rent_payments_agreement_id"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_rent_payments_status"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_22ae0f361b6564a995e18b00f8"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_rent_obligation_nfts_agreement_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_rent_obligation_nfts_current_owner"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_rent_obligation_nfts_status"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_rent_agreements_agent_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_rent_agreements_start_end_date"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_rent_agreements_on_chain_status"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_rent_agreements_user_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_rent_agreements_admin_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_rent_agreements_created_at"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_property_images_property_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_property_amenities_name"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_property_amenities_property_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_rental_units_property_id"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_properties_lat_lng"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_properties_status_type"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_properties_city_status"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_properties_price"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_property_tour_engagements_property_id"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_DRAFT_LANDLORD"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_DRAFT_LANDLORD_EXPIRES"`);
    await queryRunner.query(
      `DROP INDEX "public"."idx_property_availability_property_date"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_payments_agreement_id"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_payments_status_created_at"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_payments_payment_method_id"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_payments_status"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_payments_currency"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_payments_reference_number"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_payments_created_at"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_payments_user_status"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_payment_schedules_status"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_notifications_user_id_is_read"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_notifications_type_created_at"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_notifications_user_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_notifications_is_read"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_notifications_type"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_notifications_created_at"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_notifications_user_read"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_messages_sender_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_messages_receiver_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_messages_timestamp"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_chat_room_group_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_participant_user_id"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_maintenance_requests_property_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_maintenance_requests_tenant_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_maintenance_requests_landlord_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_maintenance_requests_status"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_maintenance_requests_priority"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_kyc_status_created_at"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_kyc_status"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_kyc_user_id"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_property_inquiries_property_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_property_inquiries_to_user_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_property_inquiries_from_user_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_fraud_alerts_status_created"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_fraud_alerts_subject"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_feedback_user_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_feedback_created_at"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_dispute_evidence_dispute_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_dispute_comments_dispute_id"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_disputes_agreement_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_disputes_initiated_by"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_disputes_resolved_by"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_disputes_status_type"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_disputes_blockchain_agreement_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_disputes_transaction_hash"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_disputes_status"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_disputes_dispute_type"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_disputes_created_at"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_arbiters_user_id"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_arbiters_transaction_hash"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_api_keys_expires_at"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_api_keys_status"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_api_keys_user_id"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_api_key_rotation_history_api_key_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_api_key_rotation_history_user_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_audit_logs_entity_type_entity_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_audit_logs_performed_by"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_audit_logs_performed_at"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."idx_audit_logs_performed_at"`,
    );
    await queryRunner.query(`DROP INDEX "public"."idx_audit_logs_entity"`);
    await queryRunner.query(
      `DROP INDEX "public"."idx_audit_logs_performed_by"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."idx_audit_logs_old_values_gin"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."idx_audit_logs_new_values_gin"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."idx_audit_logs_metadata_gin"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_webhook_deliveries_endpoint_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_webhook_deliveries_successful"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_webhook_deliveries_created_at"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_webhook_deliveries_next_retry"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_webhook_deliveries_endpoint_status"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_webhook_endpoints_user_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_webhook_endpoints_is_active"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_indexed_transactions_transaction_hash"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_indexed_transactions_ledger"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_indexed_transactions_source_account"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_indexed_transactions_destination_account"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_indexed_transactions_transaction_type"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_indexed_transactions_agreement_id"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_ANCHOR_WALLET_STATUS"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_ANCHOR_TRANSACTION_ID"`);
    await queryRunner.query(
      `ALTER TABLE "property_availability" DROP CONSTRAINT "uq_property_availability"`,
    );
    await queryRunner.query(
      `CREATE TABLE "property_registry" ("property_id" character varying NOT NULL, "owner_address" character varying NOT NULL, "metadata_hash" character varying NOT NULL, "verified" boolean NOT NULL DEFAULT false, "verified_at" TIMESTAMP, "verified_by" character varying, "registered_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_9945b8a0cdeca9bff7a61d2e93f" PRIMARY KEY ("property_id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "property_history" ("id" SERIAL NOT NULL, "property_id" character varying NOT NULL, "from_address" character varying NOT NULL, "to_address" character varying NOT NULL, "transaction_hash" character varying NOT NULL, "transferred_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_bc8a76dcd25689336458fbff608" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "host_reviews" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "booking_id" character varying NOT NULL, "guest_id" character varying NOT NULL, "host_id" character varying NOT NULL, "accuracy" integer NOT NULL DEFAULT '5', "cleanliness" integer NOT NULL DEFAULT '5', "check_in" integer NOT NULL DEFAULT '5', "communication" integer NOT NULL DEFAULT '5', "location" integer NOT NULL DEFAULT '5', "value" integer NOT NULL DEFAULT '5', "comment" text NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_534511ff446ac180479222d561b" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ab26c09629e6ab4309b7853299" ON "host_reviews" ("host_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_4b901110b1687ec23f62bb36be" ON "host_reviews" ("guest_id") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_d6aad25cc5ab5d9d97eb084c04" ON "host_reviews" ("booking_id", "guest_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "guest_reviews" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "booking_id" character varying NOT NULL, "guest_id" character varying NOT NULL, "host_id" character varying NOT NULL, "cleanliness" integer NOT NULL DEFAULT '5', "communication" integer NOT NULL DEFAULT '5', "respect_for_rules" integer NOT NULL DEFAULT '5', "comment" text NOT NULL, "would_host_again" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_950839ef462ee677a2e6024b181" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_9c36cbe4eeecb4295ead49d2c6" ON "guest_reviews" ("host_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ed26655583bfe5ee7d3601eb79" ON "guest_reviews" ("guest_id") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_398a5ed65aebbcd1db2983cff2" ON "guest_reviews" ("booking_id", "host_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "rent_reminders" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "agreement_id" character varying NOT NULL, "tenant_id" character varying NOT NULL, "tenant_email" character varying, "due_date" TIMESTAMP NOT NULL, "days_before" integer NOT NULL, "amount" numeric(12,2) NOT NULL, "type" character varying(20) NOT NULL DEFAULT 'email', "sent" boolean NOT NULL DEFAULT false, "sent_at" TIMESTAMP, "status" character varying(20) NOT NULL DEFAULT 'pending', "error_message" text, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_042d7348f52bf7018a623f02066" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_9ebd1f74b660d99c01e8cacbac" ON "rent_reminders" ("tenant_id", "status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_aff58b903e324c1f0565b44e0d" ON "rent_reminders" ("agreement_id", "due_date") `,
    );
    await queryRunner.query(
      `CREATE TABLE "nft_transfers" ("id" SERIAL NOT NULL, "token_id" character varying NOT NULL, "from_address" character varying NOT NULL, "to_address" character varying NOT NULL, "transaction_hash" character varying, "transferred_at" TIMESTAMP NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_0baa9aa01936ca5a876e2a59eea" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."referrals_status_enum" AS ENUM('pending', 'completed', 'rewarded', 'cancelled')`,
    );
    await queryRunner.query(
      `CREATE TABLE "referrals" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "referrer_id" uuid NOT NULL, "referred_id" uuid NOT NULL, "status" "public"."referrals_status_enum" NOT NULL DEFAULT 'pending', "reward_amount" numeric(20,7) NOT NULL DEFAULT '0', "reward_tx_hash" character varying(64), "converted_at" TIMESTAMP, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_507a2818bf5524662b068c2e81c" UNIQUE ("referred_id"), CONSTRAINT "PK_ea9980e34f738b6252817326c08" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_18af9fcaffac6d6d3b28130e14" ON "referrals" ("referrer_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_507a2818bf5524662b068c2e81" ON "referrals" ("referred_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "documents" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "type" character varying(20) NOT NULL DEFAULT 'OTHER', "status" character varying(20) NOT NULL DEFAULT 'ACTIVE', "category" character varying(50) NOT NULL DEFAULT 'other', "file_key" character varying NOT NULL, "file_size" integer NOT NULL, "file_type" character varying NOT NULL, "property_id" character varying, "tenant_id" character varying, "owner_id" character varying NOT NULL, "description" character varying, "shared_with" text, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_ac51aa5181ee2036f5ca482857c" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "agreement_templates" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "base_content" text NOT NULL, "jurisdiction" character varying NOT NULL, "is_active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_e6eac0a6b52689f8a1c0655f861" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "template_clauses" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "title" character varying NOT NULL, "content" text NOT NULL, "display_order" integer NOT NULL DEFAULT '0', "is_mandatory" boolean NOT NULL DEFAULT false, "template_id" uuid, CONSTRAINT "PK_bc3369d1a00469c382aa23b1899" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."sublet_requests_status_enum" AS ENUM('pending', 'approved', 'denied', 'revoked')`,
    );
    await queryRunner.query(
      `CREATE TABLE "sublet_requests" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "agreement_id" uuid NOT NULL, "tenant_id" uuid NOT NULL, "landlord_id" uuid NOT NULL, "status" "public"."sublet_requests_status_enum" NOT NULL DEFAULT 'pending', "requested_start_date" date NOT NULL, "requested_end_date" date NOT NULL, "max_days_per_year" integer NOT NULL, "tenant_share" numeric(5,2) NOT NULL, "landlord_share" numeric(5,2) NOT NULL, "reason" text, "landlord_notes" text, "responded_at" TIMESTAMP, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_0d1858f1c61d9c0eebccd7413d2" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_3749334c5a89e7d1639726da32" ON "sublet_requests" ("status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ffcb6d325e154abffbf23dcd17" ON "sublet_requests" ("landlord_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_229377631885469d7017a980f3" ON "sublet_requests" ("tenant_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_bb2f2086b092453089285db08d" ON "sublet_requests" ("agreement_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "sublet_bookings" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "booking_id" uuid NOT NULL, "agreement_id" uuid NOT NULL, "tenant_id" uuid NOT NULL, "landlord_id" uuid NOT NULL, "guest_id" uuid NOT NULL, "total_amount" numeric(10,2) NOT NULL, "tenant_earnings" numeric(10,2) NOT NULL, "landlord_earnings" numeric(10,2) NOT NULL, "platform_fee" numeric(10,2) NOT NULL, "payout_processed" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_6ede2aaea5c65b983c9b05755cd" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_28024b6d4a6afedd57be90ece5" ON "sublet_bookings" ("guest_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_1a9a7a31b2d6533110e8645b75" ON "sublet_bookings" ("landlord_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_c7ae36ebc34b3672bfcc49ca68" ON "sublet_bookings" ("tenant_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_2ce98017556da4dfb167605bc7" ON "sublet_bookings" ("agreement_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_5d0372d96f476c55132c2b083d" ON "sublet_bookings" ("booking_id") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."oauth_accounts_provider_enum" AS ENUM('google', 'github')`,
    );
    await queryRunner.query(
      `CREATE TABLE "oauth_accounts" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "provider" "public"."oauth_accounts_provider_enum" NOT NULL, "provider_user_id" character varying NOT NULL, "email" character varying NOT NULL, "linked_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_710a81523f515b78f894e33bb10" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_ea7720e04e3ae1278575c3159c" ON "oauth_accounts" ("provider", "provider_user_id") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_43effea36b32036537a94ab76f" ON "oauth_accounts" ("user_id", "provider") `,
    );
    await queryRunner.query(
      `ALTER TABLE "rent_payments" DROP COLUMN "paid_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "rent_obligation_nfts" DROP COLUMN "metadata_uri"`,
    );
    await queryRunner.query(
      `ALTER TABLE "rent_payments" DROP CONSTRAINT "UQ_3fb58e4cf1cfc8c490c6a25914c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "rent_payments" DROP COLUMN "payment_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "rent_payments" DROP COLUMN "payment_date"`,
    );
    await queryRunner.query(
      `ALTER TABLE "rent_payments" DROP COLUMN "created_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "rent_payments" DROP COLUMN "updated_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "rent_payments" DROP COLUMN "payment_method"`,
    );
    await queryRunner.query(
      `ALTER TABLE "rent_payments" DROP COLUMN "reference_number"`,
    );
    await queryRunner.query(`ALTER TABLE "rent_payments" DROP COLUMN "notes"`);
    // Skipped: dropping "properties"."search_vector". It's not mapped on the Property
    // entity (managed instead via raw SQL in AddPropertySearchIndexes1783000000000,
    // populated by the properties_search_vector_trigger), so it's invisible to the
    // entity diff — dropping it here would break every property insert/update.
    await queryRunner.query(
      `ALTER TABLE "payments" DROP COLUMN "payment_method_id"`,
    );
    await queryRunner.query(`ALTER TABLE "payments" DROP COLUMN "fee_amount"`);
    await queryRunner.query(
      `ALTER TABLE "payments" DROP COLUMN "refunded_amount"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "login_count" integer NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "preferred_language" character varying(10) NOT NULL DEFAULT 'en'`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "timezone" character varying(50) NOT NULL DEFAULT 'UTC'`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "two_factor_enabled" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "email_notifications" boolean NOT NULL DEFAULT true`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "sms_notifications" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "marketing_opt_in" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "referral_code" character varying(10)`,
    );
    await queryRunner.query(`ALTER TABLE "users" ADD "referred_by_id" uuid`);
    await queryRunner.query(
      `ALTER TABLE "rent_payments" ADD "payment_id" uuid NOT NULL DEFAULT uuid_generate_v4()`,
    );
    await queryRunner.query(
      `ALTER TABLE "rent_payments" ADD CONSTRAINT "UQ_3fb58e4cf1cfc8c490c6a25914c" UNIQUE ("payment_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "rent_payments" ADD "payment_date" TIMESTAMP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "rent_payments" ADD "payment_method" character varying(50)`,
    );
    await queryRunner.query(
      `ALTER TABLE "rent_payments" ADD "reference_number" character varying(100)`,
    );
    await queryRunner.query(`ALTER TABLE "rent_payments" ADD "notes" text`);
    await queryRunner.query(
      `ALTER TABLE "rent_payments" ADD "created_at" TIMESTAMP NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "rent_payments" ADD "updated_at" TIMESTAMP NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "rent_obligation_nfts" ADD "token_id" character varying NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "rent_obligation_nfts" DROP CONSTRAINT "PK_cf6d54c7ee4929675c5f0c8548f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "rent_obligation_nfts" ADD CONSTRAINT "PK_f0ec1dbfdd028e437ec25695762" PRIMARY KEY ("id", "token_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "rent_obligation_nfts" ADD "original_owner" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "rent_obligation_nfts" ADD "is_active" boolean NOT NULL DEFAULT true`,
    );
    await queryRunner.query(
      `ALTER TABLE "rent_obligation_nfts" ADD "metadata" json`,
    );
    await queryRunner.query(
      `ALTER TABLE "rent_obligation_nfts" ADD "burn_tx_hash" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "rent_obligation_nfts" ADD "burned_at" TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "rent_payments" ADD "paid_at" TIMESTAMP NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" ADD "transaction_fee" numeric(18,2) NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" ADD "payment_method" character varying(50)`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" ADD "payment_method_relation_id" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" ADD "receipt_url" character varying(255)`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" ADD "refund_status" character varying(20) NOT NULL DEFAULT 'none'`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" ADD "refund_amount" numeric(18,2) NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" ADD "version" integer NOT NULL DEFAULT '1'`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."users_role_enum" RENAME TO "users_role_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."users_role_enum" AS ENUM('user', 'admin', 'agent', 'super_admin')`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "role" TYPE "public"."users_role_enum" USING "role"::"text"::"public"."users_role_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'user'`,
    );
    await queryRunner.query(`DROP TYPE "public"."users_role_enum_old"`);
    await queryRunner.query(
      `ALTER TABLE "users" DROP CONSTRAINT "UQ_users_wallet_address"`,
    );
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "wallet_address"`);
    await queryRunner.query(
      `ALTER TABLE "users" ADD "wallet_address" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD CONSTRAINT "UQ_196ef3e52525d3cd9e203bdb1de" UNIQUE ("wallet_address")`,
    );
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "auth_method"`);
    await queryRunner.query(
      `ALTER TABLE "users" ADD "auth_method" "public"."users_auth_method_enum" NOT NULL DEFAULT 'password'`,
    );
    await queryRunner.query(
      `ALTER TABLE "escrow_signatures" ALTER COLUMN "signed_at" SET DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "escrow_conditions" ALTER COLUMN "created_at" SET DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "escrow_conditions" ALTER COLUMN "updated_at" SET DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "stellar_escrows" ALTER COLUMN "is_multi_sig" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "stellar_escrows" ALTER COLUMN "required_signatures" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "stellar_escrows" ALTER COLUMN "is_time_locked" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "stellar_escrows" ALTER COLUMN "dispute_integrated" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."tenant_screening_provider_enum" RENAME TO "tenant_screening_provider_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."tenant_screening_requests_provider_enum" AS ENUM('TRANSUNION_SMARTMOVE', 'EXPERIAN_CONNECT')`,
    );
    await queryRunner.query(
      `ALTER TABLE "tenant_screening_requests" ALTER COLUMN "provider" TYPE "public"."tenant_screening_requests_provider_enum" USING "provider"::"text"::"public"."tenant_screening_requests_provider_enum"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."tenant_screening_consents_provider_enum" AS ENUM('TRANSUNION_SMARTMOVE', 'EXPERIAN_CONNECT')`,
    );
    await queryRunner.query(
      `ALTER TABLE "tenant_screening_consents" ALTER COLUMN "provider" TYPE "public"."tenant_screening_consents_provider_enum" USING "provider"::"text"::"public"."tenant_screening_consents_provider_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."tenant_screening_provider_enum_old"`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."tenant_screening_status_enum" RENAME TO "tenant_screening_status_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."tenant_screening_requests_status_enum" AS ENUM('PENDING_CONSENT', 'CONSENTED', 'SUBMITTED', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'EXPIRED', 'REVOKED')`,
    );
    await queryRunner.query(
      `ALTER TABLE "tenant_screening_requests" ALTER COLUMN "status" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "tenant_screening_requests" ALTER COLUMN "status" TYPE "public"."tenant_screening_requests_status_enum" USING "status"::"text"::"public"."tenant_screening_requests_status_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tenant_screening_requests" ALTER COLUMN "status" SET DEFAULT 'PENDING_CONSENT'`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."tenant_screening_status_enum_old"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tenant_screening_reports" DROP CONSTRAINT "UQ_tenant_screening_reports_screening_id"`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."tenant_screening_risk_level_enum" RENAME TO "tenant_screening_risk_level_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."tenant_screening_reports_risk_level_enum" AS ENUM('LOW', 'MEDIUM', 'HIGH', 'REVIEW')`,
    );
    await queryRunner.query(
      `ALTER TABLE "tenant_screening_reports" ALTER COLUMN "risk_level" TYPE "public"."tenant_screening_reports_risk_level_enum" USING "risk_level"::"text"::"public"."tenant_screening_reports_risk_level_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."tenant_screening_risk_level_enum_old"`,
    );
    await queryRunner.query(
      `ALTER TABLE "rent_payments" DROP CONSTRAINT "PK_deca3deaaf83de65c31d5efe8a3"`,
    );
    await queryRunner.query(`ALTER TABLE "rent_payments" DROP COLUMN "id"`);
    await queryRunner.query(
      `ALTER TABLE "rent_payments" ADD "id" SERIAL NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "rent_payments" ADD CONSTRAINT "PK_deca3deaaf83de65c31d5efe8a3" PRIMARY KEY ("id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "rent_payments" ALTER COLUMN "agreement_id" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "rent_payments" ALTER COLUMN "amount" TYPE numeric(12,2)`,
    );
    await queryRunner.query(`ALTER TABLE "rent_payments" DROP COLUMN "status"`);
    await queryRunner.query(
      `ALTER TABLE "rent_payments" ADD "status" character varying(20) NOT NULL DEFAULT 'PENDING'`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_ad1289fcba7affeae8811e9d46"`,
    );
    await queryRunner.query(
      `ALTER TABLE "rent_obligation_nfts" DROP CONSTRAINT "UQ_ad1289fcba7affeae8811e9d46d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "rent_obligation_nfts" DROP COLUMN "agreement_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "rent_obligation_nfts" ADD "agreement_id" uuid NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "rent_obligation_nfts" ADD CONSTRAINT "UQ_ad1289fcba7affeae8811e9d46d" UNIQUE ("agreement_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "rent_obligation_nfts" ALTER COLUMN "original_landlord" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "rent_obligation_nfts" ALTER COLUMN "mint_tx_hash" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "rent_obligation_nfts" ALTER COLUMN "minted_at" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "rent_payments" DROP CONSTRAINT "PK_deca3deaaf83de65c31d5efe8a3"`,
    );
    await queryRunner.query(`ALTER TABLE "rent_payments" DROP COLUMN "id"`);
    await queryRunner.query(
      `ALTER TABLE "rent_payments" ADD "id" uuid NOT NULL DEFAULT uuid_generate_v4()`,
    );
    await queryRunner.query(
      `ALTER TABLE "rent_payments" ADD CONSTRAINT "PK_deca3deaaf83de65c31d5efe8a3" PRIMARY KEY ("id")`,
    );
    await queryRunner.query(`ALTER TABLE "rent_payments" DROP COLUMN "status"`);
    await queryRunner.query(
      `ALTER TABLE "rent_payments" ADD "status" character varying NOT NULL DEFAULT 'pending'`,
    );
    await queryRunner.query(
      `ALTER TABLE "properties" DROP COLUMN "virtual_tour_url"`,
    );
    await queryRunner.query(
      `ALTER TABLE "properties" ADD "virtual_tour_url" character varying(500)`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."property_rental_mode_enum" RENAME TO "property_rental_mode_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."properties_rental_mode_enum" AS ENUM('long_term', 'short_term', 'hybrid', 'flexible')`,
    );
    await queryRunner.query(
      `ALTER TABLE "properties" ALTER COLUMN "rental_mode" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "properties" ALTER COLUMN "rental_mode" TYPE "public"."properties_rental_mode_enum" USING "rental_mode"::"text"::"public"."properties_rental_mode_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "properties" ALTER COLUMN "rental_mode" SET DEFAULT 'long_term'`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."properties_ai_optimal_mode_enum" AS ENUM('long_term', 'short_term', 'hybrid', 'flexible')`,
    );
    await queryRunner.query(
      `ALTER TABLE "properties" ALTER COLUMN "ai_optimal_mode" TYPE "public"."properties_ai_optimal_mode_enum" USING "ai_optimal_mode"::"text"::"public"."properties_ai_optimal_mode_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."property_rental_mode_enum_old"`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."cancellation_policy_enum" RENAME TO "cancellation_policy_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."properties_cancellation_policy_enum" AS ENUM('flexible', 'moderate', 'strict')`,
    );
    await queryRunner.query(
      `ALTER TABLE "properties" ALTER COLUMN "cancellation_policy" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "properties" ALTER COLUMN "cancellation_policy" TYPE "public"."properties_cancellation_policy_enum" USING "cancellation_policy"::"text"::"public"."properties_cancellation_policy_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "properties" ALTER COLUMN "cancellation_policy" SET DEFAULT 'moderate'`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."cancellation_policy_enum_old"`,
    );
    await queryRunner.query(
      `ALTER TABLE "property_tour_engagements" DROP COLUMN "created_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "property_tour_engagements" ADD "created_at" TIMESTAMP NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "property_listing_drafts" DROP COLUMN "completed_steps"`,
    );
    await queryRunner.query(
      `ALTER TABLE "property_listing_drafts" ADD "completed_steps" jsonb NOT NULL DEFAULT '[]'`,
    );
    await queryRunner.query(
      `ALTER TABLE "property_availability" DROP COLUMN "created_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "property_availability" ADD "created_at" TIMESTAMP NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "property_availability" DROP COLUMN "updated_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "property_availability" ADD "updated_at" TIMESTAMP NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "property_inquiries" DROP COLUMN "status"`,
    );
    await queryRunner.query(
      `ALTER TABLE "property_inquiries" ADD "status" character varying(20) NOT NULL DEFAULT 'pending'`,
    );
    await queryRunner.query(
      `ALTER TABLE "arbiters" DROP CONSTRAINT "UQ_c3a4db9ab3e3cf2685439193f52"`,
    );
    await queryRunner.query(
      `ALTER TABLE "arbiters" DROP COLUMN "stellar_address"`,
    );
    await queryRunner.query(
      `ALTER TABLE "arbiters" ADD "stellar_address" character varying(100) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "arbiters" ADD CONSTRAINT "UQ_c3a4db9ab3e3cf2685439193f52" UNIQUE ("stellar_address")`,
    );
    await queryRunner.query(`ALTER TABLE "arbiters" DROP COLUMN "user_id"`);
    await queryRunner.query(`ALTER TABLE "arbiters" ADD "user_id" uuid`);
    await queryRunner.query(
      `ALTER TABLE "arbiters" DROP COLUMN "transaction_hash"`,
    );
    await queryRunner.query(
      `ALTER TABLE "arbiters" ADD "transaction_hash" character varying(100)`,
    );
    await queryRunner.query(
      `ALTER TABLE "arbiters" ALTER COLUMN "reputation_score" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "arbiters" ALTER COLUMN "successful_resolutions" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "dispute_votes" DROP COLUMN "transaction_hash"`,
    );
    await queryRunner.query(
      `ALTER TABLE "dispute_votes" ADD "transaction_hash" character varying(100)`,
    );
    await queryRunner.query(
      `ALTER TABLE "dispute_votes" ALTER COLUMN "vote_weight" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "dispute_events" ALTER COLUMN "created_at" SET DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "api_keys" DROP COLUMN "last_used_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "api_keys" ADD "last_used_at" character varying(30)`,
    );
    await queryRunner.query(`ALTER TABLE "api_keys" DROP COLUMN "expires_at"`);
    await queryRunner.query(
      `ALTER TABLE "api_keys" ADD "expires_at" character varying(30)`,
    );
    await queryRunner.query(`ALTER TABLE "api_keys" DROP COLUMN "rotated_at"`);
    await queryRunner.query(
      `ALTER TABLE "api_keys" ADD "rotated_at" character varying(30)`,
    );
    await queryRunner.query(
      `ALTER TABLE "api_key_rotation_history" DROP COLUMN "rotated_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "api_key_rotation_history" ADD "rotated_at" TIMESTAMP NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_ai_preferences" DROP CONSTRAINT "UQ_3bd6130ba4cd2fe067ff7dddc0e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_notification_preferences" ALTER COLUMN "preferences" SET DEFAULT '{"notifications":{"email":{"newPropertyMatches":true,"paymentReminders":true,"maintenanceUpdates":true},"push":{"newMessages":true,"criticalAlerts":true},"inAppSummary":true},"appearanceTheme":"system","language":"en","currency":"NGN"}'::jsonb`,
    );
    await queryRunner.query(
      `ALTER TABLE "indexed_transactions" ADD CONSTRAINT "UQ_f18bb1cb1bd8ecdd75590554f07" UNIQUE ("transaction_hash")`,
    );
    await queryRunner.query(
      `ALTER TABLE "indexed_transactions" ALTER COLUMN "ledger" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "indexed_transactions" ALTER COLUMN "ledger_close_time" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "indexed_transactions" ALTER COLUMN "successful" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "indexed_transactions" DROP COLUMN "transaction_type"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."indexed_transactions_transaction_type_enum" AS ENUM('payment', 'path_payment', 'create_account', 'change_trust', 'manage_offer', 'account_merge', 'set_options', 'allow_trust', 'claimable_balance', 'other')`,
    );
    await queryRunner.query(
      `ALTER TABLE "indexed_transactions" ADD "transaction_type" "public"."indexed_transactions_transaction_type_enum" NOT NULL DEFAULT 'other'`,
    );
    await queryRunner.query(
      `ALTER TABLE "indexed_transactions" ALTER COLUMN "source_account" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "indexed_transactions" ALTER COLUMN "amount" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "indexed_transactions" ALTER COLUMN "asset_code" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "indexed_transactions" ALTER COLUMN "fee" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "indexed_transactions" DROP COLUMN "memo_type"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."indexed_transactions_memo_type_enum" AS ENUM('text', 'id', 'hash')`,
    );
    await queryRunner.query(
      `ALTER TABLE "indexed_transactions" ADD "memo_type" "public"."indexed_transactions_memo_type_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "indexed_transactions" ALTER COLUMN "operations" SET DEFAULT '[]'::jsonb`,
    );
    await queryRunner.query(
      `ALTER TABLE "indexed_transactions" ALTER COLUMN "metadata" SET DEFAULT '{}'::jsonb`,
    );
    await queryRunner.query(
      `ALTER TABLE "indexed_transactions" DROP COLUMN "indexed_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "indexed_transactions" ADD "indexed_at" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_ba10055f9ef9690e77cf6445cb" ON "users" ("referral_code") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_1ca31d05a3de4b91166a20b13e" ON "tenant_screening_requests" ("requested_by_user_id", "status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_273bc70562ee6840ecc946e76f" ON "tenant_screening_requests" ("tenant_id", "status") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_825cafea108823f18a765dfebc" ON "tenant_screening_reports" ("screening_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_9d156f90b6fdd06a61950a69a9" ON "tenant_screening_consents" ("screening_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_7ee0476ca86ce7d0142b96d4d8" ON "rent_obligation_nfts" ("original_owner") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_ad1289fcba7affeae8811e9d46" ON "rent_obligation_nfts" ("agreement_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ae13ca2af06e42f8d839cc2a19" ON "property_tour_engagements" ("property_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_446ec0d434ebd185b610b55ee3" ON "property_listing_drafts" ("landlord_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_095b2742e3a0b320510a9e3bdd" ON "property_listing_drafts" ("landlord_id", "expires_at") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_77c4273139b3d4987b6353503d" ON "property_availability" ("property_id", "date") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_6d4fbd29585a670a4b4316cc61" ON "property_inquiries" ("from_user_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_18336c19f9ceb8f9e7d68e2b69" ON "property_inquiries" ("to_user_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_9a2e48010772d7f592b2484f6d" ON "property_inquiries" ("property_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_fraud_alerts_subject" ON "fraud_alerts" ("subject_type", "subject_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_fraud_alerts_status_created" ON "fraud_alerts" ("status", "created_at") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_arbiters_stellar_address" ON "arbiters" ("stellar_address") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_dispute_votes_arbiter_id" ON "dispute_votes" ("arbiter_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_dispute_votes_dispute_id" ON "dispute_votes" ("dispute_id") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_dispute_votes_dispute_arbiter" ON "dispute_votes" ("dispute_id", "arbiter_id") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_816517663cdb51e17cd2094755" ON "user_notification_preferences" ("user_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "property_availability" ADD CONSTRAINT "UQ_77c4273139b3d4987b6353503d5" UNIQUE ("property_id", "date")`,
    );
    await queryRunner.query(
      `ALTER TABLE "rent_payments" ADD CONSTRAINT "FK_5b62ad4907dfe7bdbf50691a31e" FOREIGN KEY ("agreement_id") REFERENCES "rent_agreements"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    // Skipped: FK_9ffa6f6a9154da489808c336d76 (nft_transfers.token_id -> rent_obligation_nfts.token_id).
    // rent_obligation_nfts has a composite PK (id, token_id), so token_id alone has no unique
    // constraint for Postgres to hang a FK off. NFTTransfer.nft's referencedColumnName: 'tokenId'
    // doesn't match the actual table constraints — a pre-existing entity/schema mismatch, not
    // something this migration should paper over with a fake unique index.
    await queryRunner.query(
      `ALTER TABLE "rent_obligation_nfts" ADD CONSTRAINT "FK_ad1289fcba7affeae8811e9d46d" FOREIGN KEY ("agreement_id") REFERENCES "rent_agreements"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "referrals" ADD CONSTRAINT "FK_18af9fcaffac6d6d3b28130e149" FOREIGN KEY ("referrer_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "referrals" ADD CONSTRAINT "FK_507a2818bf5524662b068c2e81c" FOREIGN KEY ("referred_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "property_availability" ADD CONSTRAINT "FK_99aeda8d8fbf9d6efb929db36d2" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" ADD CONSTRAINT "FK_95c83c2823ff6cbc9b0f643d8c5" FOREIGN KEY ("payment_method_relation_id") REFERENCES "payment_methods"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "arbiters" ADD CONSTRAINT "FK_62efb74152236c71c784d6214d8" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "template_clauses" ADD CONSTRAINT "FK_9e931c371795a664e29301178b8" FOREIGN KEY ("template_id") REFERENCES "agreement_templates"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "webhook_deliveries" ADD CONSTRAINT "FK_0b882c26a9b91c26e6e86b4867c" FOREIGN KEY ("endpoint_id") REFERENCES "webhook_endpoints"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_notification_preferences" ADD CONSTRAINT "FK_816517663cdb51e17cd20947556" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user_notification_preferences" DROP CONSTRAINT "FK_816517663cdb51e17cd20947556"`,
    );
    await queryRunner.query(
      `ALTER TABLE "webhook_deliveries" DROP CONSTRAINT "FK_0b882c26a9b91c26e6e86b4867c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "template_clauses" DROP CONSTRAINT "FK_9e931c371795a664e29301178b8"`,
    );
    await queryRunner.query(
      `ALTER TABLE "arbiters" DROP CONSTRAINT "FK_62efb74152236c71c784d6214d8"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" DROP CONSTRAINT "FK_95c83c2823ff6cbc9b0f643d8c5"`,
    );
    await queryRunner.query(
      `ALTER TABLE "property_availability" DROP CONSTRAINT "FK_99aeda8d8fbf9d6efb929db36d2"`,
    );
    await queryRunner.query(
      `ALTER TABLE "referrals" DROP CONSTRAINT "FK_507a2818bf5524662b068c2e81c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "referrals" DROP CONSTRAINT "FK_18af9fcaffac6d6d3b28130e149"`,
    );
    await queryRunner.query(
      `ALTER TABLE "rent_obligation_nfts" DROP CONSTRAINT "FK_ad1289fcba7affeae8811e9d46d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "rent_payments" DROP CONSTRAINT "FK_5b62ad4907dfe7bdbf50691a31e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "property_availability" DROP CONSTRAINT "UQ_77c4273139b3d4987b6353503d5"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_816517663cdb51e17cd2094755"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_dispute_votes_dispute_arbiter"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_dispute_votes_dispute_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_dispute_votes_arbiter_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_arbiters_stellar_address"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."idx_fraud_alerts_status_created"`,
    );
    await queryRunner.query(`DROP INDEX "public"."idx_fraud_alerts_subject"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_9a2e48010772d7f592b2484f6d"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_18336c19f9ceb8f9e7d68e2b69"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_6d4fbd29585a670a4b4316cc61"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_77c4273139b3d4987b6353503d"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_095b2742e3a0b320510a9e3bdd"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_446ec0d434ebd185b610b55ee3"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_ae13ca2af06e42f8d839cc2a19"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_ad1289fcba7affeae8811e9d46"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_7ee0476ca86ce7d0142b96d4d8"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_9d156f90b6fdd06a61950a69a9"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_825cafea108823f18a765dfebc"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_273bc70562ee6840ecc946e76f"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_1ca31d05a3de4b91166a20b13e"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_ba10055f9ef9690e77cf6445cb"`,
    );
    await queryRunner.query(
      `ALTER TABLE "indexed_transactions" DROP COLUMN "indexed_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "indexed_transactions" ADD "indexed_at" TIMESTAMP NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "indexed_transactions" ALTER COLUMN "metadata" SET DEFAULT '{}'`,
    );
    await queryRunner.query(
      `ALTER TABLE "indexed_transactions" ALTER COLUMN "operations" SET DEFAULT '[]'`,
    );
    await queryRunner.query(
      `ALTER TABLE "indexed_transactions" DROP COLUMN "memo_type"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."indexed_transactions_memo_type_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "indexed_transactions" ADD "memo_type" character varying(10)`,
    );
    await queryRunner.query(
      `ALTER TABLE "indexed_transactions" ALTER COLUMN "fee" SET DEFAULT '0'`,
    );
    await queryRunner.query(
      `ALTER TABLE "indexed_transactions" ALTER COLUMN "asset_code" SET DEFAULT 'XLM'`,
    );
    await queryRunner.query(
      `ALTER TABLE "indexed_transactions" ALTER COLUMN "amount" SET DEFAULT '0'`,
    );
    await queryRunner.query(
      `ALTER TABLE "indexed_transactions" ALTER COLUMN "source_account" SET DEFAULT ''`,
    );
    await queryRunner.query(
      `ALTER TABLE "indexed_transactions" DROP COLUMN "transaction_type"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."indexed_transactions_transaction_type_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "indexed_transactions" ADD "transaction_type" character varying(50) NOT NULL DEFAULT 'other'`,
    );
    await queryRunner.query(
      `ALTER TABLE "indexed_transactions" ALTER COLUMN "successful" SET DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "indexed_transactions" ALTER COLUMN "ledger_close_time" SET DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "indexed_transactions" ALTER COLUMN "ledger" SET DEFAULT '0'`,
    );
    await queryRunner.query(
      `ALTER TABLE "indexed_transactions" DROP CONSTRAINT "UQ_f18bb1cb1bd8ecdd75590554f07"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_notification_preferences" ALTER COLUMN "preferences" SET DEFAULT '{"currency": "NGN", "language": "en", "notifications": {"push": {"newMessages": true, "criticalAlerts": true}, "email": {"paymentReminders": true, "maintenanceUpdates": true, "newPropertyMatches": true}, "inAppSummary": true}, "appearanceTheme": "system"}'`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_ai_preferences" ADD CONSTRAINT "UQ_3bd6130ba4cd2fe067ff7dddc0e" UNIQUE ("user_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "api_key_rotation_history" DROP COLUMN "rotated_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "api_key_rotation_history" ADD "rotated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(`ALTER TABLE "api_keys" DROP COLUMN "rotated_at"`);
    await queryRunner.query(
      `ALTER TABLE "api_keys" ADD "rotated_at" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(`ALTER TABLE "api_keys" DROP COLUMN "expires_at"`);
    await queryRunner.query(
      `ALTER TABLE "api_keys" ADD "expires_at" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `ALTER TABLE "api_keys" DROP COLUMN "last_used_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "api_keys" ADD "last_used_at" TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "dispute_events" ALTER COLUMN "created_at" SET DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "dispute_votes" ALTER COLUMN "vote_weight" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "dispute_votes" DROP COLUMN "transaction_hash"`,
    );
    await queryRunner.query(
      `ALTER TABLE "dispute_votes" ADD "transaction_hash" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "arbiters" ALTER COLUMN "successful_resolutions" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "arbiters" ALTER COLUMN "reputation_score" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "arbiters" DROP COLUMN "transaction_hash"`,
    );
    await queryRunner.query(
      `ALTER TABLE "arbiters" ADD "transaction_hash" character varying`,
    );
    await queryRunner.query(`ALTER TABLE "arbiters" DROP COLUMN "user_id"`);
    await queryRunner.query(`ALTER TABLE "arbiters" ADD "user_id" integer`);
    await queryRunner.query(
      `ALTER TABLE "arbiters" DROP CONSTRAINT "UQ_c3a4db9ab3e3cf2685439193f52"`,
    );
    await queryRunner.query(
      `ALTER TABLE "arbiters" DROP COLUMN "stellar_address"`,
    );
    await queryRunner.query(
      `ALTER TABLE "arbiters" ADD "stellar_address" character varying NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "arbiters" ADD CONSTRAINT "UQ_c3a4db9ab3e3cf2685439193f52" UNIQUE ("stellar_address")`,
    );
    await queryRunner.query(
      `ALTER TABLE "property_inquiries" DROP COLUMN "status"`,
    );
    await queryRunner.query(
      `ALTER TABLE "property_inquiries" ADD "status" character varying NOT NULL DEFAULT 'pending'`,
    );
    await queryRunner.query(
      `ALTER TABLE "property_availability" DROP COLUMN "updated_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "property_availability" ADD "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "property_availability" DROP COLUMN "created_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "property_availability" ADD "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "property_listing_drafts" DROP COLUMN "completed_steps"`,
    );
    await queryRunner.query(
      `ALTER TABLE "property_listing_drafts" ADD "completed_steps" text NOT NULL DEFAULT ''`,
    );
    await queryRunner.query(
      `ALTER TABLE "property_tour_engagements" DROP COLUMN "created_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "property_tour_engagements" ADD "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."property_rental_mode_enum_old" AS ENUM('long_term', 'short_term', 'hybrid', 'flexible')`,
    );
    await queryRunner.query(
      `ALTER TABLE "properties" ALTER COLUMN "ai_optimal_mode" TYPE "public"."property_rental_mode_enum_old" USING "ai_optimal_mode"::"text"::"public"."property_rental_mode_enum_old"`,
    );
    await queryRunner.query(
      `ALTER TABLE "properties" ALTER COLUMN "rental_mode" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "properties" ALTER COLUMN "rental_mode" TYPE "public"."property_rental_mode_enum_old" USING "rental_mode"::"text"::"public"."property_rental_mode_enum_old"`,
    );
    await queryRunner.query(
      `ALTER TABLE "properties" ALTER COLUMN "rental_mode" SET DEFAULT 'long_term'`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."properties_ai_optimal_mode_enum"`,
    );
    await queryRunner.query(`DROP TYPE "public"."properties_rental_mode_enum"`);
    await queryRunner.query(
      `ALTER TYPE "public"."property_rental_mode_enum_old" RENAME TO "property_rental_mode_enum"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."cancellation_policy_enum_old" AS ENUM('flexible', 'moderate', 'strict')`,
    );
    await queryRunner.query(
      `ALTER TABLE "properties" ALTER COLUMN "cancellation_policy" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "properties" ALTER COLUMN "cancellation_policy" TYPE "public"."cancellation_policy_enum_old" USING "cancellation_policy"::"text"::"public"."cancellation_policy_enum_old"`,
    );
    await queryRunner.query(
      `ALTER TABLE "properties" ALTER COLUMN "cancellation_policy" SET DEFAULT 'moderate'`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."properties_cancellation_policy_enum"`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."cancellation_policy_enum_old" RENAME TO "cancellation_policy_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "properties" DROP COLUMN "virtual_tour_url"`,
    );
    await queryRunner.query(
      `ALTER TABLE "properties" ADD "virtual_tour_url" character varying`,
    );
    await queryRunner.query(`ALTER TABLE "rent_payments" DROP COLUMN "status"`);
    await queryRunner.query(
      `ALTER TABLE "rent_payments" ADD "status" character varying(20) NOT NULL DEFAULT 'PENDING'`,
    );
    await queryRunner.query(
      `ALTER TABLE "rent_payments" DROP CONSTRAINT "PK_deca3deaaf83de65c31d5efe8a3"`,
    );
    await queryRunner.query(`ALTER TABLE "rent_payments" DROP COLUMN "id"`);
    await queryRunner.query(
      `ALTER TABLE "rent_payments" ADD "id" SERIAL NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "rent_payments" ADD CONSTRAINT "PK_deca3deaaf83de65c31d5efe8a3" PRIMARY KEY ("id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "rent_obligation_nfts" ALTER COLUMN "minted_at" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "rent_obligation_nfts" ALTER COLUMN "mint_tx_hash" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "rent_obligation_nfts" ALTER COLUMN "original_landlord" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "rent_obligation_nfts" DROP CONSTRAINT "UQ_ad1289fcba7affeae8811e9d46d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "rent_obligation_nfts" DROP COLUMN "agreement_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "rent_obligation_nfts" ADD "agreement_id" character varying NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "rent_obligation_nfts" ADD CONSTRAINT "UQ_ad1289fcba7affeae8811e9d46d" UNIQUE ("agreement_id")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_ad1289fcba7affeae8811e9d46" ON "rent_obligation_nfts" ("agreement_id") `,
    );
    await queryRunner.query(`ALTER TABLE "rent_payments" DROP COLUMN "status"`);
    await queryRunner.query(
      `ALTER TABLE "rent_payments" ADD "status" character varying NOT NULL DEFAULT 'pending'`,
    );
    await queryRunner.query(
      `ALTER TABLE "rent_payments" ALTER COLUMN "amount" TYPE numeric(10,2)`,
    );
    await queryRunner.query(
      `ALTER TABLE "rent_payments" ALTER COLUMN "agreement_id" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "rent_payments" DROP CONSTRAINT "PK_deca3deaaf83de65c31d5efe8a3"`,
    );
    await queryRunner.query(`ALTER TABLE "rent_payments" DROP COLUMN "id"`);
    await queryRunner.query(
      `ALTER TABLE "rent_payments" ADD "id" uuid NOT NULL DEFAULT uuid_generate_v4()`,
    );
    await queryRunner.query(
      `ALTER TABLE "rent_payments" ADD CONSTRAINT "PK_deca3deaaf83de65c31d5efe8a3" PRIMARY KEY ("id")`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."tenant_screening_provider_enum_old" AS ENUM('TRANSUNION_SMARTMOVE', 'EXPERIAN_CONNECT')`,
    );
    await queryRunner.query(
      `ALTER TABLE "tenant_screening_consents" ALTER COLUMN "provider" TYPE "public"."tenant_screening_provider_enum_old" USING "provider"::"text"::"public"."tenant_screening_provider_enum_old"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tenant_screening_requests" ALTER COLUMN "provider" TYPE "public"."tenant_screening_provider_enum_old" USING "provider"::"text"::"public"."tenant_screening_provider_enum_old"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."tenant_screening_consents_provider_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."tenant_screening_requests_provider_enum"`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."tenant_screening_provider_enum_old" RENAME TO "tenant_screening_provider_enum"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."tenant_screening_risk_level_enum_old" AS ENUM('LOW', 'MEDIUM', 'HIGH', 'REVIEW')`,
    );
    await queryRunner.query(
      `ALTER TABLE "tenant_screening_reports" ALTER COLUMN "risk_level" TYPE "public"."tenant_screening_risk_level_enum_old" USING "risk_level"::"text"::"public"."tenant_screening_risk_level_enum_old"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."tenant_screening_reports_risk_level_enum"`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."tenant_screening_risk_level_enum_old" RENAME TO "tenant_screening_risk_level_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tenant_screening_reports" ADD CONSTRAINT "UQ_tenant_screening_reports_screening_id" UNIQUE ("screening_id")`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."tenant_screening_status_enum_old" AS ENUM('PENDING_CONSENT', 'CONSENTED', 'SUBMITTED', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'EXPIRED', 'REVOKED')`,
    );
    await queryRunner.query(
      `ALTER TABLE "tenant_screening_requests" ALTER COLUMN "status" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "tenant_screening_requests" ALTER COLUMN "status" TYPE "public"."tenant_screening_status_enum_old" USING "status"::"text"::"public"."tenant_screening_status_enum_old"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tenant_screening_requests" ALTER COLUMN "status" SET DEFAULT 'PENDING_CONSENT'`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."tenant_screening_requests_status_enum"`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."tenant_screening_status_enum_old" RENAME TO "tenant_screening_status_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "stellar_escrows" ALTER COLUMN "dispute_integrated" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "stellar_escrows" ALTER COLUMN "is_time_locked" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "stellar_escrows" ALTER COLUMN "required_signatures" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "stellar_escrows" ALTER COLUMN "is_multi_sig" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "escrow_conditions" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "escrow_conditions" ALTER COLUMN "created_at" SET DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "escrow_signatures" ALTER COLUMN "signed_at" SET DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "auth_method"`);
    await queryRunner.query(
      `ALTER TABLE "users" ADD "auth_method" character varying(20) NOT NULL DEFAULT 'password'`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP CONSTRAINT "UQ_196ef3e52525d3cd9e203bdb1de"`,
    );
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "wallet_address"`);
    await queryRunner.query(
      `ALTER TABLE "users" ADD "wallet_address" character varying(255)`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD CONSTRAINT "UQ_users_wallet_address" UNIQUE ("wallet_address")`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."users_role_enum_old" AS ENUM('user', 'admin', 'landlord', 'tenant', 'agent')`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "role" TYPE "public"."users_role_enum_old" USING "role"::"text"::"public"."users_role_enum_old"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'user'`,
    );
    await queryRunner.query(`DROP TYPE "public"."users_role_enum"`);
    await queryRunner.query(
      `ALTER TYPE "public"."users_role_enum_old" RENAME TO "users_role_enum"`,
    );
    await queryRunner.query(`ALTER TABLE "payments" DROP COLUMN "version"`);
    await queryRunner.query(
      `ALTER TABLE "payments" DROP COLUMN "refund_amount"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" DROP COLUMN "refund_status"`,
    );
    await queryRunner.query(`ALTER TABLE "payments" DROP COLUMN "receipt_url"`);
    await queryRunner.query(
      `ALTER TABLE "payments" DROP COLUMN "payment_method_relation_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" DROP COLUMN "payment_method"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" DROP COLUMN "transaction_fee"`,
    );
    await queryRunner.query(
      `ALTER TABLE "rent_payments" DROP COLUMN "paid_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "rent_obligation_nfts" DROP COLUMN "burned_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "rent_obligation_nfts" DROP COLUMN "burn_tx_hash"`,
    );
    await queryRunner.query(
      `ALTER TABLE "rent_obligation_nfts" DROP COLUMN "metadata"`,
    );
    await queryRunner.query(
      `ALTER TABLE "rent_obligation_nfts" DROP COLUMN "is_active"`,
    );
    await queryRunner.query(
      `ALTER TABLE "rent_obligation_nfts" DROP COLUMN "original_owner"`,
    );
    await queryRunner.query(
      `ALTER TABLE "rent_obligation_nfts" DROP CONSTRAINT "PK_f0ec1dbfdd028e437ec25695762"`,
    );
    await queryRunner.query(
      `ALTER TABLE "rent_obligation_nfts" ADD CONSTRAINT "PK_cf6d54c7ee4929675c5f0c8548f" PRIMARY KEY ("id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "rent_obligation_nfts" DROP COLUMN "token_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "rent_payments" DROP COLUMN "updated_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "rent_payments" DROP COLUMN "created_at"`,
    );
    await queryRunner.query(`ALTER TABLE "rent_payments" DROP COLUMN "notes"`);
    await queryRunner.query(
      `ALTER TABLE "rent_payments" DROP COLUMN "reference_number"`,
    );
    await queryRunner.query(
      `ALTER TABLE "rent_payments" DROP COLUMN "payment_method"`,
    );
    await queryRunner.query(
      `ALTER TABLE "rent_payments" DROP COLUMN "payment_date"`,
    );
    await queryRunner.query(
      `ALTER TABLE "rent_payments" DROP CONSTRAINT "UQ_3fb58e4cf1cfc8c490c6a25914c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "rent_payments" DROP COLUMN "payment_id"`,
    );
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "referred_by_id"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "referral_code"`);
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "marketing_opt_in"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "sms_notifications"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "email_notifications"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "two_factor_enabled"`,
    );
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "timezone"`);
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "preferred_language"`,
    );
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "login_count"`);
    await queryRunner.query(
      `ALTER TABLE "payments" ADD "refunded_amount" numeric(12,2) NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" ADD "fee_amount" numeric(12,2) NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" ADD "payment_method_id" integer`,
    );
    await queryRunner.query(`ALTER TABLE "rent_payments" ADD "notes" text`);
    await queryRunner.query(
      `ALTER TABLE "rent_payments" ADD "reference_number" character varying(100)`,
    );
    await queryRunner.query(
      `ALTER TABLE "rent_payments" ADD "payment_method" character varying(50)`,
    );
    await queryRunner.query(
      `ALTER TABLE "rent_payments" ADD "updated_at" TIMESTAMP NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "rent_payments" ADD "created_at" TIMESTAMP NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "rent_payments" ADD "payment_date" TIMESTAMP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "rent_payments" ADD "payment_id" uuid NOT NULL DEFAULT uuid_generate_v4()`,
    );
    await queryRunner.query(
      `ALTER TABLE "rent_payments" ADD CONSTRAINT "UQ_3fb58e4cf1cfc8c490c6a25914c" UNIQUE ("payment_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "rent_obligation_nfts" ADD "metadata_uri" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "rent_payments" ADD "paid_at" TIMESTAMP NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_43effea36b32036537a94ab76f"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_ea7720e04e3ae1278575c3159c"`,
    );
    await queryRunner.query(`DROP TABLE "oauth_accounts"`);
    await queryRunner.query(
      `DROP TYPE "public"."oauth_accounts_provider_enum"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_5d0372d96f476c55132c2b083d"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_2ce98017556da4dfb167605bc7"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_c7ae36ebc34b3672bfcc49ca68"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_1a9a7a31b2d6533110e8645b75"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_28024b6d4a6afedd57be90ece5"`,
    );
    await queryRunner.query(`DROP TABLE "sublet_bookings"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_bb2f2086b092453089285db08d"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_229377631885469d7017a980f3"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_ffcb6d325e154abffbf23dcd17"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_3749334c5a89e7d1639726da32"`,
    );
    await queryRunner.query(`DROP TABLE "sublet_requests"`);
    await queryRunner.query(`DROP TYPE "public"."sublet_requests_status_enum"`);
    await queryRunner.query(`DROP TABLE "template_clauses"`);
    await queryRunner.query(`DROP TABLE "agreement_templates"`);
    await queryRunner.query(`DROP TABLE "documents"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_507a2818bf5524662b068c2e81"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_18af9fcaffac6d6d3b28130e14"`,
    );
    await queryRunner.query(`DROP TABLE "referrals"`);
    await queryRunner.query(`DROP TYPE "public"."referrals_status_enum"`);
    await queryRunner.query(`DROP TABLE "nft_transfers"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_aff58b903e324c1f0565b44e0d"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_9ebd1f74b660d99c01e8cacbac"`,
    );
    await queryRunner.query(`DROP TABLE "rent_reminders"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_398a5ed65aebbcd1db2983cff2"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_ed26655583bfe5ee7d3601eb79"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_9c36cbe4eeecb4295ead49d2c6"`,
    );
    await queryRunner.query(`DROP TABLE "guest_reviews"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_d6aad25cc5ab5d9d97eb084c04"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_4b901110b1687ec23f62bb36be"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_ab26c09629e6ab4309b7853299"`,
    );
    await queryRunner.query(`DROP TABLE "host_reviews"`);
    await queryRunner.query(`DROP TABLE "property_history"`);
    await queryRunner.query(`DROP TABLE "property_registry"`);
    await queryRunner.query(
      `ALTER TABLE "property_availability" ADD CONSTRAINT "uq_property_availability" UNIQUE ("property_id", "date")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ANCHOR_TRANSACTION_ID" ON "anchor_transactions" ("anchor_transaction_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ANCHOR_WALLET_STATUS" ON "anchor_transactions" ("status", "wallet_address") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_indexed_transactions_agreement_id" ON "indexed_transactions" ("agreement_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_indexed_transactions_transaction_type" ON "indexed_transactions" ("transaction_type") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_indexed_transactions_destination_account" ON "indexed_transactions" ("destination_account") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_indexed_transactions_source_account" ON "indexed_transactions" ("source_account") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_indexed_transactions_ledger" ON "indexed_transactions" ("ledger") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_indexed_transactions_transaction_hash" ON "indexed_transactions" ("transaction_hash") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_webhook_endpoints_is_active" ON "webhook_endpoints" ("is_active") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_webhook_endpoints_user_id" ON "webhook_endpoints" ("user_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_webhook_deliveries_endpoint_status" ON "webhook_deliveries" ("endpoint_id", "successful") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_webhook_deliveries_next_retry" ON "webhook_deliveries" ("next_retry_at") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_webhook_deliveries_created_at" ON "webhook_deliveries" ("created_at") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_webhook_deliveries_successful" ON "webhook_deliveries" ("successful") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_webhook_deliveries_endpoint_id" ON "webhook_deliveries" ("endpoint_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_audit_logs_metadata_gin" ON "audit_logs" ("metadata") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_audit_logs_new_values_gin" ON "audit_logs" ("new_values") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_audit_logs_old_values_gin" ON "audit_logs" ("old_values") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_audit_logs_performed_by" ON "audit_logs" ("performed_by") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_audit_logs_entity" ON "audit_logs" ("entity_type", "entity_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_audit_logs_performed_at" ON "audit_logs" ("performed_at") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_audit_logs_performed_at" ON "audit_logs" ("performed_at") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_audit_logs_performed_by" ON "audit_logs" ("performed_by") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_audit_logs_entity_type_entity_id" ON "audit_logs" ("entity_type", "entity_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_api_key_rotation_history_user_id" ON "api_key_rotation_history" ("user_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_api_key_rotation_history_api_key_id" ON "api_key_rotation_history" ("api_key_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_api_keys_user_id" ON "api_keys" ("user_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_api_keys_status" ON "api_keys" ("status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_api_keys_expires_at" ON "api_keys" ("expires_at") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_arbiters_transaction_hash" ON "arbiters" ("transaction_hash") WHERE (transaction_hash IS NOT NULL)`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_arbiters_user_id" ON "arbiters" ("user_id") WHERE (user_id IS NOT NULL)`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_disputes_created_at" ON "disputes" ("created_at") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_disputes_dispute_type" ON "disputes" ("dispute_type") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_disputes_status" ON "disputes" ("status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_disputes_transaction_hash" ON "disputes" ("transaction_hash") WHERE (transaction_hash IS NOT NULL)`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_disputes_blockchain_agreement_id" ON "disputes" ("blockchain_agreement_id") WHERE (blockchain_agreement_id IS NOT NULL)`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_disputes_status_type" ON "disputes" ("dispute_type", "status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_disputes_resolved_by" ON "disputes" ("resolved_by") WHERE (resolved_by IS NOT NULL)`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_disputes_initiated_by" ON "disputes" ("initiated_by") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_disputes_agreement_id" ON "disputes" ("agreement_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_dispute_comments_dispute_id" ON "dispute_comments" ("dispute_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_dispute_evidence_dispute_id" ON "dispute_evidence" ("dispute_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_feedback_created_at" ON "feedback" ("created_at") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_feedback_user_id" ON "feedback" ("user_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_fraud_alerts_subject" ON "fraud_alerts" ("subject_type", "subject_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_fraud_alerts_status_created" ON "fraud_alerts" ("status", "created_at") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_property_inquiries_from_user_id" ON "property_inquiries" ("from_user_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_property_inquiries_to_user_id" ON "property_inquiries" ("to_user_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_property_inquiries_property_id" ON "property_inquiries" ("property_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_kyc_user_id" ON "kyc" ("user_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_kyc_status" ON "kyc" ("status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_kyc_status_created_at" ON "kyc" ("status", "created_at") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_maintenance_requests_priority" ON "maintenance_requests" ("priority") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_maintenance_requests_status" ON "maintenance_requests" ("status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_maintenance_requests_landlord_id" ON "maintenance_requests" ("landlord_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_maintenance_requests_tenant_id" ON "maintenance_requests" ("tenant_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_maintenance_requests_property_id" ON "maintenance_requests" ("property_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_participant_user_id" ON "participant" ("user_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_chat_room_group_id" ON "chat_room" ("chat_group_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_messages_timestamp" ON "message" ("timestamp") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_messages_receiver_id" ON "message" ("receiver_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_messages_sender_id" ON "message" ("sender_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_notifications_user_read" ON "notifications" ("is_read", "user_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_notifications_created_at" ON "notifications" ("created_at") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_notifications_type" ON "notifications" ("type") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_notifications_is_read" ON "notifications" ("is_read") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_notifications_user_id" ON "notifications" ("user_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_notifications_type_created_at" ON "notifications" ("type", "created_at") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_notifications_user_id_is_read" ON "notifications" ("is_read", "user_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_payment_schedules_status" ON "payment_schedules" ("status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_payments_user_status" ON "payments" ("user_id", "status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_payments_created_at" ON "payments" ("created_at") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_payments_reference_number" ON "payments" ("reference_number") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_payments_currency" ON "payments" ("currency") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_payments_status" ON "payments" ("status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_payments_payment_method_id" ON "payments" ("payment_method_id") WHERE (payment_method_id IS NOT NULL)`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_payments_status_created_at" ON "payments" ("created_at", "status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_payments_agreement_id" ON "payments" ("agreement_id") WHERE (agreement_id IS NOT NULL)`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_property_availability_property_date" ON "property_availability" ("property_id", "date") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_DRAFT_LANDLORD_EXPIRES" ON "property_listing_drafts" ("landlord_id", "expires_at") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_DRAFT_LANDLORD" ON "property_listing_drafts" ("landlord_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_property_tour_engagements_property_id" ON "property_tour_engagements" ("property_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_properties_price" ON "properties" ("price") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_properties_city_status" ON "properties" ("status", "city") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_properties_status_type" ON "properties" ("type", "status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_properties_lat_lng" ON "properties" ("latitude", "longitude") WHERE ((latitude IS NOT NULL) AND (longitude IS NOT NULL))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_rental_units_property_id" ON "rental_units" ("property_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_property_amenities_property_id" ON "property_amenities" ("property_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_property_amenities_name" ON "property_amenities" ("name") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_property_images_property_id" ON "property_images" ("property_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_rent_agreements_created_at" ON "rent_agreements" ("created_at") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_rent_agreements_admin_id" ON "rent_agreements" ("admin_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_rent_agreements_user_id" ON "rent_agreements" ("user_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_rent_agreements_on_chain_status" ON "rent_agreements" ("on_chain_status") WHERE (on_chain_status IS NOT NULL)`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_rent_agreements_start_end_date" ON "rent_agreements" ("start_date", "end_date") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_rent_agreements_agent_id" ON "rent_agreements" ("agent_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_rent_obligation_nfts_status" ON "rent_obligation_nfts" ("status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_rent_obligation_nfts_current_owner" ON "rent_obligation_nfts" ("current_owner") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_rent_obligation_nfts_agreement_id" ON "rent_obligation_nfts" ("agreement_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_22ae0f361b6564a995e18b00f8" ON "rent_obligation_nfts" ("original_landlord") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_rent_payments_status" ON "rent_payments" ("status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_rent_payments_agreement_id" ON "rent_payments" ("agreement_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_tenant_screening_consents_screening_id" ON "tenant_screening_consents" ("screening_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_tenant_screening_requests_requester_status" ON "tenant_screening_requests" ("requested_by_user_id", "status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_tenant_screening_requests_tenant_status" ON "tenant_screening_requests" ("tenant_id", "status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_stellar_escrows_agreement_id" ON "stellar_escrows" ("rent_agreement_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_stellar_escrows_linked_dispute" ON "stellar_escrows" ("linked_dispute_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_stellar_escrows_time_locked" ON "stellar_escrows" ("is_time_locked") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_stellar_escrows_multi_sig" ON "stellar_escrows" ("is_multi_sig") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_stellar_escrows_dispute_id" ON "stellar_escrows" ("dispute_id") WHERE (dispute_id IS NOT NULL)`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_stellar_escrows_blockchain_escrow_id" ON "stellar_escrows" ("blockchain_escrow_id") WHERE (blockchain_escrow_id IS NOT NULL)`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_stellar_escrows_rent_agreement_id" ON "stellar_escrows" ("rent_agreement_id") WHERE (rent_agreement_id IS NOT NULL)`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_stellar_tx_status" ON "stellar_transactions" ("status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_users_deleted_at" ON "users" ("deleted_at") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_users_kyc_status" ON "users" ("kyc_status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_users_role_is_active" ON "users" ("is_active", "role") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_users_wallet_address" ON "users" ("wallet_address") WHERE (wallet_address IS NOT NULL)`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_file_metadata_file_type" ON "file_metadata" ("file_type") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_file_metadata_owner_id" ON "file_metadata" ("owner_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "user_notification_preferences" ADD CONSTRAINT "FK_user_notification_preferences_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "webhook_deliveries" ADD CONSTRAINT "FK_webhook_deliveries_endpoint" FOREIGN KEY ("endpoint_id") REFERENCES "webhook_endpoints"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" ADD CONSTRAINT "FK_12fd861c33c885f01b9a7da7d93" FOREIGN KEY ("payment_method_id") REFERENCES "payment_methods"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "property_availability" ADD CONSTRAINT "fk_property_availability_property" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "rent_payments" ADD CONSTRAINT "FK_5b62ad4907dfe7bdbf50691a31e" FOREIGN KEY ("agreement_id") REFERENCES "rent_agreements"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "tenant_screening_consents" ADD CONSTRAINT "FK_tenant_screening_consents_screening" FOREIGN KEY ("screening_id") REFERENCES "tenant_screening_requests"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "tenant_screening_consents" ADD CONSTRAINT "FK_tenant_screening_consents_tenant" FOREIGN KEY ("tenant_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "tenant_screening_reports" ADD CONSTRAINT "FK_tenant_screening_reports_screening" FOREIGN KEY ("screening_id") REFERENCES "tenant_screening_requests"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "tenant_screening_requests" ADD CONSTRAINT "FK_tenant_screening_requests_tenant" FOREIGN KEY ("tenant_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "tenant_screening_requests" ADD CONSTRAINT "FK_tenant_screening_requests_requester" FOREIGN KEY ("requested_by_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }
}
