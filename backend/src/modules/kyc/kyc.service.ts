import { Injectable, Inject, forwardRef, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Kyc, KycStatus } from './kyc.entity';
import { SubmitKycDto, KycWebhookDto } from './kyc.dto';
import { UsersService } from '../users/users.service';
import { EncryptionService } from '../security/encryption.service';

@Injectable()
export class KycService {
  private readonly logger = new Logger(KycService.name);

  constructor(
    @InjectRepository(Kyc)
    private readonly kycRepository: Repository<Kyc>,
    @Inject(forwardRef(() => UsersService))
    private readonly usersService: UsersService,
    private readonly encryptionService: EncryptionService,
  ) {}

  async submitKyc(userId: string, dto: SubmitKycDto): Promise<Kyc> {
    try {
      this.logger.log(`Submitting KYC for user ${userId}`);

      // Encrypt KYC data before saving
      const encryptedKycData = this.encryptKycData(dto.kycData);

      const kyc = this.kycRepository.create({
        userId,
        encryptedKycData,
        status: KycStatus.PENDING,
      });

      await this.usersService.setKycStatus(userId, KycStatus.PENDING);
      const savedKyc = await this.kycRepository.save(kyc);

      this.logger.log(`KYC submitted successfully for user ${userId}`);
      return savedKyc;
    } catch (error) {
      this.logger.error(`Failed to submit KYC for user ${userId}`, error);
      throw error;
    }
  }

  async getKycStatus(userId: string): Promise<Kyc | null> {
    try {
      const kyc = await this.kycRepository.findOne({ where: { userId } });

      if (kyc && kyc.encryptedKycData) {
        // Decrypt KYC data for retrieval
        kyc.encryptedKycData = this.decryptKycData(kyc.encryptedKycData);
      }

      return kyc;
    } catch (error) {
      this.logger.error(`Failed to get KYC status for user ${userId}`, error);
      throw error;
    }
  }

  async handleWebhook(dto: KycWebhookDto): Promise<void> {
    const kyc = await this.kycRepository.findOne({
      where: { providerReference: dto.providerReference },
    });
    if (!kyc) return;
    kyc.status = dto.status;
    await this.kycRepository.save(kyc);
    await this.usersService.setKycStatus(kyc.userId, dto.status);
  }

  /**
   * Encrypts KYC data using AES-256-GCM encryption.
   * Sensitive fields are encrypted individually to maintain field-level security.
   */
  private encryptKycData(data: Record<string, any>): Record<string, any> {
    try {
      const sensitiveFields = [
        'first_name',
        'last_name',
        'date_of_birth',
        'address',
        'city',
        'state',
        'postal_code',
        'country',
        'id_number',
        'tax_id',
        'phone_number',
        'bank_account_number',
        'bank_routing_number',
      ];

      const encryptedData: Record<string, any> = { ...data };

      for (const field of sensitiveFields) {
        if (encryptedData[field]) {
          const value = String(encryptedData[field]);
          encryptedData[field] = this.encryptionService.encrypt(value);
        }
      }

      this.logger.debug('KYC data encrypted successfully');
      return encryptedData;
    } catch (error) {
      this.logger.error('Failed to encrypt KYC data', error);
      throw error;
    }
  }

  /**
   * Decrypts KYC data that was encrypted with AES-256-GCM.
   * Returns the original plaintext values for sensitive fields.
   */
  private decryptKycData(data: Record<string, any>): Record<string, any> {
    try {
      const sensitiveFields = [
        'first_name',
        'last_name',
        'date_of_birth',
        'address',
        'city',
        'state',
        'postal_code',
        'country',
        'id_number',
        'tax_id',
        'phone_number',
        'bank_account_number',
        'bank_routing_number',
      ];

      const decryptedData: Record<string, any> = { ...data };

      for (const field of sensitiveFields) {
        if (decryptedData[field] && typeof decryptedData[field] === 'string') {
          try {
            decryptedData[field] = this.encryptionService.decrypt(
              decryptedData[field],
            );
          } catch (error) {
            this.logger.warn(
              `Failed to decrypt field ${field}, keeping encrypted`,
            );
            // Keep the encrypted value if decryption fails
          }
        }
      }

      this.logger.debug('KYC data decrypted successfully');
      return decryptedData;
    } catch (error) {
      this.logger.error('Failed to decrypt KYC data', error);
      throw error;
    }
  }
}
