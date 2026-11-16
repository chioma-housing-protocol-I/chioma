import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserConsentManagement1931300000000
  implements MigrationInterface
{
  name = 'AddUserConsentManagement1931300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const timestampType =
      queryRunner.connection.options.type === 'postgres'
        ? 'timestamp'
        : 'datetime';

    await queryRunner.query(
      `ALTER TABLE "users" ADD "cookie_consent" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "cookie_consent_updated_at" ${timestampType} NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "marketing_opt_in_updated_at" ${timestampType} NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "data_processing_agreement_accepted" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "data_processing_agreement_version" character varying(64)`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "data_processing_agreement_accepted_at" ${timestampType} NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "data_processing_agreement_updated_at" ${timestampType} NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "data_processing_agreement_updated_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "data_processing_agreement_accepted_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "data_processing_agreement_version"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "data_processing_agreement_accepted"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "marketing_opt_in_updated_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "cookie_consent_updated_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "cookie_consent"`,
    );
  }
}