import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePaymentSchedulesTable1769270400000
  implements MigrationInterface
{
  name = 'CreatePaymentSchedulesTable1769270400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "payment_schedules" (
                "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
                "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
                "agreement_id" uuid,
                "payment_method_id" INTEGER REFERENCES "payment_methods"("id") ON DELETE SET NULL,
                "amount" DECIMAL(12,2) NOT NULL,
                "currency" VARCHAR(3) DEFAULT 'NGN',
                "interval" VARCHAR(20) NOT NULL,
                "next_run_at" TIMESTAMP NOT NULL,
                "status" VARCHAR(20) NOT NULL DEFAULT 'active',
                "retries" INTEGER DEFAULT 0,
                "max_retries" INTEGER DEFAULT 3,
                "last_error" TEXT,
                "metadata" JSONB,
                "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

    await queryRunner.query(
      `CREATE INDEX "idx_payment_schedules_user_id" ON "payment_schedules"("user_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_payment_schedules_next_run_at" ON "payment_schedules"("next_run_at")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_payment_schedules_next_run_at"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_payment_schedules_user_id"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "payment_schedules"`);
  }
}
