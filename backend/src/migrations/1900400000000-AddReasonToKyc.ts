import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddReasonToKyc1900400000000 implements MigrationInterface {
  name = 'AddReasonToKyc1900400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "kyc" ADD COLUMN IF NOT EXISTS "reason" text;
      EXCEPTION WHEN duplicate_column THEN null;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "kyc" DROP COLUMN IF EXISTS "reason"`);
  }
}
