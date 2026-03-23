import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateKycEncryptionSchema1774292331248 implements MigrationInterface {
  name = 'UpdateKycEncryptionSchema1774292331248';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "stellar_accounts" DROP CONSTRAINT "stellar_accounts_user_id_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "stellar_transactions" DROP CONSTRAINT "stellar_transactions_from_account_id_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "stellar_transactions" DROP CONSTRAINT "stellar_transactions_to_account_id_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "stellar_escrows" DROP CONSTRAINT "stellar_escrows_escrow_account_id_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "stellar_escrows" DROP CONSTRAINT "stellar_escrows_source_account_id_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "stellar_escrows" DROP CONSTRAINT "stellar_escrows_destination_account_id_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "rent_agreements" DROP CONSTRAINT "FK_ccb630048ac85cbe7d01dd779da"`,
    );
    await queryRunner.query(
      `ALTER TABLE "property_images" DROP CONSTRAINT "FK_property_images_property"`,
    );
    await queryRunner.query(
      `ALTER TABLE "property_amenities" DROP CONSTRAINT "FK_property_amenities_property"`,
    );
    await queryRunner.query(
      `ALTER TABLE "properties" DROP CONSTRAINT "FK_properties_owner"`,
    );
    await queryRunner.query(
      `ALTER TABLE "rental_units" DROP CONSTRAINT "FK_rental_units_property"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment_methods" DROP CONSTRAINT "payment_methods_user_id_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" DROP CONSTRAINT "fk_payments_agreement"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" DROP CONSTRAINT "payments_payment_method_id_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" DROP CONSTRAINT "payments_user_id_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment_schedules" DROP CONSTRAINT "payment_schedules_payment_method_id_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment_schedules" DROP CONSTRAINT "payment_schedules_user_id_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" DROP CONSTRAINT "FK_9a8a82462cab47c73d25f49261f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "dispute_evidence" DROP CONSTRAINT "dispute_evidence_dispute_id_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "dispute_evidence" DROP CONSTRAINT "dispute_evidence_uploaded_by_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "dispute_comments" DROP CONSTRAINT "dispute_comments_dispute_id_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "dispute_comments" DROP CONSTRAINT "dispute_comments_user_id_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "disputes" DROP CONSTRAINT "disputes_agreement_id_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "disputes" DROP CONSTRAINT "disputes_initiated_by_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "disputes" DROP CONSTRAINT "disputes_resolved_by_fkey"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_reviews_reviewer_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_reviews_reviewee_id"`);
    await queryRunner.query(
      `DROP INDEX "public"."idx_rent_agreements_landlord_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."idx_rent_agreements_tenant_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."idx_rent_agreements_agent_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."idx_rent_agreements_property_id"`,
    );
    await queryRunner.query(`DROP INDEX "public"."idx_rent_agreements_status"`);
    await queryRunner.query(
      `DROP INDEX "public"."idx_rent_agreements_start_date"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."idx_rent_agreements_end_date"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_properties_owner_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_properties_status"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_properties_type"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_properties_city"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_properties_price"`);
    await queryRunner.query(
      `DROP INDEX "public"."idx_profile_metadata_data_hash"`,
    );
    await queryRunner.query(`DROP INDEX "public"."idx_payments_status"`);
    await queryRunner.query(`DROP INDEX "public"."idx_payments_agreement_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_feedback_created_at"`);
    await queryRunner.query(
      `DROP INDEX "public"."idx_dispute_evidence_dispute_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."idx_dispute_evidence_uploaded_by"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."idx_dispute_comments_dispute_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."idx_dispute_comments_user_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."idx_dispute_comments_is_internal"`,
    );
    await queryRunner.query(`DROP INDEX "public"."idx_disputes_agreement_id"`);
    await queryRunner.query(`DROP INDEX "public"."idx_disputes_initiated_by"`);
    await queryRunner.query(`DROP INDEX "public"."idx_disputes_status"`);
    await queryRunner.query(`DROP INDEX "public"."idx_disputes_dispute_type"`);
    await queryRunner.query(`DROP INDEX "public"."idx_disputes_created_at"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_api_keys_user_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_api_keys_key_hash"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_auth_metrics_timestamp"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_auth_metrics_auth_method"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_auth_metrics_success"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_auth_metrics_timestamp_method"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."kyc_status_enum" AS ENUM('PENDING', 'APPROVED', 'REJECTED', 'NEEDS_INFO')`,
    );
    await queryRunner.query(
      `CREATE TABLE "kyc" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "encrypted_kyc_data" text NOT NULL, "encryption_version" integer NOT NULL DEFAULT '1', "status" "public"."kyc_status_enum" NOT NULL DEFAULT 'PENDING', "provider_reference" text, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_84ab2e81ea9700d29dda719f3be" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_99797bb751811331b74d27865f" ON "kyc" ("user_id") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."stellar_payments_status_enum" AS ENUM('Pending', 'Completed', 'Failed')`,
    );
    await queryRunner.query(
      `CREATE TABLE "stellar_payments" ("payment_id" uuid NOT NULL DEFAULT uuid_generate_v4(), "agreement_id" character varying NOT NULL, "amount" numeric(20,7) NOT NULL, "tenant_address" character varying(56) NOT NULL, "landlord_address" character varying(56) NOT NULL, "platform_fee_collector" character varying(56) NOT NULL, "payment_date" TIMESTAMP NOT NULL, "token_address" character varying(56) NOT NULL, "status" "public"."stellar_payments_status_enum" NOT NULL DEFAULT 'Pending', "transaction_hash" character varying(64), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_1976b872b585772cd3a528fe8e8" PRIMARY KEY ("payment_id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_stellar_payments_status" ON "stellar_payments" ("status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_stellar_payments_agreement_id" ON "stellar_payments" ("agreement_id") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."threat_events_threat_type_enum" AS ENUM('brute_force', 'credential_stuffing', 'sql_injection', 'xss_attempt', 'path_traversal', 'rate_limit_exceeded', 'suspicious_ip', 'account_takeover', 'privilege_escalation', 'data_exfiltration', 'anomalous_behavior', 'bot_activity', 'replay_attack')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."threat_events_threat_level_enum" AS ENUM('low', 'medium', 'high', 'critical')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."threat_events_status_enum" AS ENUM('detected', 'investigating', 'confirmed', 'mitigated', 'false_positive')`,
    );
    await queryRunner.query(
      `CREATE TABLE "threat_events" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" character varying, "ip_address" character varying, "user_agent" text, "request_path" character varying, "request_method" character varying, "threat_type" "public"."threat_events_threat_type_enum" NOT NULL, "threat_level" "public"."threat_events_threat_level_enum" NOT NULL DEFAULT 'medium', "status" "public"."threat_events_status_enum" NOT NULL DEFAULT 'detected', "evidence" jsonb, "description" text, "blocked" boolean NOT NULL DEFAULT false, "auto_mitigated" boolean NOT NULL DEFAULT false, "mitigation_action" character varying, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_5b819be32ba421e29026e89517a" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_f4a8a1f81abfd74ce2189ed02d" ON "threat_events" ("threat_level", "created_at") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_256164095dad4997e974fdc2e7" ON "threat_events" ("threat_type", "status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_4cddf9b490d6d9999802df2ecb" ON "threat_events" ("user_id", "created_at") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_33216e2bcd962b0db49a361399" ON "threat_events" ("ip_address", "created_at") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."security_events_event_type_enum" AS ENUM('failed_login', 'account_locked', 'account_unlocked', 'password_changed', 'password_reset_requested', 'password_reset_completed', 'mfa_enabled', 'mfa_disabled', 'mfa_verified', 'mfa_failed', 'api_key_created', 'api_key_revoked', 'api_key_used', 'suspicious_activity', 'data_exported', 'account_deleted', 'role_changed', 'permission_changed')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."security_events_severity_enum" AS ENUM('low', 'medium', 'high', 'critical')`,
    );
    await queryRunner.query(
      `CREATE TABLE "security_events" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" character varying, "event_type" "public"."security_events_event_type_enum" NOT NULL, "severity" "public"."security_events_severity_enum" NOT NULL DEFAULT 'medium', "ip_address" character varying, "user_agent" text, "details" text, "success" boolean NOT NULL DEFAULT true, "error_message" text, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_6fc100d6700780737348df0d3ae" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_e3771c7c360d1df5d7462a4ebc" ON "security_events" ("ip_address", "created_at") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_7567faf52e0f0da34dbab2daf3" ON "security_events" ("severity", "created_at") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_7be8e81bef0d82c4c44a5ea920" ON "security_events" ("event_type", "created_at") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_87123d25025bb5487c4baf9b46" ON "security_events" ("user_id", "created_at") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."permissions_resource_enum" AS ENUM('users', 'properties', 'agreements', 'payments', 'disputes', 'audit', 'security', 'notifications', 'kyc', 'admin', 'reports', 'blockchain', 'storage')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."permissions_action_enum" AS ENUM('create', 'read', 'update', 'delete', 'execute', 'export', 'manage')`,
    );
    await queryRunner.query(
      `CREATE TABLE "permissions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(100) NOT NULL, "description" text, "resource" "public"."permissions_resource_enum" NOT NULL, "action" "public"."permissions_action_enum" NOT NULL, "is_active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_920331560282b8bd21bb02290df" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_7331684c0c5b063803a425001a" ON "permissions" ("resource", "action") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."roles_system_role_enum" AS ENUM('super_admin', 'admin', 'landlord', 'tenant', 'user', 'auditor', 'support')`,
    );
    await queryRunner.query(
      `CREATE TABLE "roles" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(100) NOT NULL, "description" text, "system_role" "public"."roles_system_role_enum", "is_active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_648e3f5447f725579d7d4ffdfb7" UNIQUE ("name"), CONSTRAINT "PK_c1433d71a4838793a49dcad46ab" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_648e3f5447f725579d7d4ffdfb" ON "roles" ("name") `,
    );
    await queryRunner.query(
      `CREATE TABLE "rent_payments" ("id" SERIAL NOT NULL, "payment_id" uuid NOT NULL DEFAULT uuid_generate_v4(), "agreement_id" uuid NOT NULL, "amount" numeric(12,2) NOT NULL, "payment_date" TIMESTAMP NOT NULL, "payment_method" character varying(50), "reference_number" character varying(100), "status" character varying(20) NOT NULL DEFAULT 'PENDING', "notes" text, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_3fb58e4cf1cfc8c490c6a25914c" UNIQUE ("payment_id"), CONSTRAINT "PK_deca3deaaf83de65c31d5efe8a3" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "message" ("id" SERIAL NOT NULL, "sender_id" integer NOT NULL, "receiver_id" integer NOT NULL, "content" text NOT NULL, "timestamp" TIMESTAMP NOT NULL DEFAULT now(), "chat_room_id" integer, CONSTRAINT "PK_ba01f0a3e0123651915008bc578" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "chat_room" ("id" SERIAL NOT NULL, "chat_group_id" character varying NOT NULL, CONSTRAINT "PK_8aa3a52cf74c96469f0ef9fbe3e" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "participant" ("id" SERIAL NOT NULL, "user_id" integer NOT NULL, "chat_room_id" integer, CONSTRAINT "PK_64da4237f502041781ca15d4c41" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."maintenance_requests_status_enum" AS ENUM('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "maintenance_requests" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "property_id" character varying NOT NULL, "tenant_id" character varying NOT NULL, "landlord_id" character varying NOT NULL, "category" character varying NOT NULL, "description" text NOT NULL, "priority" character varying NOT NULL DEFAULT 'MEDIUM', "status" "public"."maintenance_requests_status_enum" NOT NULL DEFAULT 'OPEN', "media_urls" text, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_c1521eb67c471accae8c531f9fe" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "arbiters" ("id" SERIAL NOT NULL, "stellar_address" character varying NOT NULL, "user_id" integer, "active" boolean NOT NULL DEFAULT true, "blockchain_added_at" bigint, "transaction_hash" character varying, "total_votes" integer NOT NULL DEFAULT '0', "total_disputes_resolved" integer NOT NULL DEFAULT '0', "metadata" jsonb, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_c3a4db9ab3e3cf2685439193f52" UNIQUE ("stellar_address"), CONSTRAINT "PK_9e4a6de1ff7b02688c18647c56a" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "dispute_votes" ("id" SERIAL NOT NULL, "dispute_id" integer NOT NULL, "arbiter_id" integer NOT NULL, "favor_landlord" boolean NOT NULL, "blockchain_voted_at" bigint, "transaction_hash" character varying, "comment" text, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_f6ace6c9738c3181b1baa9978b2" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."mfa_devices_type_enum" AS ENUM('totp', 'backup_code')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."mfa_devices_status_enum" AS ENUM('active', 'disabled')`,
    );
    await queryRunner.query(
      `CREATE TABLE "mfa_devices" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "type" "public"."mfa_devices_type_enum" NOT NULL DEFAULT 'totp', "status" "public"."mfa_devices_status_enum" NOT NULL DEFAULT 'active', "device_name" character varying, "secret_key" character varying, "backup_codes" text, "last_used_at" TIMESTAMP, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_0815c03589ecce2ae6ed87f18a1" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "audit_logs" ("id" SERIAL NOT NULL, "action" character varying(50) NOT NULL, "entity_type" character varying(50), "entity_id" character varying(36), "old_values" jsonb, "new_values" jsonb, "performed_by" uuid, "performed_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "ip_address" inet, "user_agent" text, "status" character varying(20), "error_message" text, "level" character varying(20) NOT NULL DEFAULT 'INFO', "metadata" jsonb, CONSTRAINT "PK_1bb179d048bbc581caa3b013439" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_19a17dd79fd3546ccc39d3da7e" ON "audit_logs" ("performed_at") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ae97aac6d6d471b9d88cea1c97" ON "audit_logs" ("performed_by") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_7421efc125d95e413657efa3c6" ON "audit_logs" ("entity_type", "entity_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "rent_obligation_nfts" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "agreement_id" character varying NOT NULL, "obligation_id" character varying NOT NULL, "current_owner" character varying NOT NULL, "original_landlord" character varying NOT NULL, "mint_tx_hash" character varying NOT NULL, "last_transfer_tx_hash" character varying, "minted_at" TIMESTAMP NOT NULL, "last_transferred_at" TIMESTAMP, "transfer_count" integer NOT NULL DEFAULT '0', "status" character varying NOT NULL DEFAULT 'active', "metadata_uri" character varying, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_ad1289fcba7affeae8811e9d46d" UNIQUE ("agreement_id"), CONSTRAINT "PK_cf6d54c7ee4929675c5f0c8548f" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_22ae0f361b6564a995e18b00f8" ON "rent_obligation_nfts" ("original_landlord") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_5f4f91d73b0c20a1b4ba1c60d0" ON "rent_obligation_nfts" ("current_owner") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_ad1289fcba7affeae8811e9d46" ON "rent_obligation_nfts" ("agreement_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "supported_currencies" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "code" character varying(10) NOT NULL, "name" character varying NOT NULL, "is_active" boolean NOT NULL DEFAULT true, "anchor_url" character varying NOT NULL, "stellar_asset_code" character varying, "stellar_asset_issuer" character varying, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_5b111a336124791be4ea65d7ce4" UNIQUE ("code"), CONSTRAINT "PK_4a0f5678891aabf8e8a795f9603" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."anchor_transactions_type_enum" AS ENUM('deposit', 'withdrawal')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."anchor_transactions_status_enum" AS ENUM('pending', 'processing', 'completed', 'failed', 'refunded')`,
    );
    await queryRunner.query(
      `CREATE TABLE "anchor_transactions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "anchor_transaction_id" character varying, "type" "public"."anchor_transactions_type_enum" NOT NULL, "status" "public"."anchor_transactions_status_enum" NOT NULL DEFAULT 'pending', "amount" numeric(20,7) NOT NULL, "currency" character varying(10) NOT NULL, "wallet_address" character varying NOT NULL, "payment_method" character varying, "destination" text, "stellar_transaction_id" character varying, "memo" text, "metadata" jsonb, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_42277c4fd78c33b85a580a692b9" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_290ac1d9ac5dced160a9b7a14e" ON "anchor_transactions" ("stellar_transaction_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_78cea1f8ea6b9682f55f66002f" ON "anchor_transactions" ("anchor_transaction_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_3ac985fe8543e61149ca6f1b80" ON "anchor_transactions" ("wallet_address", "status") `,
    );
    await queryRunner.query(
      `CREATE TABLE "role_permissions" ("role_id" uuid NOT NULL, "permission_id" uuid NOT NULL, CONSTRAINT "PK_25d24010f53bb80b78e412c9656" PRIMARY KEY ("role_id", "permission_id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_178199805b901ccd220ab7740e" ON "role_permissions" ("role_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_17022daf3f885f7d35423e9971" ON "role_permissions" ("permission_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "file_metadata" DROP COLUMN "fileType"`,
    );
    await queryRunner.query(
      `ALTER TABLE "file_metadata" DROP COLUMN "fileSize"`,
    );
    await queryRunner.query(
      `ALTER TABLE "file_metadata" DROP COLUMN "createdAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "file_metadata" DROP COLUMN "updatedAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "file_metadata" DROP COLUMN "ownerId"`,
    );
    await queryRunner.query(`ALTER TABLE "file_metadata" DROP COLUMN "s3Key"`);
    await queryRunner.query(
      `ALTER TABLE "file_metadata" DROP COLUMN "fileName"`,
    );
    await queryRunner.query(
      `ALTER TABLE "rent_agreements" DROP COLUMN "user_id"`,
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
      `ALTER TABLE "rent_payments" DROP COLUMN "payment_method"`,
    );
    await queryRunner.query(
      `ALTER TABLE "rent_payments" DROP COLUMN "reference_number"`,
    );
    await queryRunner.query(`ALTER TABLE "rent_payments" DROP COLUMN "notes"`);
    await queryRunner.query(
      `ALTER TABLE "rent_payments" DROP COLUMN "created_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "rent_payments" DROP COLUMN "updated_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "file_metadata" ADD "file_name" character varying NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "file_metadata" ADD "file_size" integer NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "file_metadata" ADD "file_type" character varying NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "file_metadata" ADD "s3_key" character varying NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "file_metadata" ADD "owner_id" character varying NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "file_metadata" ADD "created_at" TIMESTAMP NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "file_metadata" ADD "updated_at" TIMESTAMP NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."users_kyc_status_enum" AS ENUM('PENDING', 'APPROVED', 'REJECTED', 'NEEDS_INFO')`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "kyc_status" "public"."users_kyc_status_enum" NOT NULL DEFAULT 'PENDING'`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "wallet_address" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD CONSTRAINT "UQ_196ef3e52525d3cd9e203bdb1de" UNIQUE ("wallet_address")`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."users_auth_method_enum" AS ENUM('password', 'stellar')`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "auth_method" "public"."users_auth_method_enum" NOT NULL DEFAULT 'password'`,
    );
    await queryRunner.query(`ALTER TABLE "users" ADD "deleted_at" TIMESTAMP`);
    await queryRunner.query(
      `ALTER TABLE "stellar_escrows" ADD "blockchain_escrow_id" character varying(64)`,
    );
    await queryRunner.query(
      `ALTER TABLE "stellar_escrows" ADD "on_chain_status" character varying(20)`,
    );
    await queryRunner.query(
      `ALTER TABLE "stellar_escrows" ADD "escrow_contract_address" character varying(56)`,
    );
    await queryRunner.query(
      `ALTER TABLE "stellar_escrows" ADD "arbiter_address" character varying(56)`,
    );
    await queryRunner.query(
      `ALTER TABLE "stellar_escrows" ADD "dispute_id" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "stellar_escrows" ADD "dispute_reason" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "stellar_escrows" ADD "blockchain_synced_at" TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "stellar_escrows" ADD "approval_count" integer NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(
      `ALTER TABLE "stellar_escrows" ADD "escrow_metadata" jsonb`,
    );
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
      `ALTER TABLE "rent_agreements" ADD "blockchain_agreement_id" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "rent_agreements" ADD "on_chain_status" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "rent_agreements" ADD "transaction_hash" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "rent_agreements" ADD "blockchain_synced_at" TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "rent_agreements" ADD "payment_split_config" jsonb`,
    );
    await queryRunner.query(
      `ALTER TABLE "rent_payments" ADD "paid_at" TIMESTAMP NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "disputes" ADD "blockchain_agreement_id" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "disputes" ADD "details_hash" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "disputes" ADD "blockchain_raised_at" bigint`,
    );
    await queryRunner.query(
      `ALTER TABLE "disputes" ADD "blockchain_resolved_at" bigint`,
    );
    await queryRunner.query(
      `ALTER TABLE "disputes" ADD "votes_favor_landlord" integer NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(
      `ALTER TABLE "disputes" ADD "votes_favor_tenant" integer NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(
      `ALTER TABLE "disputes" ADD "blockchain_outcome" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "disputes" ADD "transaction_hash" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "disputes" ADD "blockchain_synced_at" TIMESTAMP`,
    );
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "password"`);
    await queryRunner.query(
      `ALTER TABLE "users" ADD "password" character varying`,
    );
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "first_name"`);
    await queryRunner.query(
      `ALTER TABLE "users" ADD "first_name" character varying`,
    );
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "last_name"`);
    await queryRunner.query(
      `ALTER TABLE "users" ADD "last_name" character varying`,
    );
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "phone_number"`);
    await queryRunner.query(
      `ALTER TABLE "users" ADD "phone_number" character varying`,
    );
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "avatar_url"`);
    await queryRunner.query(
      `ALTER TABLE "users" ADD "avatar_url" character varying`,
    );
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "role"`);
    await queryRunner.query(
      `CREATE TYPE "public"."users_role_enum" AS ENUM('user', 'admin', 'landlord', 'tenant', 'agent')`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "role" "public"."users_role_enum" NOT NULL DEFAULT 'user'`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "verification_token"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "verification_token" character varying`,
    );
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "reset_token"`);
    await queryRunner.query(
      `ALTER TABLE "users" ADD "reset_token" character varying`,
    );
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "refresh_token"`);
    await queryRunner.query(
      `ALTER TABLE "users" ADD "refresh_token" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "updated_at" SET DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "stellar_accounts" ALTER COLUMN "sequence_number" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "stellar_accounts" ALTER COLUMN "is_active" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "stellar_accounts" ALTER COLUMN "balance" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "stellar_accounts" ALTER COLUMN "created_at" SET DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "stellar_accounts" ALTER COLUMN "updated_at" SET DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "stellar_transactions" ALTER COLUMN "created_at" SET DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "stellar_transactions" ALTER COLUMN "updated_at" SET DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "stellar_escrows" ALTER COLUMN "created_at" SET DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "stellar_escrows" ALTER COLUMN "updated_at" SET DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent_transactions" ALTER COLUMN "created_at" SET DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent_transactions" ALTER COLUMN "updated_at" SET DEFAULT now()`,
    );
    await queryRunner.query(`ALTER TABLE "reviews" DROP COLUMN "reviewer_id"`);
    await queryRunner.query(
      `ALTER TABLE "reviews" ADD "reviewer_id" character varying NOT NULL`,
    );
    await queryRunner.query(`ALTER TABLE "reviews" DROP COLUMN "reviewee_id"`);
    await queryRunner.query(
      `ALTER TABLE "reviews" ADD "reviewee_id" character varying NOT NULL`,
    );
    await queryRunner.query(`ALTER TABLE "reviews" DROP COLUMN "context"`);
    await queryRunner.query(
      `CREATE TYPE "public"."reviews_context_enum" AS ENUM('LEASE', 'MAINTENANCE')`,
    );
    await queryRunner.query(
      `ALTER TABLE "reviews" ADD "context" "public"."reviews_context_enum" NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "reviews" ALTER COLUMN "anonymous" SET NOT NULL`,
    );
    await queryRunner.query(`ALTER TABLE "reviews" DROP COLUMN "property_id"`);
    await queryRunner.query(
      `ALTER TABLE "reviews" ADD "property_id" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "reviews" ALTER COLUMN "created_at" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "reviews" ALTER COLUMN "reported" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "rent_agreements" DROP CONSTRAINT "rent_agreements_agreement_number_key"`,
    );
    await queryRunner.query(
      `ALTER TABLE "rent_agreements" DROP COLUMN "agreement_number"`,
    );
    await queryRunner.query(
      `ALTER TABLE "rent_agreements" ADD "agreement_number" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "rent_agreements" ADD CONSTRAINT "UQ_42f84f7ce9e5bae254d7d73ed87" UNIQUE ("agreement_number")`,
    );
    await queryRunner.query(
      `ALTER TABLE "rent_agreements" DROP COLUMN "property_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "rent_agreements" ADD "property_id" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "rent_agreements" DROP COLUMN "landlord_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "rent_agreements" ADD "landlord_id" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "rent_agreements" DROP COLUMN "tenant_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "rent_agreements" ADD "tenant_id" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "rent_agreements" DROP COLUMN "agent_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "rent_agreements" ADD "agent_id" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "rent_agreements" ALTER COLUMN "agent_commission_rate" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "rent_agreements" ALTER COLUMN "agent_commission_rate" SET DEFAULT '10'`,
    );
    await queryRunner.query(
      `ALTER TABLE "rent_agreements" ALTER COLUMN "escrow_balance" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "rent_agreements" ALTER COLUMN "escrow_balance" SET DEFAULT '0'`,
    );
    await queryRunner.query(
      `ALTER TABLE "rent_agreements" ALTER COLUMN "total_paid" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "rent_agreements" ALTER COLUMN "total_paid" SET DEFAULT '0'`,
    );
    await queryRunner.query(
      `ALTER TABLE "rent_agreements" ALTER COLUMN "status" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "rent_agreements" ALTER COLUMN "created_at" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "rent_agreements" ALTER COLUMN "created_at" SET DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "rent_agreements" ALTER COLUMN "updated_at" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "rent_agreements" ALTER COLUMN "updated_at" SET DEFAULT now()`,
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
      `ALTER TABLE "rent_payments" ALTER COLUMN "amount" TYPE numeric(10,2)`,
    );
    await queryRunner.query(`ALTER TABLE "rent_payments" DROP COLUMN "status"`);
    await queryRunner.query(
      `ALTER TABLE "rent_payments" ADD "status" character varying NOT NULL DEFAULT 'pending'`,
    );
    await queryRunner.query(
      `ALTER TABLE "rent_payments" ALTER COLUMN "agreement_id" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "profile_metadata" DROP COLUMN "display_name"`,
    );
    await queryRunner.query(
      `ALTER TABLE "profile_metadata" ADD "display_name" character varying(255)`,
    );
    await queryRunner.query(
      `ALTER TABLE "profile_metadata" ALTER COLUMN "last_synced_at" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "profile_metadata" ALTER COLUMN "created_at" SET DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "profile_metadata" ALTER COLUMN "updated_at" SET DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment_methods" ALTER COLUMN "is_default" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment_methods" ALTER COLUMN "created_at" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment_methods" ALTER COLUMN "created_at" SET DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment_methods" ALTER COLUMN "updated_at" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment_methods" ALTER COLUMN "updated_at" SET DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" DROP COLUMN "agreement_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" ADD "agreement_id" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" ALTER COLUMN "fee_amount" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" ALTER COLUMN "fee_amount" SET DEFAULT '0'`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" ALTER COLUMN "net_amount" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" ALTER COLUMN "currency" SET NOT NULL`,
    );
    await queryRunner.query(`ALTER TABLE "payments" DROP COLUMN "status"`);
    await queryRunner.query(
      `ALTER TABLE "payments" ADD "status" character varying NOT NULL DEFAULT 'pending'`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" DROP COLUMN "reference_number"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" ADD "reference_number" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" ALTER COLUMN "refunded_amount" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" ALTER COLUMN "refunded_amount" SET DEFAULT '0'`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" ALTER COLUMN "created_at" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" ALTER COLUMN "created_at" SET DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" ALTER COLUMN "updated_at" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" ALTER COLUMN "updated_at" SET DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment_schedules" DROP COLUMN "agreement_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment_schedules" ADD "agreement_id" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment_schedules" ALTER COLUMN "currency" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment_schedules" ALTER COLUMN "retries" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment_schedules" ALTER COLUMN "max_retries" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment_schedules" ALTER COLUMN "created_at" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment_schedules" ALTER COLUMN "created_at" SET DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment_schedules" ALTER COLUMN "updated_at" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment_schedules" ALTER COLUMN "updated_at" SET DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" ALTER COLUMN "user_id" SET NOT NULL`,
    );
    await queryRunner.query(`ALTER TABLE "feedback" DROP COLUMN "created_at"`);
    await queryRunner.query(
      `ALTER TABLE "feedback" ADD "created_at" TIMESTAMP NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "dispute_evidence" ALTER COLUMN "created_at" SET DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "dispute_comments" ALTER COLUMN "is_internal" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "dispute_comments" ALTER COLUMN "created_at" SET DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "dispute_comments" ALTER COLUMN "updated_at" SET DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "disputes" DROP CONSTRAINT "disputes_dispute_id_key"`,
    );
    await queryRunner.query(`ALTER TABLE "disputes" DROP COLUMN "dispute_id"`);
    await queryRunner.query(
      `ALTER TABLE "disputes" ADD "dispute_id" character varying NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "disputes" ADD CONSTRAINT "UQ_8dce736a5b4967c790d992407b1" UNIQUE ("dispute_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "disputes" ALTER COLUMN "created_at" SET DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "disputes" ALTER COLUMN "updated_at" SET DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "api_keys" DROP COLUMN "last_used_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "api_keys" ADD "last_used_at" TIMESTAMP`,
    );
    await queryRunner.query(`ALTER TABLE "api_keys" DROP COLUMN "created_at"`);
    await queryRunner.query(
      `ALTER TABLE "api_keys" ADD "created_at" TIMESTAMP NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(`ALTER TABLE "api_keys" DROP COLUMN "updated_at"`);
    await queryRunner.query(
      `ALTER TABLE "api_keys" ADD "updated_at" TIMESTAMP NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "auth_metrics" ALTER COLUMN "auth_method" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "auth_metrics" ALTER COLUMN "auth_method" SET DEFAULT 'stellar'`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_97672ac88f789774dd47f7c8be" ON "users" ("email") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_a7b3e1afadd6b52f3b6864745e" ON "reviews" ("reviewee_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_92e950a2513a79bb3fab273c92" ON "reviews" ("reviewer_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_823d1011f2efdec975081a15b5" ON "rent_agreements" ("property_id", "status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_797b76e2d11a5bf755127d1aa6" ON "properties" ("owner_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_b13da725bb0d236ee1df1f94ce" ON "rental_units" ("property_id", "status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_payment_methods_user_id" ON "payment_methods" ("user_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_1237daf748b7653a6ebb9492fe" ON "payments" ("created_at") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_5138570d74944564db7f9545a9" ON "auth_metrics" ("success") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_307d20b665dcde8c6ae2d4fa6c" ON "auth_metrics" ("auth_method") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_19dab4d58cbe514b09e8fbe45a" ON "auth_metrics" ("timestamp") `,
    );
    await queryRunner.query(
      `ALTER TABLE "stellar_accounts" ADD CONSTRAINT "FK_57618cd5c1adfd733a555497211" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "stellar_transactions" ADD CONSTRAINT "FK_18edbdf789231384b4719c43849" FOREIGN KEY ("from_account_id") REFERENCES "stellar_accounts"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "stellar_transactions" ADD CONSTRAINT "FK_74575a55cc940977fc5e5ded310" FOREIGN KEY ("to_account_id") REFERENCES "stellar_accounts"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "stellar_escrows" ADD CONSTRAINT "FK_efd04c1334a766e982f3fe08090" FOREIGN KEY ("escrow_account_id") REFERENCES "stellar_accounts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "stellar_escrows" ADD CONSTRAINT "FK_cbec3cdbbf4d13629536ebb2e73" FOREIGN KEY ("source_account_id") REFERENCES "stellar_accounts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "stellar_escrows" ADD CONSTRAINT "FK_178af924edee238a5aeb23eb8bd" FOREIGN KEY ("destination_account_id") REFERENCES "stellar_accounts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "rent_payments" ADD CONSTRAINT "FK_5b62ad4907dfe7bdbf50691a31e" FOREIGN KEY ("agreement_id") REFERENCES "rent_agreements"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "property_images" ADD CONSTRAINT "FK_162a7701665354b4751ffb835e4" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "property_amenities" ADD CONSTRAINT "FK_6002e49cdd5713b05fcd14e6d0a" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "properties" ADD CONSTRAINT "FK_797b76e2d11a5bf755127d1aa67" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "rental_units" ADD CONSTRAINT "FK_c66e90ae1c1f1ff873dd2c33df1" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment_methods" ADD CONSTRAINT "FK_d7d7fb15569674aaadcfbc0428c" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" ADD CONSTRAINT "FK_427785468fb7d2733f59e7d7d39" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" ADD CONSTRAINT "FK_12fd861c33c885f01b9a7da7d93" FOREIGN KEY ("payment_method_id") REFERENCES "payment_methods"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment_schedules" ADD CONSTRAINT "FK_e9a9102e66045ff6b91d821f941" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment_schedules" ADD CONSTRAINT "FK_1104d3269408a611527fa6908fd" FOREIGN KEY ("payment_method_id") REFERENCES "payment_methods"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" ADD CONSTRAINT "FK_9a8a82462cab47c73d25f49261f" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "message" ADD CONSTRAINT "FK_4404b7d229b7093872f40a87e7b" FOREIGN KEY ("chat_room_id") REFERENCES "chat_room"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "message" ADD CONSTRAINT "FK_c0ab99d9dfc61172871277b52f6" FOREIGN KEY ("sender_id") REFERENCES "participant"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "message" ADD CONSTRAINT "FK_f4da40532b0102d51beb220f16a" FOREIGN KEY ("receiver_id") REFERENCES "participant"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "participant" ADD CONSTRAINT "FK_f0619ac90b1ceecf4fab716192f" FOREIGN KEY ("chat_room_id") REFERENCES "chat_room"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "dispute_evidence" ADD CONSTRAINT "FK_e5002398b258a9c604b22e5bc84" FOREIGN KEY ("dispute_id") REFERENCES "disputes"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "dispute_evidence" ADD CONSTRAINT "FK_69fe4c674de2ff4493321c84bf8" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "dispute_comments" ADD CONSTRAINT "FK_73997dfdd92c52e8e272daf993f" FOREIGN KEY ("dispute_id") REFERENCES "disputes"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "dispute_comments" ADD CONSTRAINT "FK_a95e744fae69ed9085c11f06d53" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "disputes" ADD CONSTRAINT "FK_88ee5cde660b017bc762140624f" FOREIGN KEY ("agreement_id") REFERENCES "rent_agreements"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "disputes" ADD CONSTRAINT "FK_c94b97e75b3247ebafb25ed78d9" FOREIGN KEY ("initiated_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "disputes" ADD CONSTRAINT "FK_573e2d4b2acb74b7f74a4d4735a" FOREIGN KEY ("resolved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "dispute_votes" ADD CONSTRAINT "FK_37db42e34d59bf8a46923d12984" FOREIGN KEY ("dispute_id") REFERENCES "disputes"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "dispute_votes" ADD CONSTRAINT "FK_b82cd622407cf1770e9799b5caa" FOREIGN KEY ("arbiter_id") REFERENCES "arbiters"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "mfa_devices" ADD CONSTRAINT "FK_5716246475c818b656517d4b6a7" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "audit_logs" ADD CONSTRAINT "FK_ae97aac6d6d471b9d88cea1c971" FOREIGN KEY ("performed_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "role_permissions" ADD CONSTRAINT "FK_178199805b901ccd220ab7740ec" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "role_permissions" ADD CONSTRAINT "FK_17022daf3f885f7d35423e9971e" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "role_permissions" DROP CONSTRAINT "FK_17022daf3f885f7d35423e9971e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "role_permissions" DROP CONSTRAINT "FK_178199805b901ccd220ab7740ec"`,
    );
    await queryRunner.query(
      `ALTER TABLE "audit_logs" DROP CONSTRAINT "FK_ae97aac6d6d471b9d88cea1c971"`,
    );
    await queryRunner.query(
      `ALTER TABLE "mfa_devices" DROP CONSTRAINT "FK_5716246475c818b656517d4b6a7"`,
    );
    await queryRunner.query(
      `ALTER TABLE "dispute_votes" DROP CONSTRAINT "FK_b82cd622407cf1770e9799b5caa"`,
    );
    await queryRunner.query(
      `ALTER TABLE "dispute_votes" DROP CONSTRAINT "FK_37db42e34d59bf8a46923d12984"`,
    );
    await queryRunner.query(
      `ALTER TABLE "disputes" DROP CONSTRAINT "FK_573e2d4b2acb74b7f74a4d4735a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "disputes" DROP CONSTRAINT "FK_c94b97e75b3247ebafb25ed78d9"`,
    );
    await queryRunner.query(
      `ALTER TABLE "disputes" DROP CONSTRAINT "FK_88ee5cde660b017bc762140624f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "dispute_comments" DROP CONSTRAINT "FK_a95e744fae69ed9085c11f06d53"`,
    );
    await queryRunner.query(
      `ALTER TABLE "dispute_comments" DROP CONSTRAINT "FK_73997dfdd92c52e8e272daf993f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "dispute_evidence" DROP CONSTRAINT "FK_69fe4c674de2ff4493321c84bf8"`,
    );
    await queryRunner.query(
      `ALTER TABLE "dispute_evidence" DROP CONSTRAINT "FK_e5002398b258a9c604b22e5bc84"`,
    );
    await queryRunner.query(
      `ALTER TABLE "participant" DROP CONSTRAINT "FK_f0619ac90b1ceecf4fab716192f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "message" DROP CONSTRAINT "FK_f4da40532b0102d51beb220f16a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "message" DROP CONSTRAINT "FK_c0ab99d9dfc61172871277b52f6"`,
    );
    await queryRunner.query(
      `ALTER TABLE "message" DROP CONSTRAINT "FK_4404b7d229b7093872f40a87e7b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" DROP CONSTRAINT "FK_9a8a82462cab47c73d25f49261f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment_schedules" DROP CONSTRAINT "FK_1104d3269408a611527fa6908fd"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment_schedules" DROP CONSTRAINT "FK_e9a9102e66045ff6b91d821f941"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" DROP CONSTRAINT "FK_12fd861c33c885f01b9a7da7d93"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" DROP CONSTRAINT "FK_427785468fb7d2733f59e7d7d39"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment_methods" DROP CONSTRAINT "FK_d7d7fb15569674aaadcfbc0428c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "rental_units" DROP CONSTRAINT "FK_c66e90ae1c1f1ff873dd2c33df1"`,
    );
    await queryRunner.query(
      `ALTER TABLE "properties" DROP CONSTRAINT "FK_797b76e2d11a5bf755127d1aa67"`,
    );
    await queryRunner.query(
      `ALTER TABLE "property_amenities" DROP CONSTRAINT "FK_6002e49cdd5713b05fcd14e6d0a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "property_images" DROP CONSTRAINT "FK_162a7701665354b4751ffb835e4"`,
    );
    await queryRunner.query(
      `ALTER TABLE "rent_payments" DROP CONSTRAINT "FK_5b62ad4907dfe7bdbf50691a31e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "stellar_escrows" DROP CONSTRAINT "FK_178af924edee238a5aeb23eb8bd"`,
    );
    await queryRunner.query(
      `ALTER TABLE "stellar_escrows" DROP CONSTRAINT "FK_cbec3cdbbf4d13629536ebb2e73"`,
    );
    await queryRunner.query(
      `ALTER TABLE "stellar_escrows" DROP CONSTRAINT "FK_efd04c1334a766e982f3fe08090"`,
    );
    await queryRunner.query(
      `ALTER TABLE "stellar_transactions" DROP CONSTRAINT "FK_74575a55cc940977fc5e5ded310"`,
    );
    await queryRunner.query(
      `ALTER TABLE "stellar_transactions" DROP CONSTRAINT "FK_18edbdf789231384b4719c43849"`,
    );
    await queryRunner.query(
      `ALTER TABLE "stellar_accounts" DROP CONSTRAINT "FK_57618cd5c1adfd733a555497211"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_19dab4d58cbe514b09e8fbe45a"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_307d20b665dcde8c6ae2d4fa6c"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_5138570d74944564db7f9545a9"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_1237daf748b7653a6ebb9492fe"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."idx_payment_methods_user_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_b13da725bb0d236ee1df1f94ce"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_797b76e2d11a5bf755127d1aa6"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_823d1011f2efdec975081a15b5"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_92e950a2513a79bb3fab273c92"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_a7b3e1afadd6b52f3b6864745e"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_97672ac88f789774dd47f7c8be"`,
    );
    await queryRunner.query(
      `ALTER TABLE "auth_metrics" ALTER COLUMN "auth_method" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "auth_metrics" ALTER COLUMN "auth_method" SET NOT NULL`,
    );
    await queryRunner.query(`ALTER TABLE "api_keys" DROP COLUMN "updated_at"`);
    await queryRunner.query(
      `ALTER TABLE "api_keys" ADD "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(`ALTER TABLE "api_keys" DROP COLUMN "created_at"`);
    await queryRunner.query(
      `ALTER TABLE "api_keys" ADD "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "api_keys" DROP COLUMN "last_used_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "api_keys" ADD "last_used_at" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `ALTER TABLE "disputes" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "disputes" ALTER COLUMN "created_at" SET DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "disputes" DROP CONSTRAINT "UQ_8dce736a5b4967c790d992407b1"`,
    );
    await queryRunner.query(`ALTER TABLE "disputes" DROP COLUMN "dispute_id"`);
    await queryRunner.query(
      `ALTER TABLE "disputes" ADD "dispute_id" character varying(36) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "disputes" ADD CONSTRAINT "disputes_dispute_id_key" UNIQUE ("dispute_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "dispute_comments" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "dispute_comments" ALTER COLUMN "created_at" SET DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "dispute_comments" ALTER COLUMN "is_internal" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "dispute_evidence" ALTER COLUMN "created_at" SET DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(`ALTER TABLE "feedback" DROP COLUMN "created_at"`);
    await queryRunner.query(
      `ALTER TABLE "feedback" ADD "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" ALTER COLUMN "user_id" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment_schedules" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment_schedules" ALTER COLUMN "updated_at" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment_schedules" ALTER COLUMN "created_at" SET DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment_schedules" ALTER COLUMN "created_at" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment_schedules" ALTER COLUMN "max_retries" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment_schedules" ALTER COLUMN "retries" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment_schedules" ALTER COLUMN "currency" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment_schedules" DROP COLUMN "agreement_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment_schedules" ADD "agreement_id" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" ALTER COLUMN "updated_at" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" ALTER COLUMN "created_at" SET DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" ALTER COLUMN "created_at" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" ALTER COLUMN "refunded_amount" SET DEFAULT 0.00`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" ALTER COLUMN "refunded_amount" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" DROP COLUMN "reference_number"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" ADD "reference_number" character varying(100)`,
    );
    await queryRunner.query(`ALTER TABLE "payments" DROP COLUMN "status"`);
    await queryRunner.query(
      `ALTER TABLE "payments" ADD "status" character varying(20) NOT NULL DEFAULT 'pending'`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" ALTER COLUMN "currency" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" ALTER COLUMN "net_amount" SET DEFAULT 0.00`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" ALTER COLUMN "fee_amount" SET DEFAULT 0.00`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" ALTER COLUMN "fee_amount" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" DROP COLUMN "agreement_id"`,
    );
    await queryRunner.query(`ALTER TABLE "payments" ADD "agreement_id" uuid`);
    await queryRunner.query(
      `ALTER TABLE "payment_methods" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment_methods" ALTER COLUMN "updated_at" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment_methods" ALTER COLUMN "created_at" SET DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment_methods" ALTER COLUMN "created_at" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment_methods" ALTER COLUMN "is_default" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "profile_metadata" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "profile_metadata" ALTER COLUMN "created_at" SET DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "profile_metadata" ALTER COLUMN "last_synced_at" SET DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "profile_metadata" DROP COLUMN "display_name"`,
    );
    await queryRunner.query(
      `ALTER TABLE "profile_metadata" ADD "display_name" character varying(100)`,
    );
    await queryRunner.query(
      `ALTER TABLE "rent_payments" ALTER COLUMN "agreement_id" SET NOT NULL`,
    );
    await queryRunner.query(`ALTER TABLE "rent_payments" DROP COLUMN "status"`);
    await queryRunner.query(
      `ALTER TABLE "rent_payments" ADD "status" character varying(20) NOT NULL DEFAULT 'PENDING'`,
    );
    await queryRunner.query(
      `ALTER TABLE "rent_payments" ALTER COLUMN "amount" TYPE numeric(12,2)`,
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
      `ALTER TABLE "rent_agreements" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "rent_agreements" ALTER COLUMN "updated_at" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "rent_agreements" ALTER COLUMN "created_at" SET DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "rent_agreements" ALTER COLUMN "created_at" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "rent_agreements" ALTER COLUMN "status" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "rent_agreements" ALTER COLUMN "total_paid" SET DEFAULT 0.00`,
    );
    await queryRunner.query(
      `ALTER TABLE "rent_agreements" ALTER COLUMN "total_paid" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "rent_agreements" ALTER COLUMN "escrow_balance" SET DEFAULT 0.00`,
    );
    await queryRunner.query(
      `ALTER TABLE "rent_agreements" ALTER COLUMN "escrow_balance" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "rent_agreements" ALTER COLUMN "agent_commission_rate" SET DEFAULT 10.00`,
    );
    await queryRunner.query(
      `ALTER TABLE "rent_agreements" ALTER COLUMN "agent_commission_rate" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "rent_agreements" DROP COLUMN "agent_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "rent_agreements" ADD "agent_id" character varying(255)`,
    );
    await queryRunner.query(
      `ALTER TABLE "rent_agreements" DROP COLUMN "tenant_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "rent_agreements" ADD "tenant_id" character varying(255)`,
    );
    await queryRunner.query(
      `ALTER TABLE "rent_agreements" DROP COLUMN "landlord_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "rent_agreements" ADD "landlord_id" character varying(255)`,
    );
    await queryRunner.query(
      `ALTER TABLE "rent_agreements" DROP COLUMN "property_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "rent_agreements" ADD "property_id" character varying(255)`,
    );
    await queryRunner.query(
      `ALTER TABLE "rent_agreements" DROP CONSTRAINT "UQ_42f84f7ce9e5bae254d7d73ed87"`,
    );
    await queryRunner.query(
      `ALTER TABLE "rent_agreements" DROP COLUMN "agreement_number"`,
    );
    await queryRunner.query(
      `ALTER TABLE "rent_agreements" ADD "agreement_number" character varying(50)`,
    );
    await queryRunner.query(
      `ALTER TABLE "rent_agreements" ADD CONSTRAINT "rent_agreements_agreement_number_key" UNIQUE ("agreement_number")`,
    );
    await queryRunner.query(
      `ALTER TABLE "reviews" ALTER COLUMN "reported" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "reviews" ALTER COLUMN "created_at" DROP NOT NULL`,
    );
    await queryRunner.query(`ALTER TABLE "reviews" DROP COLUMN "property_id"`);
    await queryRunner.query(`ALTER TABLE "reviews" ADD "property_id" uuid`);
    await queryRunner.query(
      `ALTER TABLE "reviews" ALTER COLUMN "anonymous" DROP NOT NULL`,
    );
    await queryRunner.query(`ALTER TABLE "reviews" DROP COLUMN "context"`);
    await queryRunner.query(`DROP TYPE "public"."reviews_context_enum"`);
    await queryRunner.query(
      `ALTER TABLE "reviews" ADD "context" character varying NOT NULL`,
    );
    await queryRunner.query(`ALTER TABLE "reviews" DROP COLUMN "reviewee_id"`);
    await queryRunner.query(
      `ALTER TABLE "reviews" ADD "reviewee_id" uuid NOT NULL`,
    );
    await queryRunner.query(`ALTER TABLE "reviews" DROP COLUMN "reviewer_id"`);
    await queryRunner.query(
      `ALTER TABLE "reviews" ADD "reviewer_id" uuid NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent_transactions" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent_transactions" ALTER COLUMN "created_at" SET DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "stellar_escrows" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "stellar_escrows" ALTER COLUMN "created_at" SET DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "stellar_transactions" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "stellar_transactions" ALTER COLUMN "created_at" SET DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "stellar_accounts" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "stellar_accounts" ALTER COLUMN "created_at" SET DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "stellar_accounts" ALTER COLUMN "balance" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "stellar_accounts" ALTER COLUMN "is_active" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "stellar_accounts" ALTER COLUMN "sequence_number" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "refresh_token"`);
    await queryRunner.query(
      `ALTER TABLE "users" ADD "refresh_token" character varying(255)`,
    );
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "reset_token"`);
    await queryRunner.query(
      `ALTER TABLE "users" ADD "reset_token" character varying(255)`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "verification_token"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "verification_token" character varying(255)`,
    );
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "role"`);
    await queryRunner.query(`DROP TYPE "public"."users_role_enum"`);
    await queryRunner.query(
      `ALTER TABLE "users" ADD "role" character varying(50) NOT NULL DEFAULT 'user'`,
    );
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "avatar_url"`);
    await queryRunner.query(
      `ALTER TABLE "users" ADD "avatar_url" character varying(255)`,
    );
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "phone_number"`);
    await queryRunner.query(
      `ALTER TABLE "users" ADD "phone_number" character varying(20)`,
    );
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "last_name"`);
    await queryRunner.query(
      `ALTER TABLE "users" ADD "last_name" character varying(100)`,
    );
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "first_name"`);
    await queryRunner.query(
      `ALTER TABLE "users" ADD "first_name" character varying(100)`,
    );
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "password"`);
    await queryRunner.query(
      `ALTER TABLE "users" ADD "password" character varying(255)`,
    );
    await queryRunner.query(
      `ALTER TABLE "disputes" DROP COLUMN "blockchain_synced_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "disputes" DROP COLUMN "transaction_hash"`,
    );
    await queryRunner.query(
      `ALTER TABLE "disputes" DROP COLUMN "blockchain_outcome"`,
    );
    await queryRunner.query(
      `ALTER TABLE "disputes" DROP COLUMN "votes_favor_tenant"`,
    );
    await queryRunner.query(
      `ALTER TABLE "disputes" DROP COLUMN "votes_favor_landlord"`,
    );
    await queryRunner.query(
      `ALTER TABLE "disputes" DROP COLUMN "blockchain_resolved_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "disputes" DROP COLUMN "blockchain_raised_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "disputes" DROP COLUMN "details_hash"`,
    );
    await queryRunner.query(
      `ALTER TABLE "disputes" DROP COLUMN "blockchain_agreement_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "rent_payments" DROP COLUMN "paid_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "rent_agreements" DROP COLUMN "payment_split_config"`,
    );
    await queryRunner.query(
      `ALTER TABLE "rent_agreements" DROP COLUMN "blockchain_synced_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "rent_agreements" DROP COLUMN "transaction_hash"`,
    );
    await queryRunner.query(
      `ALTER TABLE "rent_agreements" DROP COLUMN "on_chain_status"`,
    );
    await queryRunner.query(
      `ALTER TABLE "rent_agreements" DROP COLUMN "blockchain_agreement_id"`,
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
    await queryRunner.query(
      `ALTER TABLE "stellar_escrows" DROP COLUMN "escrow_metadata"`,
    );
    await queryRunner.query(
      `ALTER TABLE "stellar_escrows" DROP COLUMN "approval_count"`,
    );
    await queryRunner.query(
      `ALTER TABLE "stellar_escrows" DROP COLUMN "blockchain_synced_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "stellar_escrows" DROP COLUMN "dispute_reason"`,
    );
    await queryRunner.query(
      `ALTER TABLE "stellar_escrows" DROP COLUMN "dispute_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "stellar_escrows" DROP COLUMN "arbiter_address"`,
    );
    await queryRunner.query(
      `ALTER TABLE "stellar_escrows" DROP COLUMN "escrow_contract_address"`,
    );
    await queryRunner.query(
      `ALTER TABLE "stellar_escrows" DROP COLUMN "on_chain_status"`,
    );
    await queryRunner.query(
      `ALTER TABLE "stellar_escrows" DROP COLUMN "blockchain_escrow_id"`,
    );
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "deleted_at"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "auth_method"`);
    await queryRunner.query(`DROP TYPE "public"."users_auth_method_enum"`);
    await queryRunner.query(
      `ALTER TABLE "users" DROP CONSTRAINT "UQ_196ef3e52525d3cd9e203bdb1de"`,
    );
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "wallet_address"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "kyc_status"`);
    await queryRunner.query(`DROP TYPE "public"."users_kyc_status_enum"`);
    await queryRunner.query(
      `ALTER TABLE "file_metadata" DROP COLUMN "updated_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "file_metadata" DROP COLUMN "created_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "file_metadata" DROP COLUMN "owner_id"`,
    );
    await queryRunner.query(`ALTER TABLE "file_metadata" DROP COLUMN "s3_key"`);
    await queryRunner.query(
      `ALTER TABLE "file_metadata" DROP COLUMN "file_type"`,
    );
    await queryRunner.query(
      `ALTER TABLE "file_metadata" DROP COLUMN "file_size"`,
    );
    await queryRunner.query(
      `ALTER TABLE "file_metadata" DROP COLUMN "file_name"`,
    );
    await queryRunner.query(
      `ALTER TABLE "rent_payments" ADD "updated_at" TIMESTAMP NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "rent_payments" ADD "created_at" TIMESTAMP NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(`ALTER TABLE "rent_payments" ADD "notes" text`);
    await queryRunner.query(
      `ALTER TABLE "rent_payments" ADD "reference_number" character varying(100)`,
    );
    await queryRunner.query(
      `ALTER TABLE "rent_payments" ADD "payment_method" character varying(50)`,
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
    await queryRunner.query(`ALTER TABLE "rent_agreements" ADD "user_id" uuid`);
    await queryRunner.query(
      `ALTER TABLE "file_metadata" ADD "fileName" character varying NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "file_metadata" ADD "s3Key" character varying NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "file_metadata" ADD "ownerId" uuid NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "file_metadata" ADD "updatedAt" TIMESTAMP NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "file_metadata" ADD "createdAt" TIMESTAMP NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "file_metadata" ADD "fileSize" integer NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "file_metadata" ADD "fileType" character varying NOT NULL`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_17022daf3f885f7d35423e9971"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_178199805b901ccd220ab7740e"`,
    );
    await queryRunner.query(`DROP TABLE "role_permissions"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_3ac985fe8543e61149ca6f1b80"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_78cea1f8ea6b9682f55f66002f"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_290ac1d9ac5dced160a9b7a14e"`,
    );
    await queryRunner.query(`DROP TABLE "anchor_transactions"`);
    await queryRunner.query(
      `DROP TYPE "public"."anchor_transactions_status_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."anchor_transactions_type_enum"`,
    );
    await queryRunner.query(`DROP TABLE "supported_currencies"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_ad1289fcba7affeae8811e9d46"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_5f4f91d73b0c20a1b4ba1c60d0"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_22ae0f361b6564a995e18b00f8"`,
    );
    await queryRunner.query(`DROP TABLE "rent_obligation_nfts"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_7421efc125d95e413657efa3c6"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_ae97aac6d6d471b9d88cea1c97"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_19a17dd79fd3546ccc39d3da7e"`,
    );
    await queryRunner.query(`DROP TABLE "audit_logs"`);
    await queryRunner.query(`DROP TABLE "mfa_devices"`);
    await queryRunner.query(`DROP TYPE "public"."mfa_devices_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."mfa_devices_type_enum"`);
    await queryRunner.query(`DROP TABLE "dispute_votes"`);
    await queryRunner.query(`DROP TABLE "arbiters"`);
    await queryRunner.query(`DROP TABLE "maintenance_requests"`);
    await queryRunner.query(
      `DROP TYPE "public"."maintenance_requests_status_enum"`,
    );
    await queryRunner.query(`DROP TABLE "participant"`);
    await queryRunner.query(`DROP TABLE "chat_room"`);
    await queryRunner.query(`DROP TABLE "message"`);
    await queryRunner.query(`DROP TABLE "rent_payments"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_648e3f5447f725579d7d4ffdfb"`,
    );
    await queryRunner.query(`DROP TABLE "roles"`);
    await queryRunner.query(`DROP TYPE "public"."roles_system_role_enum"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_7331684c0c5b063803a425001a"`,
    );
    await queryRunner.query(`DROP TABLE "permissions"`);
    await queryRunner.query(`DROP TYPE "public"."permissions_action_enum"`);
    await queryRunner.query(`DROP TYPE "public"."permissions_resource_enum"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_87123d25025bb5487c4baf9b46"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_7be8e81bef0d82c4c44a5ea920"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_7567faf52e0f0da34dbab2daf3"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_e3771c7c360d1df5d7462a4ebc"`,
    );
    await queryRunner.query(`DROP TABLE "security_events"`);
    await queryRunner.query(
      `DROP TYPE "public"."security_events_severity_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."security_events_event_type_enum"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_33216e2bcd962b0db49a361399"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_4cddf9b490d6d9999802df2ecb"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_256164095dad4997e974fdc2e7"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_f4a8a1f81abfd74ce2189ed02d"`,
    );
    await queryRunner.query(`DROP TABLE "threat_events"`);
    await queryRunner.query(`DROP TYPE "public"."threat_events_status_enum"`);
    await queryRunner.query(
      `DROP TYPE "public"."threat_events_threat_level_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."threat_events_threat_type_enum"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_stellar_payments_agreement_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_stellar_payments_status"`,
    );
    await queryRunner.query(`DROP TABLE "stellar_payments"`);
    await queryRunner.query(
      `DROP TYPE "public"."stellar_payments_status_enum"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_99797bb751811331b74d27865f"`,
    );
    await queryRunner.query(`DROP TABLE "kyc"`);
    await queryRunner.query(`DROP TYPE "public"."kyc_status_enum"`);
    await queryRunner.query(
      `CREATE INDEX "IDX_auth_metrics_timestamp_method" ON "auth_metrics" ("auth_method", "timestamp") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_auth_metrics_success" ON "auth_metrics" ("success") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_auth_metrics_auth_method" ON "auth_metrics" ("auth_method") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_auth_metrics_timestamp" ON "auth_metrics" ("timestamp") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_api_keys_key_hash" ON "api_keys" ("key_hash") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_api_keys_user_id" ON "api_keys" ("user_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_disputes_created_at" ON "disputes" ("created_at") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_disputes_dispute_type" ON "disputes" ("dispute_type") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_disputes_status" ON "disputes" ("status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_disputes_initiated_by" ON "disputes" ("initiated_by") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_disputes_agreement_id" ON "disputes" ("agreement_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_dispute_comments_is_internal" ON "dispute_comments" ("is_internal") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_dispute_comments_user_id" ON "dispute_comments" ("user_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_dispute_comments_dispute_id" ON "dispute_comments" ("dispute_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_dispute_evidence_uploaded_by" ON "dispute_evidence" ("uploaded_by") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_dispute_evidence_dispute_id" ON "dispute_evidence" ("dispute_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_feedback_created_at" ON "feedback" ("created_at") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_payments_agreement_id" ON "payments" ("agreement_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_payments_status" ON "payments" ("status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_profile_metadata_data_hash" ON "profile_metadata" ("data_hash") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_properties_price" ON "properties" ("price") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_properties_city" ON "properties" ("city") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_properties_type" ON "properties" ("type") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_properties_status" ON "properties" ("status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_properties_owner_id" ON "properties" ("owner_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_rent_agreements_end_date" ON "rent_agreements" ("end_date") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_rent_agreements_start_date" ON "rent_agreements" ("start_date") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_rent_agreements_status" ON "rent_agreements" ("status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_rent_agreements_property_id" ON "rent_agreements" ("property_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_rent_agreements_agent_id" ON "rent_agreements" ("agent_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_rent_agreements_tenant_id" ON "rent_agreements" ("tenant_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_rent_agreements_landlord_id" ON "rent_agreements" ("landlord_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_reviews_reviewee_id" ON "reviews" ("reviewee_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_reviews_reviewer_id" ON "reviews" ("reviewer_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "disputes" ADD CONSTRAINT "disputes_resolved_by_fkey" FOREIGN KEY ("resolved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "disputes" ADD CONSTRAINT "disputes_initiated_by_fkey" FOREIGN KEY ("initiated_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "disputes" ADD CONSTRAINT "disputes_agreement_id_fkey" FOREIGN KEY ("agreement_id") REFERENCES "rent_agreements"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "dispute_comments" ADD CONSTRAINT "dispute_comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "dispute_comments" ADD CONSTRAINT "dispute_comments_dispute_id_fkey" FOREIGN KEY ("dispute_id") REFERENCES "disputes"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "dispute_evidence" ADD CONSTRAINT "dispute_evidence_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "dispute_evidence" ADD CONSTRAINT "dispute_evidence_dispute_id_fkey" FOREIGN KEY ("dispute_id") REFERENCES "disputes"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" ADD CONSTRAINT "FK_9a8a82462cab47c73d25f49261f" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment_schedules" ADD CONSTRAINT "payment_schedules_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment_schedules" ADD CONSTRAINT "payment_schedules_payment_method_id_fkey" FOREIGN KEY ("payment_method_id") REFERENCES "payment_methods"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" ADD CONSTRAINT "payments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" ADD CONSTRAINT "payments_payment_method_id_fkey" FOREIGN KEY ("payment_method_id") REFERENCES "payment_methods"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" ADD CONSTRAINT "fk_payments_agreement" FOREIGN KEY ("agreement_id") REFERENCES "rent_agreements"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment_methods" ADD CONSTRAINT "payment_methods_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "rental_units" ADD CONSTRAINT "FK_rental_units_property" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "properties" ADD CONSTRAINT "FK_properties_owner" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "property_amenities" ADD CONSTRAINT "FK_property_amenities_property" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "property_images" ADD CONSTRAINT "FK_property_images_property" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "rent_agreements" ADD CONSTRAINT "FK_ccb630048ac85cbe7d01dd779da" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "stellar_escrows" ADD CONSTRAINT "stellar_escrows_destination_account_id_fkey" FOREIGN KEY ("destination_account_id") REFERENCES "stellar_accounts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "stellar_escrows" ADD CONSTRAINT "stellar_escrows_source_account_id_fkey" FOREIGN KEY ("source_account_id") REFERENCES "stellar_accounts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "stellar_escrows" ADD CONSTRAINT "stellar_escrows_escrow_account_id_fkey" FOREIGN KEY ("escrow_account_id") REFERENCES "stellar_accounts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "stellar_transactions" ADD CONSTRAINT "stellar_transactions_to_account_id_fkey" FOREIGN KEY ("to_account_id") REFERENCES "stellar_accounts"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "stellar_transactions" ADD CONSTRAINT "stellar_transactions_from_account_id_fkey" FOREIGN KEY ("from_account_id") REFERENCES "stellar_accounts"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "stellar_accounts" ADD CONSTRAINT "stellar_accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }
}
