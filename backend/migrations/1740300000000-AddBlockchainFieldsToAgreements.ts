import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Legacy migration superseded by UpdateKycEncryptionSchema1774292331248.
 * Kept so migration history stays consistent; no DB operations.
 */
export class AddBlockchainFieldsToAgreements1740300000000 implements MigrationInterface {
  public async up(_queryRunner: QueryRunner): Promise<void> {}

  public async down(_queryRunner: QueryRunner): Promise<void> {}
}
