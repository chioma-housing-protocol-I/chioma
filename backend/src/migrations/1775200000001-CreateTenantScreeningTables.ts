import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTenantScreeningTables1775200000001 implements MigrationInterface {
  name = 'CreateTenantScreeningTables1775200000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "tenant_screening_provider_enum" AS ENUM (
        'TRANSUNION_SMARTMOVE',
        'EXPERIAN_CONNECT'
      )
    `);
    await queryRunner.query(`
      CREATE TYPE "tenant_screening_status_enum" AS ENUM (
        'PENDING_CONSENT',
        'CONSENTED',
        'SUBMITTED',
        'IN_PROGRESS',
        'COMPLETED',
        'FAILED',
        'EXPIRED',
        'REVOKED'
      )
    `);
    await queryRunner.query(`
      CREATE TYPE "tenant_screening_risk_level_enum" AS ENUM (
        'LOW',
        'MEDIUM',
        'HIGH',
        'REVIEW'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "tenant_screening_requests" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "requested_by_user_id" uuid NOT NULL,
        "provider" "tenant_screening_provider_enum" NOT NULL,
        "requested_checks" text NOT NULL,
        "status" "tenant_screening_status_enum" NOT NULL DEFAULT 'PENDING_CONSENT',
        "consent_required" boolean NOT NULL DEFAULT true,
        "consent_version" character varying NOT NULL,
        "provider_reference" character varying,
        "encrypted_applicant_data" text NOT NULL,
        "consent_granted_at" TIMESTAMP,
        "consent_expires_at" TIMESTAMP,
        "submitted_at" TIMESTAMP,
        "completed_at" TIMESTAMP,
        "failure_reason" text,
        "report_summary" text,
        "metadata" text,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_tenant_screening_requests_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_tenant_screening_requests_tenant" FOREIGN KEY ("tenant_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "FK_tenant_screening_requests_requester" FOREIGN KEY ("requested_by_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_tenant_screening_requests_tenant_status" ON "tenant_screening_requests" ("tenant_id", "status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_tenant_screening_requests_requester_status" ON "tenant_screening_requests" ("requested_by_user_id", "status")`,
    );

    await queryRunner.query(`
      CREATE TABLE "tenant_screening_consents" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "screening_id" uuid NOT NULL,
        "tenant_id" uuid NOT NULL,
        "provider" "tenant_screening_provider_enum" NOT NULL,
        "consent_text_version" character varying NOT NULL,
        "granted_at" TIMESTAMP NOT NULL,
        "expires_at" TIMESTAMP,
        "ip_address" character varying,
        "user_agent" text,
        "revoked_at" TIMESTAMP,
        "metadata" text,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_tenant_screening_consents_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_tenant_screening_consents_screening" FOREIGN KEY ("screening_id") REFERENCES "tenant_screening_requests"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "FK_tenant_screening_consents_tenant" FOREIGN KEY ("tenant_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_tenant_screening_consents_screening_id" ON "tenant_screening_consents" ("screening_id")`,
    );

    await queryRunner.query(`
      CREATE TABLE "tenant_screening_reports" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "screening_id" uuid NOT NULL,
        "provider_report_id" character varying,
        "encrypted_report" text NOT NULL,
        "risk_level" "tenant_screening_risk_level_enum",
        "access_expires_at" TIMESTAMP,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_tenant_screening_reports_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_tenant_screening_reports_screening_id" UNIQUE ("screening_id"),
        CONSTRAINT "FK_tenant_screening_reports_screening" FOREIGN KEY ("screening_id") REFERENCES "tenant_screening_requests"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "tenant_screening_reports"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_tenant_screening_consents_screening_id"`,
    );
    await queryRunner.query(`DROP TABLE "tenant_screening_consents"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_tenant_screening_requests_requester_status"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_tenant_screening_requests_tenant_status"`,
    );
    await queryRunner.query(`DROP TABLE "tenant_screening_requests"`);
    await queryRunner.query(`DROP TYPE "tenant_screening_risk_level_enum"`);
    await queryRunner.query(`DROP TYPE "tenant_screening_status_enum"`);
    await queryRunner.query(`DROP TYPE "tenant_screening_provider_enum"`);
  }
}
