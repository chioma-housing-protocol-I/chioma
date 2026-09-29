import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Issue #1832: Email Onboarding Skip Not Server-Side Enforced.
 *
 * Adds `email_collected_at` to `users` so the server can distinguish
 * accounts that have provided an email (either at registration or via
 * POST /auth/complete-profile) from wallet-only accounts that have never
 * supplied one. This timestamp drives the EmailRequiredGuard that blocks
 * sensitive operations until the user completes email onboarding.
 */
export class AddEmailCollectedAt1931000000000 implements MigrationInterface {
  name = 'AddEmailCollectedAt1931000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN "email_collected_at" TIMESTAMP`,
    );

    // Back-fill: any user who already has a non-null email gets their
    // created_at as a conservative approximation of when the email was
    // first collected, so the guard doesn't block existing users.
    await queryRunner.query(
      `UPDATE "users" SET "email_collected_at" = "created_at" WHERE "email" IS NOT NULL AND "email_collected_at" IS NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "email_collected_at"`,
    );
  }
}
