import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Composite index for payment status queries (e.g. retryFailedPayments,
 * dashboards filtering by status) that filter by userId + status and sort
 * by createdAt. The existing IDX_payments_user_status index only covers the
 * WHERE clause; without createdAt in the index, the sort still needs a
 * separate scan/sort step.
 */
export class AddPaymentsUserStatusCreatedAtIndex1900500000000 implements MigrationInterface {
  name = 'AddPaymentsUserStatusCreatedAtIndex1900500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_payments_user_status_created_at" ON "payments" ("user_id", "status", "created_at")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_payments_user_status_created_at"`,
    );
  }
}
