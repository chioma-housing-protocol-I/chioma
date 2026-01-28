import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateAuditLogsTable1769188000000 implements MigrationInterface {
  name = 'CreateAuditLogsTable1769188000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        action VARCHAR(50) NOT NULL,
        entity_type VARCHAR(50),
        entity_id VARCHAR(36),
        old_values JSONB,
        new_values JSONB,
        performed_by UUID REFERENCES users(id),
        performed_at TIMESTAMPTZ DEFAULT NOW(),
        ip_address INET,
        user_agent TEXT,
        status VARCHAR(20),
        error_message TEXT,
        level VARCHAR(20) DEFAULT 'INFO',
        metadata JSONB
      );
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_audit_logs_performed_at ON audit_logs(performed_at);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_audit_logs_performed_by ON audit_logs(performed_by);`);

    // Optional GIN index for JSONB full-text-like queries on metadata/values
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_audit_logs_old_values_gin ON audit_logs USING GIN (old_values);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_audit_logs_new_values_gin ON audit_logs USING GIN (new_values);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_audit_logs_metadata_gin ON audit_logs USING GIN (metadata);`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_audit_logs_metadata_gin;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_audit_logs_new_values_gin;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_audit_logs_old_values_gin;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_audit_logs_performed_by;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_audit_logs_entity;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_audit_logs_performed_at;`);
    await queryRunner.query(`DROP TABLE IF EXISTS audit_logs;`);
  }
}
