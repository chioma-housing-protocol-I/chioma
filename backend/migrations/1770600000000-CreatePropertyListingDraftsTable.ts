import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Legacy migration superseded by CreatePropertyListingDraftTable1774300000000,
 * which matches the PropertyListingDraft entity's snake_case columns. This
 * migration's camelCase columns (landlordId, currentStep, ...) never matched
 * the entity and blocked the correct table definition from being created.
 * Kept so migration history stays consistent; no DB operations.
 */
export class CreatePropertyListingDraftsTable1770600000000 implements MigrationInterface {
  public async up(_queryRunner: QueryRunner): Promise<void> {}

  public async down(_queryRunner: QueryRunner): Promise<void> {}
}
