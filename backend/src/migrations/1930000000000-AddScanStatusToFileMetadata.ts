import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddScanStatusToFileMetadata1930000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "file_metadata_scan_status_enum" AS ENUM ('pending', 'clean', 'quarantined')
    `);
    await queryRunner.query(`
      ALTER TABLE "file_metadata"
        ADD COLUMN "scan_status" "file_metadata_scan_status_enum"
          NOT NULL DEFAULT 'pending'
    `);
    // Mark all pre-existing rows as clean so they remain retrievable
    await queryRunner.query(`
      UPDATE "file_metadata" SET "scan_status" = 'clean'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "file_metadata" DROP COLUMN "scan_status"`,
    );
    await queryRunner.query(`DROP TYPE "file_metadata_scan_status_enum"`);
  }
}
