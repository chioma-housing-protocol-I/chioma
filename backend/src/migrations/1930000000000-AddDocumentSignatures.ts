import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDocumentSignatures1930000000000 implements MigrationInterface {
  name = 'AddDocumentSignatures1930000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "documents"
      ADD COLUMN "signatures" text
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "documents"
      DROP COLUMN "signatures"
    `);
  }
}
