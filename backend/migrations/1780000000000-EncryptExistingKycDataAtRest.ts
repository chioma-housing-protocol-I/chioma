import { MigrationInterface, QueryRunner } from 'typeorm';
import { Kyc } from '../src/modules/kyc/kyc.entity';
import { EncryptionService } from '../src/modules/security/encryption.service';
import { ConfigService } from '@nestjs/config';

export class EncryptExistingKycDataAtRest implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Initialize config and encryption service
    const configService = new ConfigService();
    const encryptionService = new EncryptionService(configService);

    // Fetch all KYC records
    const kycs: Kyc[] = await queryRunner.manager.find(Kyc);

    for (const kyc of kycs) {
      if (kyc.encryptedKycData && typeof kyc.encryptedKycData === 'object') {
        // Encrypt the KYC data if not already encrypted (simple check)
        if (typeof Object.values(kyc.encryptedKycData)[0] !== 'string') {
          const encrypted = encryptionService.encrypt(
            JSON.stringify(kyc.encryptedKycData),
          );
          kyc.encryptedKycData = JSON.parse(encrypted) as Record<string, any>;
          kyc.encryptionVersion = 1;
          await queryRunner.manager.save(kyc);
        }
      }
    }
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // No-op: cannot decrypt without original keys
  }
}
