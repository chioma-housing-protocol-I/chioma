import { MigrationInterface, QueryRunner } from 'typeorm';

export class EnablePgStatStatements1900000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Enable pg_stat_statements extension if it exists
    // Note: This usually requires pg_stat_statements to be in shared_preload_libraries
    // which is a server-level setting. However, creating the extension is still necessary.
    await queryRunner.query(
      `CREATE EXTENSION IF NOT EXISTS pg_stat_statements`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP EXTENSION IF EXISTS pg_stat_statements`);
  }
}
