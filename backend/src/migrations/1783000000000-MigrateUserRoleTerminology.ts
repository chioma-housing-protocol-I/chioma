import { MigrationInterface, QueryRunner } from 'typeorm';

export class MigrateUserRoleTerminology1783000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Migrate legacy 'landlord' and 'tenant' role values in the users table
    await queryRunner.query(`
      UPDATE "users"
      SET "role" = 'admin'
      WHERE "role" = 'landlord'
    `);

    await queryRunner.query(`
      UPDATE "users"
      SET "role" = 'user'
      WHERE "role" = 'tenant'
    `);

    // 2. Rename rent_agreements columns from landlord/tenant to admin/user
    const renameIfExists = async (
      table: string,
      oldCol: string,
      newCol: string,
    ) => {
      const [result] = await queryRunner.query(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = '${table}' AND column_name = '${oldCol}'
      `);
      if (result) {
        await queryRunner.query(
          `ALTER TABLE "${table}" RENAME COLUMN "${oldCol}" TO "${newCol}"`,
        );
      }
    };

    await renameIfExists('rent_agreements', 'landlord_id', 'admin_id');
    await renameIfExists('rent_agreements', 'tenant_id', 'user_id');
    await renameIfExists(
      'rent_agreements',
      'landlord_stellar_pub_key',
      'admin_stellar_pub_key',
    );
    await renameIfExists(
      'rent_agreements',
      'tenant_stellar_pub_key',
      'user_stellar_pub_key',
    );

    // 3. Rename stellar_payments columns
    await renameIfExists('stellar_payments', 'tenant_address', 'user_address');
    await renameIfExists(
      'stellar_payments',
      'landlord_address',
      'admin_address',
    );

    // 4. Rename index names on rent_agreements if they exist
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM pg_indexes
          WHERE tablename = 'rent_agreements'
            AND indexname = 'idx_rent_agreements_landlord_id'
        ) THEN
          ALTER INDEX "idx_rent_agreements_landlord_id"
            RENAME TO "idx_rent_agreements_admin_id";
        END IF;
        IF EXISTS (
          SELECT 1 FROM pg_indexes
          WHERE tablename = 'rent_agreements'
            AND indexname = 'idx_rent_agreements_tenant_id'
        ) THEN
          ALTER INDEX "idx_rent_agreements_tenant_id"
            RENAME TO "idx_rent_agreements_user_id";
        END IF;
      END $$
    `);

    // 5. Migrate SystemRole enum values in the roles table
    //    PostgreSQL enums cannot have values removed directly; we rename by
    //    rebuilding the type.
    await queryRunner.query(`
      UPDATE "roles"
      SET "system_role" = 'admin'
      WHERE "system_role" = 'landlord'
    `);

    await queryRunner.query(`
      UPDATE "roles"
      SET "system_role" = 'user'
      WHERE "system_role" = 'tenant'
    `);

    // Rebuild the enum without 'landlord' and 'tenant'
    await queryRunner.query(`
      ALTER TABLE "roles"
        ALTER COLUMN "system_role" TYPE varchar(50)
    `);

    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."roles_system_role_enum"`,
    );

    await queryRunner.query(`
      CREATE TYPE "public"."roles_system_role_enum"
        AS ENUM('super_admin', 'admin', 'user', 'auditor', 'support')
    `);

    await queryRunner.query(`
      ALTER TABLE "roles"
        ALTER COLUMN "system_role"
          TYPE "public"."roles_system_role_enum"
          USING "system_role"::"public"."roles_system_role_enum"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Restore enum with legacy values
    await queryRunner.query(`
      ALTER TABLE "roles"
        ALTER COLUMN "system_role" TYPE varchar(50)
    `);

    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."roles_system_role_enum"`,
    );

    await queryRunner.query(`
      CREATE TYPE "public"."roles_system_role_enum"
        AS ENUM('super_admin', 'admin', 'landlord', 'tenant', 'user', 'auditor', 'support')
    `);

    await queryRunner.query(`
      ALTER TABLE "roles"
        ALTER COLUMN "system_role"
          TYPE "public"."roles_system_role_enum"
          USING "system_role"::"public"."roles_system_role_enum"
    `);

    // Restore column names
    const renameIfExists = async (
      table: string,
      oldCol: string,
      newCol: string,
    ) => {
      const [result] = await queryRunner.query(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = '${table}' AND column_name = '${oldCol}'
      `);
      if (result) {
        await queryRunner.query(
          `ALTER TABLE "${table}" RENAME COLUMN "${oldCol}" TO "${newCol}"`,
        );
      }
    };

    await renameIfExists('rent_agreements', 'admin_id', 'landlord_id');
    await renameIfExists('rent_agreements', 'user_id', 'tenant_id');
    await renameIfExists(
      'rent_agreements',
      'admin_stellar_pub_key',
      'landlord_stellar_pub_key',
    );
    await renameIfExists(
      'rent_agreements',
      'user_stellar_pub_key',
      'tenant_stellar_pub_key',
    );
    await renameIfExists('stellar_payments', 'user_address', 'tenant_address');
    await renameIfExists(
      'stellar_payments',
      'admin_address',
      'landlord_address',
    );

    // Restore role values (best-effort — original assignment is ambiguous)
    await queryRunner.query(`
      UPDATE "roles"
      SET "system_role" = 'landlord'
      WHERE "system_role" = 'admin'
        AND "name" = 'landlord'
    `);

    await queryRunner.query(`
      UPDATE "roles"
      SET "system_role" = 'tenant'
      WHERE "system_role" = 'user'
        AND "name" = 'tenant'
    `);
  }
}
