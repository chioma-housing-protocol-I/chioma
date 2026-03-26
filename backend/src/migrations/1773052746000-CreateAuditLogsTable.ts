import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAuditLogsTable1773052746000 implements MigrationInterface {
  name = 'CreateAuditLogsTable1773052746000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "audit_logs" (
        "id" SERIAL NOT NULL,
        "action" character varying(50) NOT NULL,
        "entity_type" character varying(50),
        "entity_id" character varying(36),
        "old_values" jsonb,
        "new_values" jsonb,
        "performed_by" uuid,
        "performed_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "ip_address" inet,
        "user_agent" text,
        "status" character varying(20),
        "error_message" text,
        "level" character varying(20) NOT NULL DEFAULT 'INFO',
        "metadata" jsonb,
        CONSTRAINT "PK_audit_logs_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_audit_logs_entity_type_entity_id"
      ON "audit_logs" ("entity_type", "entity_id")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_audit_logs_performed_by"
      ON "audit_logs" ("performed_by")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_audit_logs_performed_at"
      ON "audit_logs" ("performed_at")
    `);

    // Enforce append-only semantics for audit logs (updates are forbidden).
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION prevent_audit_logs_update()
      RETURNS trigger AS $$
      BEGIN
        RAISE EXCEPTION 'audit_logs are immutable and cannot be updated';
      END;
      $$ LANGUAGE plpgsql;
    `);

    await queryRunner.query(`
      DROP TRIGGER IF EXISTS trg_prevent_audit_logs_update ON "audit_logs";
    `);

    await queryRunner.query(`
      CREATE TRIGGER trg_prevent_audit_logs_update
      BEFORE UPDATE ON "audit_logs"
      FOR EACH ROW
      EXECUTE FUNCTION prevent_audit_logs_update();
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS trg_prevent_audit_logs_update ON "audit_logs"`,
    );
    await queryRunner.query(
      `DROP FUNCTION IF EXISTS prevent_audit_logs_update`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_audit_logs_performed_at"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_audit_logs_performed_by"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_audit_logs_entity_type_entity_id"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "audit_logs"`);
  }
}
