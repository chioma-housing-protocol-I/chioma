import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPaymentDisputeCorrelation1925000000000 implements MigrationInterface {
  name = 'AddPaymentDisputeCorrelation1925000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add payment correlation fields to disputes table
    await queryRunner.query(`
      ALTER TABLE "disputes" 
      ADD COLUMN "payment_id" uuid,
      ADD COLUMN "rent_payment_id" varchar(255),
      ADD COLUMN "disputed_payment_amount" decimal(12,2),
      ADD COLUMN "payment_reference_number" varchar(100),
      ADD COLUMN "payment_date" timestamp
    `);

    // Add indexes for efficient payment lookup
    await queryRunner.query(`
      CREATE INDEX "IDX_disputes_payment_id" ON "disputes" ("payment_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_disputes_rent_payment_id" ON "disputes" ("rent_payment_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_disputes_payment_reference_number" ON "disputes" ("payment_reference_number")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(
      `DROP INDEX "IDX_disputes_payment_reference_number"`,
    );
    await queryRunner.query(`DROP INDEX "IDX_disputes_rent_payment_id"`);
    await queryRunner.query(`DROP INDEX "IDX_disputes_payment_id"`);

    // Drop columns
    await queryRunner.query(`
      ALTER TABLE "disputes" 
      DROP COLUMN "payment_date",
      DROP COLUMN "payment_reference_number",
      DROP COLUMN "disputed_payment_amount",
      DROP COLUMN "rent_payment_id",
      DROP COLUMN "payment_id"
    `);
  }
}
