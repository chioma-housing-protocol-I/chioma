import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Wallet-only sign-ups (auth/stellar/verify) never had an email address,
 * but the `users.email` column was NOT NULL — so the very first wallet
 * login for a new address failed with a DB constraint violation. This
 * makes the column nullable; users fill it in later via
 * POST /auth/complete-profile.
 */
export class MakeUserEmailNullable1900200000000 implements MigrationInterface {
  name = 'MakeUserEmailNullable1900200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "email" DROP NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "email" SET NOT NULL`,
    );
  }
}
