import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSecurityHardeningTables1740400000000 implements MigrationInterface {
  name = 'AddSecurityHardeningTables1740400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── 1. threat_events ───────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TYPE "public"."threat_events_threat_type_enum" AS ENUM (
        'brute_force', 'credential_stuffing', 'sql_injection', 'xss_attempt',
        'path_traversal', 'rate_limit_exceeded', 'suspicious_ip',
        'account_takeover', 'privilege_escalation', 'data_exfiltration',
        'anomalous_behavior', 'bot_activity', 'replay_attack'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "public"."threat_events_threat_level_enum" AS ENUM (
        'low', 'medium', 'high', 'critical'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "public"."threat_events_status_enum" AS ENUM (
        'detected', 'investigating', 'confirmed', 'mitigated', 'false_positive'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "threat_events" (
        "id"               UUID              NOT NULL DEFAULT uuid_generate_v4(),
        "user_id"          VARCHAR           ,
        "ip_address"       VARCHAR           ,
        "user_agent"       TEXT              ,
        "request_path"     VARCHAR           ,
        "request_method"   VARCHAR           ,
        "threat_type"      "public"."threat_events_threat_type_enum"   NOT NULL,
        "threat_level"     "public"."threat_events_threat_level_enum"  NOT NULL DEFAULT 'medium',
        "status"           "public"."threat_events_status_enum"        NOT NULL DEFAULT 'detected',
        "evidence"         JSONB             ,
        "description"      TEXT              ,
        "blocked"          BOOLEAN           NOT NULL DEFAULT false,
        "auto_mitigated"   BOOLEAN           NOT NULL DEFAULT false,
        "mitigation_action" VARCHAR          ,
        "created_at"       TIMESTAMPTZ       NOT NULL DEFAULT now(),
        "updated_at"       TIMESTAMPTZ       NOT NULL DEFAULT now(),
        CONSTRAINT "PK_threat_events" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`CREATE INDEX "IDX_threat_events_ip_date"        ON "threat_events" ("ip_address", "created_at")`);
    await queryRunner.query(`CREATE INDEX "IDX_threat_events_user_date"       ON "threat_events" ("user_id", "created_at")`);
    await queryRunner.query(`CREATE INDEX "IDX_threat_events_type_status"     ON "threat_events" ("threat_type", "status")`);
    await queryRunner.query(`CREATE INDEX "IDX_threat_events_level_date"      ON "threat_events" ("threat_level", "created_at")`);

    // ── 2. permissions ─────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TYPE "public"."permissions_resource_enum" AS ENUM (
        'users', 'properties', 'agreements', 'payments', 'disputes',
        'audit', 'security', 'notifications', 'kyc', 'admin', 'reports',
        'blockchain', 'storage'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "public"."permissions_action_enum" AS ENUM (
        'create', 'read', 'update', 'delete', 'execute', 'export', 'manage'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "permissions" (
        "id"          UUID        NOT NULL DEFAULT uuid_generate_v4(),
        "name"        VARCHAR(100) NOT NULL,
        "description" TEXT        ,
        "resource"    "public"."permissions_resource_enum" NOT NULL,
        "action"      "public"."permissions_action_enum"   NOT NULL,
        "is_active"   BOOLEAN     NOT NULL DEFAULT true,
        "created_at"  TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at"  TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_permissions"                     PRIMARY KEY ("id"),
        CONSTRAINT "UQ_permissions_resource_action"     UNIQUE ("resource", "action")
      )
    `);

    // ── 3. roles ───────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TYPE "public"."roles_system_role_enum" AS ENUM (
        'super_admin', 'admin', 'landlord', 'tenant', 'user', 'auditor', 'support'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "roles" (
        "id"          UUID        NOT NULL DEFAULT uuid_generate_v4(),
        "name"        VARCHAR(100) NOT NULL,
        "description" TEXT        ,
        "system_role" "public"."roles_system_role_enum",
        "is_active"   BOOLEAN     NOT NULL DEFAULT true,
        "created_at"  TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at"  TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_roles"     PRIMARY KEY ("id"),
        CONSTRAINT "UQ_roles_name" UNIQUE ("name")
      )
    `);

    // ── 4. role_permissions join table ─────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "role_permissions" (
        "role_id"       UUID NOT NULL,
        "permission_id" UUID NOT NULL,
        CONSTRAINT "PK_role_permissions" PRIMARY KEY ("role_id", "permission_id"),
        CONSTRAINT "FK_role_permissions_role"       FOREIGN KEY ("role_id")       REFERENCES "roles"("id")       ON DELETE CASCADE,
        CONSTRAINT "FK_role_permissions_permission" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`CREATE INDEX "IDX_role_permissions_role"       ON "role_permissions" ("role_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_role_permissions_permission" ON "role_permissions" ("permission_id")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "role_permissions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "roles"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "permissions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "threat_events"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."roles_system_role_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."permissions_action_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."permissions_resource_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."threat_events_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."threat_events_threat_level_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."threat_events_threat_type_enum"`);
  }
}
