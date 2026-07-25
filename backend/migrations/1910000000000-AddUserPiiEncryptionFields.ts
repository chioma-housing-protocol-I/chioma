import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserPiiEncryptionFields1910000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add encrypted columns for firstName and lastName
    await queryRunner.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS first_name_encrypted ${process.env.DB_TYPE === 'sqlite' ? 'BLOB' : 'BYTEA'}
    `);
    
    await queryRunner.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS last_name_encrypted ${process.env.DB_TYPE === 'sqlite' ? 'BLOB' : 'BYTEA'}
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE users DROP COLUMN IF EXISTS first_name_encrypted
    `);
    
    await queryRunner.query(`
      ALTER TABLE users DROP COLUMN IF EXISTS last_name_encrypted
    `);
  }
}
