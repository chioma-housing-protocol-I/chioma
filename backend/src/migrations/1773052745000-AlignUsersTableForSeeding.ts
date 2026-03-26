import { MigrationInterface, QueryRunner } from 'typeorm';

export class AlignUsersTableForSeeding1773052745000 implements MigrationInterface {
  name = 'AlignUsersTableForSeeding1773052745000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."users_kyc_status_enum" AS ENUM('PENDING', 'APPROVED', 'REJECTED', 'NEEDS_INFO');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."users_auth_method_enum" AS ENUM('password', 'stellar');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "kyc_status" "public"."users_kyc_status_enum" NOT NULL DEFAULT 'PENDING'
    `);

    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "wallet_address" character varying
    `);

    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "auth_method" "public"."users_auth_method_enum" NOT NULL DEFAULT 'password'
    `);

    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMP
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "users"
        ADD CONSTRAINT "UQ_users_wallet_address" UNIQUE ("wallet_address");
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "UQ_users_wallet_address"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "deleted_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "auth_method"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "wallet_address"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "kyc_status"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."users_auth_method_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."users_kyc_status_enum"`,
    );
  }
}
