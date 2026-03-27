import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDatabaseLevelEncryption1775000000000 implements MigrationInterface {
  name = 'AddDatabaseLevelEncryption1775000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const encryptionKey = process.env.DB_ENCRYPTION_KEY;
    if (!encryptionKey) {
      throw new Error(
        'DB_ENCRYPTION_KEY is required to run database encryption migration',
      );
    }

    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto`);

    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "email_encrypted" bytea`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "email_hash" varchar(64)`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "phone_number_encrypted" bytea`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "phone_number_hash" varchar(64)`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "wallet_address_encrypted" bytea`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "wallet_address_hash" varchar(64)`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "encryption_key_version" integer NOT NULL DEFAULT 1`,
    );

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_users_email_hash" ON "users" ("email_hash")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_users_phone_hash" ON "users" ("phone_number_hash")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_users_wallet_hash" ON "users" ("wallet_address_hash")`,
    );

    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION encrypt_users_sensitive_fields()
      RETURNS trigger
      LANGUAGE plpgsql
      AS $$
      BEGIN
        IF NEW.email IS NOT NULL THEN
          NEW.email_encrypted := pgp_sym_encrypt(NEW.email, '${encryptionKey}', 'cipher-algo=aes256');
          NEW.email_hash := encode(digest(lower(NEW.email), 'sha256'), 'hex');
        END IF;

        IF NEW.phone_number IS NOT NULL THEN
          NEW.phone_number_encrypted := pgp_sym_encrypt(NEW.phone_number, '${encryptionKey}', 'cipher-algo=aes256');
          NEW.phone_number_hash := encode(digest(NEW.phone_number, 'sha256'), 'hex');
        END IF;

        IF NEW.wallet_address IS NOT NULL THEN
          NEW.wallet_address_encrypted := pgp_sym_encrypt(NEW.wallet_address, '${encryptionKey}', 'cipher-algo=aes256');
          NEW.wallet_address_hash := encode(digest(lower(NEW.wallet_address), 'sha256'), 'hex');
        END IF;

        RETURN NEW;
      END;
      $$;
    `);

    await queryRunner.query(
      `DROP TRIGGER IF EXISTS users_encrypt_sensitive_fields ON "users"`,
    );
    await queryRunner.query(`
      CREATE TRIGGER users_encrypt_sensitive_fields
      BEFORE INSERT OR UPDATE ON "users"
      FOR EACH ROW
      EXECUTE FUNCTION encrypt_users_sensitive_fields()
    `);

    await queryRunner.query(`
      UPDATE "users"
      SET
        email_encrypted = CASE WHEN email IS NULL THEN NULL ELSE pgp_sym_encrypt(email, '${encryptionKey}', 'cipher-algo=aes256') END,
        email_hash = CASE WHEN email IS NULL THEN NULL ELSE encode(digest(lower(email), 'sha256'), 'hex') END,
        phone_number_encrypted = CASE WHEN phone_number IS NULL THEN NULL ELSE pgp_sym_encrypt(phone_number, '${encryptionKey}', 'cipher-algo=aes256') END,
        phone_number_hash = CASE WHEN phone_number IS NULL THEN NULL ELSE encode(digest(phone_number, 'sha256'), 'hex') END,
        wallet_address_encrypted = CASE WHEN wallet_address IS NULL THEN NULL ELSE pgp_sym_encrypt(wallet_address, '${encryptionKey}', 'cipher-algo=aes256') END,
        wallet_address_hash = CASE WHEN wallet_address IS NULL THEN NULL ELSE encode(digest(lower(wallet_address), 'sha256'), 'hex') END
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS users_encrypt_sensitive_fields ON "users"`,
    );
    await queryRunner.query(
      `DROP FUNCTION IF EXISTS encrypt_users_sensitive_fields`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_users_wallet_hash"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_users_phone_hash"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_users_email_hash"`);
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "encryption_key_version"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "wallet_address_hash"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "wallet_address_encrypted"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "phone_number_hash"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "phone_number_encrypted"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "email_hash"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "email_encrypted"`,
    );
  }
}
