import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Issue #1861: OAuth connection state validation incomplete.
 *
 * Persists OAuth `state` parameters server-side (instead of in memory or
 * client storage) so they can be validated and consumed exactly once on
 * callback, and adds the missing `discord` provider to the OAuth account
 * enum so Discord links can actually be stored.
 */
export class CreateOAuthStates1931100000000 implements MigrationInterface {
  name = 'CreateOAuthStates1931100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "public"."oauth_accounts_provider_enum" ADD VALUE IF NOT EXISTS 'discord'`,
    );

    await queryRunner.query(
      `CREATE TYPE "public"."oauth_states_provider_enum" AS ENUM('google', 'github', 'discord')`,
    );
    await queryRunner.query(
      `CREATE TABLE "oauth_states" ("state" character varying(128) NOT NULL, "provider" "public"."oauth_states_provider_enum" NOT NULL, "redirect_uri" character varying NOT NULL, "user_id" uuid, "expires_at" TIMESTAMP NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_oauth_states_state" PRIMARY KEY ("state"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_oauth_states_expires_at" ON "oauth_states" ("expires_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_oauth_states_user_provider" ON "oauth_states" ("user_id", "provider")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_oauth_states_user_provider"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_oauth_states_expires_at"`);
    await queryRunner.query(`DROP TABLE "oauth_states"`);
    await queryRunner.query(`DROP TYPE "public"."oauth_states_provider_enum"`);
    // Postgres cannot drop a single enum value; 'discord' is left on
    // oauth_accounts_provider_enum intentionally.
  }
}
