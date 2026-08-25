import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRefundedAmountToStellarEscrows1930000000000
  implements MigrationInterface
{
  name = 'AddRefundedAmountToStellarEscrows1930000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "stellar_escrows"
      ADD COLUMN "refunded_amount" decimal(20,7) NOT NULL DEFAULT 0
    `);

    // Escrows already fully refunded before partial-refund support existed
    // were refunded in one whole-amount operation.
    await queryRunner.query(`
      UPDATE "stellar_escrows"
      SET "refunded_amount" = "amount"
      WHERE "status" = 'REFUNDED'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "stellar_escrows" DROP COLUMN "refunded_amount"
    `);
  }
}
