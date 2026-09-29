import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEmailCollectedAt1783400000000 implements MigrationInterface {
  name = 'AddEmailCollectedAt1783400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "email_collected_at" TIMESTAMP DEFAULT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "email_collected_at"`,
    );
  }
}
