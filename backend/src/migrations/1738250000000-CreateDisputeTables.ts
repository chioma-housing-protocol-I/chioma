import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateDisputeTables1738250000000 implements MigrationInterface {
  name = 'CreateDisputeTables1738250000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create disputes table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS disputes (
        id SERIAL PRIMARY KEY,
        dispute_id VARCHAR(36) NOT NULL UNIQUE,
        agreement_id INTEGER NOT NULL REFERENCES rent_agreements(id) ON DELETE CASCADE,
        initiated_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        dispute_type VARCHAR(50) NOT NULL,
        requested_amount DECIMAL(12,2),
        description TEXT NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'OPEN',
        resolution TEXT,
        resolved_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        resolved_at TIMESTAMP,
        metadata JSONB
      )
    `);

    // Create dispute_evidence table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS dispute_evidence (
        id SERIAL PRIMARY KEY,
        dispute_id INTEGER NOT NULL REFERENCES disputes(id) ON DELETE CASCADE,
        uploaded_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        file_url TEXT NOT NULL,
        file_name TEXT NOT NULL,
        file_type VARCHAR(100) NOT NULL,
        file_size INTEGER NOT NULL,
        description TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create dispute_comments table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS dispute_comments (
        id SERIAL PRIMARY KEY,
        dispute_id INTEGER NOT NULL REFERENCES disputes(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        is_internal BOOLEAN DEFAULT false,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes for disputes table
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_disputes_agreement_id" ON "disputes"("agreement_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_disputes_initiated_by" ON "disputes"("initiated_by")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_disputes_status" ON "disputes"("status")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_disputes_dispute_type" ON "disputes"("dispute_type")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_disputes_created_at" ON "disputes"("created_at")`,
    );

    // Create indexes for dispute_evidence table
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_dispute_evidence_dispute_id" ON "dispute_evidence"("dispute_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_dispute_evidence_uploaded_by" ON "dispute_evidence"("uploaded_by")`,
    );

    // Create indexes for dispute_comments table
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_dispute_comments_dispute_id" ON "dispute_comments"("dispute_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_dispute_comments_user_id" ON "dispute_comments"("user_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_dispute_comments_is_internal" ON "dispute_comments"("is_internal")`,
    );

    // Create trigger to update updated_at timestamp
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION update_disputes_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);

    await queryRunner.query(`
      CREATE TRIGGER trigger_disputes_updated_at
        BEFORE UPDATE ON disputes
        FOR EACH ROW
        EXECUTE FUNCTION update_disputes_updated_at();
    `);

    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION update_dispute_comments_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);

    await queryRunner.query(`
      CREATE TRIGGER trigger_dispute_comments_updated_at
        BEFORE UPDATE ON dispute_comments
        FOR EACH ROW
        EXECUTE FUNCTION update_dispute_comments_updated_at();
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop triggers
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS "trigger_dispute_comments_updated_at" ON "dispute_comments"`,
    );
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS "trigger_disputes_updated_at" ON "disputes"`,
    );

    // Drop functions
    await queryRunner.query(
      `DROP FUNCTION IF EXISTS "update_dispute_comments_updated_at"`,
    );
    await queryRunner.query(
      `DROP FUNCTION IF EXISTS "update_disputes_updated_at"`,
    );

    // Drop indexes
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_dispute_comments_is_internal"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_dispute_comments_user_id"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_dispute_comments_dispute_id"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_dispute_evidence_uploaded_by"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_dispute_evidence_dispute_id"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_disputes_created_at"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_disputes_dispute_type"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_disputes_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_disputes_initiated_by"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_disputes_agreement_id"`);

    // Drop tables
    await queryRunner.query(`DROP TABLE IF EXISTS "dispute_comments"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "dispute_evidence"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "disputes"`);
  }
}
