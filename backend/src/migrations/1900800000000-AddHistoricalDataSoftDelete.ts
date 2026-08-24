import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddHistoricalDataSoftDelete1900800000000
  implements MigrationInterface
{
  name = 'AddHistoricalDataSoftDelete1900800000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    for (const table of [
      'properties',
      'reviews',
      'guest_reviews',
      'host_reviews',
      'documents',
      'tenant_screening_requests',
      'tenant_screening_reports',
      'tenant_screening_consents',
    ]) {
      await queryRunner.query(
        `ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMP`,
      );
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS "IDX_${table}_deleted_at" ON "${table}" ("deleted_at")`,
      );
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    for (const table of [
      'properties',
      'reviews',
      'guest_reviews',
      'host_reviews',
      'documents',
      'tenant_screening_requests',
      'tenant_screening_reports',
      'tenant_screening_consents',
    ]) {
      await queryRunner.query(
        `DROP INDEX IF EXISTS "IDX_${table}_deleted_at"`,
      );
      await queryRunner.query(
        `ALTER TABLE "${table}" DROP COLUMN IF EXISTS "deleted_at"`,
      );
    }
  }
}