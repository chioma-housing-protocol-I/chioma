import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Makes audit log rows immutable at the database boundary. A guard trigger
 * rejects UPDATE and DELETE unless the governed retention job explicitly
 * sets `audit.allow_mutation = 'on'` inside its own transaction. Raw SQL and
 * ORM query builders are both covered, unlike entity listeners alone.
 */
export class EnsureAuditLogImmutability1931700000000 implements MigrationInterface {
  name = 'EnsureAuditLogImmutability1931700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION audit_logs_immutable_guard()
      RETURNS trigger AS $$
      BEGIN
        IF current_setting('audit.allow_mutation', true) = 'on' THEN
          IF TG_OP = 'DELETE' THEN
            RETURN OLD;
          END IF;
          RETURN NEW;
        END IF;
        RAISE EXCEPTION 'audit log entries are immutable';
      END;
      $$ LANGUAGE plpgsql
    `);

    await queryRunner.query(`
      DROP TRIGGER IF EXISTS audit_logs_no_update ON audit_logs
    `);
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS audit_logs_no_delete ON audit_logs
    `);
    await queryRunner.query(`
      CREATE TRIGGER audit_logs_no_update
      BEFORE UPDATE ON audit_logs
      FOR EACH ROW EXECUTE FUNCTION audit_logs_immutable_guard()
    `);
    await queryRunner.query(`
      CREATE TRIGGER audit_logs_no_delete
      BEFORE DELETE ON audit_logs
      FOR EACH ROW EXECUTE FUNCTION audit_logs_immutable_guard()
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'DROP TRIGGER IF EXISTS audit_logs_no_update ON audit_logs',
    );
    await queryRunner.query(
      'DROP TRIGGER IF EXISTS audit_logs_no_delete ON audit_logs',
    );
    await queryRunner.query(
      'DROP FUNCTION IF EXISTS audit_logs_immutable_guard()',
    );
  }
}
