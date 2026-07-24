import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddVerificationTokenConstraints1782000000000
  implements MigrationInterface
{
  name = 'AddVerificationTokenConstraints1782000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Track token expiry so re-sent tokens can be reused while valid and
    // rotated once stale.
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "verification_token_expires" TIMESTAMP
    `);

    // Prevent two users (or two concurrent requests) from ever persisting the
    // same verification token. NULLs are allowed to repeat under SQL unique
    // semantics, so unverified/no-token users are unaffected.
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "idx_users_verification_token"
      ON "users" ("verification_token")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_users_verification_token"
    `);
    await queryRunner.query(`
      ALTER TABLE "users" DROP COLUMN IF EXISTS "verification_token_expires"
    `);
  }
}
