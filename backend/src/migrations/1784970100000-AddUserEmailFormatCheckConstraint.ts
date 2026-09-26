import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: Add a DB-level CHECK constraint enforcing email format on
 * "users" for issue #1422 – application-layer @IsEmail() validation already
 * exists on every input DTO (RegisterDto, CreateUserDto, ChangeEmailDto,
 * etc.), but nothing stopped a malformed email reaching the "users" table
 * through a path that bypasses those DTOs (raw SQL, seed/admin scripts).
 * This closes that gap at the storage layer.
 *
 * "email" is nullable (see MakeUserEmailNullable, for wallet-only Stellar
 * signups): a CHECK constraint only rejects rows where the expression
 * evaluates to FALSE, and `NULL ~* pattern` evaluates to NULL, so rows with
 * no email still insert/update fine. Verified against a live Postgres
 * instance.
 */
export class AddUserEmailFormatCheckConstraint1784970100000 implements MigrationInterface {
  name = 'AddUserEmailFormatCheckConstraint1784970100000';

  private readonly constraintName = 'chk_users_email_format';
  private readonly emailPattern =
    '^[A-Za-z0-9.+_%-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD CONSTRAINT "${this.constraintName}"
      CHECK ("email" ~* '${this.emailPattern}')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "${this.constraintName}"
    `);
  }
}
