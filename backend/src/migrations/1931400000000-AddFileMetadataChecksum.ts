import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Issue #2091: property photo uploads sometimes get corrupted or fail
 * silently. Adds a `checksum` column to `file_metadata` so each upload's
 * SHA-256 digest is recorded at write time and can be compared against the
 * digest of whatever bytes are actually served later, catching silent
 * corruption (truncation, bit-flip in transit, etc) that content-type and
 * size checks alone never would.
 *
 * Nullable: existing rows have no recorded checksum (the bytes they
 * reference were never hashed at upload time) and are left as NULL rather
 * than backfilled with a guess.
 */
export class AddFileMetadataChecksum1931400000000 implements MigrationInterface {
  name = 'AddFileMetadataChecksum1931400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "file_metadata" ADD COLUMN "checksum" VARCHAR`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "file_metadata" DROP COLUMN "checksum"`,
    );
  }
}
