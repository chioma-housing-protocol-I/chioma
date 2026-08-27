import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddKycDocumentRetentionColumns1900910000000 implements MigrationInterface {
  name = 'AddKycDocumentRetentionColumns1900910000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "kyc"
        ALTER COLUMN "encrypted_kyc_data" DROP NOT NULL,
        ADD COLUMN IF NOT EXISTS "document_hash" TEXT,
        ADD COLUMN IF NOT EXISTS "document_purged_at" TIMESTAMP
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_kyc_document_purged_at"
        ON "kyc" ("document_purged_at")
    `);
    // Speeds up the retention sweep's (status, updatedAt) scan for
    // not-yet-purged records.
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_kyc_status_updated_at"
        ON "kyc" ("status", "updated_at")
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_kyc_status_updated_at"`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_kyc_document_purged_at"`,
    );
    await queryRunner.query(`
      ALTER TABLE "kyc"
        DROP COLUMN IF EXISTS "document_purged_at",
        DROP COLUMN IF EXISTS "document_hash",
        ALTER COLUMN "encrypted_kyc_data" SET NOT NULL
    `);
  }
}
