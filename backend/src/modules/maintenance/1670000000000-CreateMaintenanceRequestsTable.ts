import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMaintenanceRequestsTable1670000000000 implements MigrationInterface {
  name = 'CreateMaintenanceRequestsTable1670000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "maintenance_requests" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "propertyId" uuid NOT NULL,
        "tenantId" uuid NOT NULL,
        "landlordId" uuid NOT NULL,
        "category" character varying NOT NULL,
        "description" text NOT NULL,
        "priority" character varying NOT NULL DEFAULT 'MEDIUM',
        "status" character varying NOT NULL DEFAULT 'OPEN',
        "mediaUrls" text,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_maintenance_requests_id" PRIMARY KEY ("id")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "maintenance_requests"');
  }
}
