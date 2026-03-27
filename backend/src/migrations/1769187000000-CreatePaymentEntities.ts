import { MigrationInterface, QueryRunner } from 'typeorm';
import { Logger } from '@nestjs/common';

export class CreatePaymentEntities1769187000000 implements MigrationInterface {
  name = 'CreatePaymentEntities1769187000000';
  private readonly logger = new Logger(CreatePaymentEntities1769187000000.name);

  public async up(_queryRunner: QueryRunner): Promise<void> {
    // Tables payment_methods and payments are already created by CreatePaymentsTable migration (1769185616877)
    // This migration is a no-op to avoid conflicts
    this.logger.log(
      'CreatePaymentEntities: Skipped - tables already exist from CreatePaymentsTable migration',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_1b7b4c6b8c8b8b8b8b8b8b8b8bc"`);
    await queryRunner.query(`DROP INDEX "IDX_1b7b4c6b8c8b8b8b8b8b8b8b8bb"`);
    await queryRunner.query(
      `ALTER TABLE "payments" DROP CONSTRAINT "FK_1b7b4c6b8c8b8b8b8b8b8b8b8ba"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" DROP CONSTRAINT "FK_1b7b4c6b8c8b8b8b8b8b8b8b8b9"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment_methods" DROP CONSTRAINT "FK_1b7b4c6b8c8b8b8b8b8b8b8b8b8"`,
    );
    await queryRunner.query(`DROP TABLE "payments"`);
    await queryRunner.query(`DROP TABLE "payment_methods"`);
  }
}
