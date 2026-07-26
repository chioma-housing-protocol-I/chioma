import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration for issue #1388 – enforce verification-token uniqueness at the
 * storage layer, mirroring the User entity's `idx_users_verification_token`
 * index (see UserEntity#verificationToken). Postgres unique indexes treat
 * NULLs as distinct from one another, so verified users (whose token is
 * cleared to NULL) are unaffected.
 */
export class AddUniqueIndexToUserVerificationToken1900500000000 implements MigrationInterface {
  name = 'AddUniqueIndexToUserVerificationToken1900500000000';

  private readonly indexName = 'idx_users_verification_token';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "${this.indexName}"
      ON "users" ("verification_token")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "${this.indexName}"
    `);
  }
}
