import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddScanStatusToDisputeEvidence1930100000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "dispute_evidence_scan_status_enum" AS ENUM ('pending', 'clean', 'quarantined')
    `);
    await queryRunner.query(`
      ALTER TABLE "dispute_evidence"
        ADD COLUMN "scan_status" "dispute_evidence_scan_status_enum"
          NOT NULL DEFAULT 'pending'
    `);
    // Mark all pre-existing rows as clean so they remain retrievable
    await queryRunner.query(`
      UPDATE "dispute_evidence" SET "scan_status" = 'clean'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "dispute_evidence" DROP COLUMN "scan_status"`,
    );
    await queryRunner.query(`DROP TYPE "dispute_evidence_scan_status_enum"`);
  }
}
