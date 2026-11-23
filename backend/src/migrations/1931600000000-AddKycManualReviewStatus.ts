import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds MANUAL_REVIEW to both KYC enum types. A verification that times out
 * at the provider is recorded in this state so the user keeps limited access
 * while an admin works the manual-review queue.
 *
 * The enum is rebuilt (rename/create/cast/drop) rather than using
 * ALTER TYPE ... ADD VALUE because TypeORM runs migrations in a transaction
 * and Postgres rejects using a freshly added enum value in that transaction.
 */
export class AddKycManualReviewStatus1931600000000 implements MigrationInterface {
  name = 'AddKycManualReviewStatus1931600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await this.rebuildEnum(
      queryRunner,
      'kyc_status_enum',
      'kyc',
      'status',
      'PENDING',
      ['PENDING', 'APPROVED', 'REJECTED', 'NEEDS_INFO', 'MANUAL_REVIEW'],
    );
    await this.rebuildEnum(
      queryRunner,
      'users_kyc_status_enum',
      'users',
      'kyc_status',
      'PENDING',
      ['PENDING', 'APPROVED', 'REJECTED', 'NEEDS_INFO', 'MANUAL_REVIEW'],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Rows queued for manual review have no equivalent in the old enum, so
    // fold them back to PENDING before narrowing the type.
    for (const [table, column] of [
      ['kyc', 'status'],
      ['users', 'kyc_status'],
    ]) {
      await queryRunner.query(
        `UPDATE "${table}" SET "${column}" = 'PENDING' WHERE "${column}" = 'MANUAL_REVIEW'`,
      );
    }

    await this.rebuildEnum(
      queryRunner,
      'kyc_status_enum',
      'kyc',
      'status',
      'PENDING',
      ['PENDING', 'APPROVED', 'REJECTED', 'NEEDS_INFO'],
    );
    await this.rebuildEnum(
      queryRunner,
      'users_kyc_status_enum',
      'users',
      'kyc_status',
      'PENDING',
      ['PENDING', 'APPROVED', 'REJECTED', 'NEEDS_INFO'],
    );
  }

  private async rebuildEnum(
    queryRunner: QueryRunner,
    enumName: string,
    table: string,
    column: string,
    defaultStatus: string,
    values: string[],
  ): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "public"."${enumName}" RENAME TO "${enumName}_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."${enumName}" AS ENUM(${values
        .map((value) => `'${value}'`)
        .join(', ')})`,
    );
    await queryRunner.query(
      `ALTER TABLE "${table}" ALTER COLUMN "${column}" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "${table}" ALTER COLUMN "${column}" TYPE "public"."${enumName}" USING "${column}"::"text"::"public"."${enumName}"`,
    );
    await queryRunner.query(
      `ALTER TABLE "${table}" ALTER COLUMN "${column}" SET DEFAULT '${defaultStatus}'`,
    );
    await queryRunner.query(`DROP TYPE "public"."${enumName}_old"`);
  }
}
