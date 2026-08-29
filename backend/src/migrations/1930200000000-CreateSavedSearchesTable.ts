import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSavedSearchesTable1930200000000 implements MigrationInterface {
  name = 'CreateSavedSearchesTable1930200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "saved_searches" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "name" character varying(150) NOT NULL,
        "filters" jsonb NOT NULL,
        "alerts_enabled" boolean NOT NULL DEFAULT true,
        "last_notified_at" TIMESTAMP,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_saved_searches_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_saved_searches_user_id" FOREIGN KEY ("user_id")
          REFERENCES "users" ("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_saved_searches_user_id"
        ON "saved_searches" ("user_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "saved_searches"`);
  }
}
