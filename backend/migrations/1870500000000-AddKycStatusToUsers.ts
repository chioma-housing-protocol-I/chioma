import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddKycStatusToUsers1870500000000 implements MigrationInterface {
  name = 'AddKycStatusToUsers1870500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."users_kyc_status_enum" AS ENUM('PENDING', 'APPROVED', 'REJECTED', 'NEEDS_INFO');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "kyc_status" "public"."users_kyc_status_enum" NOT NULL DEFAULT 'PENDING';
      EXCEPTION WHEN duplicate_column THEN null;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "kyc_status"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."users_kyc_status_enum"`,
    );
  }
}
