import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSupportedCurrenciesTable1773052744000 implements MigrationInterface {
  name = 'CreateSupportedCurrenciesTable1773052744000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "supported_currencies" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "code" character varying(10) NOT NULL,
        "name" character varying NOT NULL,
        "is_active" boolean NOT NULL DEFAULT true,
        "anchor_url" character varying NOT NULL,
        "stellar_asset_code" character varying,
        "stellar_asset_issuer" character varying,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_supported_currencies_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_supported_currencies_code" UNIQUE ("code")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "supported_currencies"`);
  }
}
