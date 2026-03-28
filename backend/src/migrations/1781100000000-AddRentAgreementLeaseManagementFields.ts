import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRentAgreementLeaseManagementFields1781100000000
  implements MigrationInterface
{
  name = 'AddRentAgreementLeaseManagementFields1781100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "rent_agreements"
      ADD COLUMN "renewal_option" boolean
    `);
    await queryRunner.query(`
      ALTER TABLE "rent_agreements"
      ADD COLUMN "renewal_notice_date" date
    `);
    await queryRunner.query(`
      ALTER TABLE "rent_agreements"
      ADD COLUMN "move_in_date" date
    `);
    await queryRunner.query(`
      ALTER TABLE "rent_agreements"
      ADD COLUMN "move_out_date" date
    `);
    await queryRunner.query(`
      ALTER TABLE "rent_agreements"
      ADD COLUMN "utilities_included" boolean
    `);
    await queryRunner.query(`
      ALTER TABLE "rent_agreements"
      ADD COLUMN "maintenance_responsibility" character varying(100)
    `);
    await queryRunner.query(`
      ALTER TABLE "rent_agreements"
      ADD COLUMN "early_termination_fee" numeric(12, 2)
    `);
    await queryRunner.query(`
      ALTER TABLE "rent_agreements"
      ADD COLUMN "late_fee_percentage" numeric(5, 2)
    `);
    await queryRunner.query(`
      ALTER TABLE "rent_agreements"
      ADD COLUMN "grace_period_days" integer
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "rent_agreements" DROP COLUMN IF EXISTS "grace_period_days"
    `);
    await queryRunner.query(`
      ALTER TABLE "rent_agreements" DROP COLUMN IF EXISTS "late_fee_percentage"
    `);
    await queryRunner.query(`
      ALTER TABLE "rent_agreements" DROP COLUMN IF EXISTS "early_termination_fee"
    `);
    await queryRunner.query(`
      ALTER TABLE "rent_agreements" DROP COLUMN IF EXISTS "maintenance_responsibility"
    `);
    await queryRunner.query(`
      ALTER TABLE "rent_agreements" DROP COLUMN IF EXISTS "utilities_included"
    `);
    await queryRunner.query(`
      ALTER TABLE "rent_agreements" DROP COLUMN IF EXISTS "move_out_date"
    `);
    await queryRunner.query(`
      ALTER TABLE "rent_agreements" DROP COLUMN IF EXISTS "move_in_date"
    `);
    await queryRunner.query(`
      ALTER TABLE "rent_agreements" DROP COLUMN IF EXISTS "renewal_notice_date"
    `);
    await queryRunner.query(`
      ALTER TABLE "rent_agreements" DROP COLUMN IF EXISTS "renewal_option"
    `);
  }
}
