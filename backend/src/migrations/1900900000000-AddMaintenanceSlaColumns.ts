import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMaintenanceSlaColumns1900900000000
  implements MigrationInterface
{
  name = 'AddMaintenanceSlaColumns1900900000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "maintenance_requests_sla_escalation_tier_enum" AS ENUM ('NONE', 'LANDLORD', 'ADMIN');
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await queryRunner.query(`
      ALTER TABLE "maintenance_requests"
        ADD COLUMN IF NOT EXISTS "response_due_at" TIMESTAMP,
        ADD COLUMN IF NOT EXISTS "resolution_due_at" TIMESTAMP,
        ADD COLUMN IF NOT EXISTS "sla_escalation_tier" "maintenance_requests_sla_escalation_tier_enum" NOT NULL DEFAULT 'NONE'
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_maintenance_requests_response_due_at"
        ON "maintenance_requests" ("response_due_at")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_maintenance_requests_resolution_due_at"
        ON "maintenance_requests" ("resolution_due_at")
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_maintenance_requests_resolution_due_at"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_maintenance_requests_response_due_at"`,
    );
    await queryRunner.query(`
      ALTER TABLE "maintenance_requests"
        DROP COLUMN IF EXISTS "sla_escalation_tier",
        DROP COLUMN IF EXISTS "resolution_due_at",
        DROP COLUMN IF EXISTS "response_due_at"
    `);
    await queryRunner.query(
      `DROP TYPE IF EXISTS "maintenance_requests_sla_escalation_tier_enum"`,
    );
  }
}
