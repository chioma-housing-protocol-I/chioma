import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds a deleted_at column to payment_methods and webhook_endpoints so
 * removing either resource soft-deletes it instead of a hard delete.
 * TypeORM's @DeleteDateColumn automatically excludes rows where this is
 * set from normal find/findOne queries.
 */
export class AddSoftDeleteToPaymentMethodsAndWebhookEndpoints1931400000000 implements MigrationInterface {
  name = 'AddSoftDeleteToPaymentMethodsAndWebhookEndpoints1931400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "payment_methods"
        ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMP NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "webhook_endpoints"
        ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMP NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "webhook_endpoints" DROP COLUMN IF EXISTS "deleted_at"
    `);
    await queryRunner.query(`
      ALTER TABLE "payment_methods" DROP COLUMN IF EXISTS "deleted_at"
    `);
  }
}
