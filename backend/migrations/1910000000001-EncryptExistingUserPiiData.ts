import { MigrationInterface, QueryRunner } from 'typeorm';
import { EncryptionService } from '../src/common/services/encryption.service';
import { ConfigService } from '@nestjs/config';

export class EncryptExistingUserPiiData1910000000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Initialize config and encryption service
    const configService = new ConfigService();
    const encryptionService = new EncryptionService(configService);

    // Fetch all users with PII data
    const users = await queryRunner.query(`
      SELECT id, email, first_name, last_name, phone_number 
      FROM users 
      WHERE email IS NOT NULL OR first_name IS NOT NULL OR last_name IS NOT NULL OR phone_number IS NOT NULL
    `);

    for (const user of users) {
      try {
        // Encrypt email
        if (user.email && !user.email_encrypted) {
          const encryptedEmail = await encryptionService.encrypt(user.email);
          const emailBuffer = Buffer.from(encryptedEmail);
          await queryRunner.query(
            `UPDATE users SET email_encrypted = $1 WHERE id = $2`,
            [emailBuffer, user.id]
          );
        }

        // Encrypt first name
        if (user.first_name && !user.first_name_encrypted) {
          const encryptedFirstName = await encryptionService.encrypt(user.first_name);
          const firstNameBuffer = Buffer.from(encryptedFirstName);
          await queryRunner.query(
            `UPDATE users SET first_name_encrypted = $1 WHERE id = $2`,
            [firstNameBuffer, user.id]
          );
        }

        // Encrypt last name
        if (user.last_name && !user.last_name_encrypted) {
          const encryptedLastName = await encryptionService.encrypt(user.last_name);
          const lastNameBuffer = Buffer.from(encryptedLastName);
          await queryRunner.query(
            `UPDATE users SET last_name_encrypted = $1 WHERE id = $2`,
            [lastNameBuffer, user.id]
          );
        }

        // Encrypt phone number
        if (user.phone_number && !user.phone_number_encrypted) {
          const encryptedPhone = await encryptionService.encrypt(user.phone_number);
          const phoneBuffer = Buffer.from(encryptedPhone);
          await queryRunner.query(
            `UPDATE users SET phone_number_encrypted = $1 WHERE id = $2`,
            [phoneBuffer, user.id]
          );
        }

        // Update encryption key version
        await queryRunner.query(
          `UPDATE users SET encryption_key_version = 1 WHERE id = $1`,
          [user.id]
        );
      } catch (error) {
        console.error(`Failed to encrypt PII for user ${user.id}:`, error);
        // Continue with next user instead of failing entire migration
      }
    }
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // No-op: cannot decrypt without original keys
    // Encrypted data remains in place
  }
}
