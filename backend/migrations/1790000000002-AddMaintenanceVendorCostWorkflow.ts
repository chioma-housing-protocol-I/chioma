import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMaintenanceVendorCostWorkflow1790000000002 implements MigrationInterface {
  name = 'AddMaintenanceVendorCostWorkflow1790000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "maintenance_vendors" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "name" varchar NOT NULL,
        "email" varchar,
        "phone" varchar,
        "specialties" text,
        "landlordId" varchar,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        "updatedAt" timestamp NOT NULL DEFAULT now()
      )`);
    for (const value of ['ASSIGNED', 'COST_PENDING', 'COST_APPROVED', 'PAID']) {
      await queryRunner.query(
        `ALTER TYPE "maintenance_requests_status_enum" ADD VALUE IF NOT EXISTS '${value}'`,
      );
    }
    await queryRunner.query(`
      ALTER TABLE "maintenance_requests"
        ADD COLUMN "vendorId" uuid REFERENCES "maintenance_vendors"("id") ON DELETE SET NULL,
        ADD COLUMN "estimatedCost" decimal(12,2),
        ADD COLUMN "costNotes" text,
        ADD COLUMN "costApprovedBy" varchar,
        ADD COLUMN "costApprovedAt" timestamp,
        ADD COLUMN "costRejectionReason" varchar,
        ADD COLUMN "paymentId" varchar`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "maintenance_requests"
        DROP COLUMN "paymentId",
        DROP COLUMN "costRejectionReason",
        DROP COLUMN "costApprovedAt",
        DROP COLUMN "costApprovedBy",
        DROP COLUMN "costNotes",
        DROP COLUMN "estimatedCost",
        DROP COLUMN "vendorId"`);
    await queryRunner.query(`DROP TABLE "maintenance_vendors"`);
  }
}
