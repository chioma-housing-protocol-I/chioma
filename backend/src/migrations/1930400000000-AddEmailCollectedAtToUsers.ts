import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEmailCollectedAtToUsers1930400000000
  implements MigrationInterface
{
  name = 'AddEmailCollectedAtToUsers1930400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD "email_collected_at" TIMESTAMP NULL`,
    );
    await queryRunner.query(
      `UPDATE "users" SET "email_collected_at" = "created_at" WHERE "email" IS NOT NULL AND "email_collected_at" IS NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "email_collected_at"`,
    );
  }
}
