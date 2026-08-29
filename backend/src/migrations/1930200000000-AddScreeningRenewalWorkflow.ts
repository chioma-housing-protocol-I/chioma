import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddScreeningRenewalWorkflow1930200000000 implements MigrationInterface {
  name = 'AddScreeningRenewalWorkflow1930200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add renewed_from_id column to tenant_screening_requests
    await queryRunner.query(`
      ALTER TABLE "tenant_screening_requests"
      ADD COLUMN "renewed_from_id" uuid
    `);

    // Create foreign key constraint for renewal linkage
    await queryRunner.query(`
      ALTER TABLE "tenant_screening_requests"
      ADD CONSTRAINT "FK_tenant_screening_requests_renewed_from"
      FOREIGN KEY ("renewed_from_id")
      REFERENCES "tenant_screening_requests"("id")
      ON DELETE SET NULL
      ON UPDATE NO ACTION
    `);

    // Create index for efficient renewal queries
    await queryRunner.query(`
      CREATE INDEX "IDX_tenant_screening_requests_renewed_from_id"
      ON "tenant_screening_requests" ("renewed_from_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_tenant_screening_requests_renewed_from_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tenant_screening_requests" DROP CONSTRAINT "FK_tenant_screening_requests_renewed_from"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tenant_screening_requests" DROP COLUMN "renewed_from_id"`,
    );
  }
}
