import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds `reward_failed` to the `referrals_status_enum` Postgres type so a
 * referral whose payout attempt fails (misconfigured payout source,
 * referrer with no wallet address, or a real Stellar payment error) can be
 * left in a definitive, retryable failure state instead of being silently
 * stuck at its prior status or falsely recorded as `rewarded`.
 *
 * Postgres historically restricts `ALTER TYPE ... ADD VALUE` from running
 * in the same transaction as a subsequent use of that value (and TypeORM
 * migrations run inside a transaction), so — matching the pattern already
 * used in this repo for enum changes (see the `tenant_screening_status_enum`
 * rebuild in `1900100000000-AlignSchemaWithEntities.ts`) — this rebuilds the
 * enum type via rename -> create -> cast -> drop rather than using
 * `ADD VALUE` directly.
 */
export class AddReferralRewardFailedStatus1930400000000 implements MigrationInterface {
  name = 'AddReferralRewardFailedStatus1930400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "public"."referrals_status_enum" RENAME TO "referrals_status_enum_old"`,
    );

    await queryRunner.query(
      `CREATE TYPE "public"."referrals_status_enum" AS ENUM('pending', 'completed', 'rewarded', 'cancelled', 'reward_failed')`,
    );

    await queryRunner.query(
      `ALTER TABLE "referrals" ALTER COLUMN "status" DROP DEFAULT`,
    );

    await queryRunner.query(
      `ALTER TABLE "referrals" ALTER COLUMN "status" TYPE "public"."referrals_status_enum" USING "status"::"text"::"public"."referrals_status_enum"`,
    );

    await queryRunner.query(
      `ALTER TABLE "referrals" ALTER COLUMN "status" SET DEFAULT 'pending'`,
    );

    await queryRunner.query(`DROP TYPE "public"."referrals_status_enum_old"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Any row currently in the new 'reward_failed' status has no equivalent
    // in the pre-migration enum. Fold it back to 'pending' (matching how
    // the codebase's existing MigrateUserRoleTerminology down() handles a
    // best-effort, ambiguous reverse mapping) so the column can be cast
    // back to the narrower type without a constraint violation.
    await queryRunner.query(
      `UPDATE "referrals" SET "status" = 'pending' WHERE "status" = 'reward_failed'`,
    );

    await queryRunner.query(
      `ALTER TYPE "public"."referrals_status_enum" RENAME TO "referrals_status_enum_new"`,
    );

    await queryRunner.query(
      `CREATE TYPE "public"."referrals_status_enum" AS ENUM('pending', 'completed', 'rewarded', 'cancelled')`,
    );

    await queryRunner.query(
      `ALTER TABLE "referrals" ALTER COLUMN "status" DROP DEFAULT`,
    );

    await queryRunner.query(
      `ALTER TABLE "referrals" ALTER COLUMN "status" TYPE "public"."referrals_status_enum" USING "status"::"text"::"public"."referrals_status_enum"`,
    );

    await queryRunner.query(
      `ALTER TABLE "referrals" ALTER COLUMN "status" SET DEFAULT 'pending'`,
    );

    await queryRunner.query(`DROP TYPE "public"."referrals_status_enum_new"`);
  }
}
