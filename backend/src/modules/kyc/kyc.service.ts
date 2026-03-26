import { Injectable, Inject, forwardRef, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Kyc, KycStatus } from './kyc.entity';
import { SubmitKycDto, KycWebhookDto } from './kyc.dto';
import { UsersService } from '../users/users.service';
import { EncryptionService } from '../security/encryption.service';
import { AuditService } from '../audit/audit.service';
import {
  AuditAction,
  AuditLevel,
  AuditStatus,
} from '../audit/entities/audit-log.entity';
import {
  decryptSensitiveKycFields,
  encryptSensitiveKycFields,
} from './kyc-encryption.util';

@Injectable()
export class KycService {
  private readonly logger = new Logger(KycService.name);

  constructor(
    @InjectRepository(Kyc)
    private readonly kycRepository: Repository<Kyc>,
    @Inject(forwardRef(() => UsersService))
    private readonly usersService: UsersService,
    private readonly encryptionService: EncryptionService,
    private readonly auditService: AuditService,
  ) {}

  async submitKyc(userId: string, dto: SubmitKycDto): Promise<Kyc> {
    try {
      this.logger.log(`Submitting KYC for user ${userId}`);

      const encryptedKycData = this.encryptKycData(userId, dto.kycData);

      const kyc = this.kycRepository.create({
        userId,
        encryptedKycData,
        status: KycStatus.PENDING,
      });

      await this.usersService.setKycStatus(userId, KycStatus.PENDING);
      const savedKyc = await this.kycRepository.save(kyc);

      await this.auditService.log({
        action: AuditAction.KYC_SUBMITTED,
        entityType: 'Kyc',
        entityId: savedKyc.id,
        performedBy: userId,
        status: AuditStatus.SUCCESS,
        level: AuditLevel.SECURITY,
        metadata: { userId },
      });

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
        kyc.encryptedKycData = this.decryptKycData(
          userId,
          kyc.encryptedKycData,
        );
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

  private encryptKycData(
    userId: string,
    data: Record<string, unknown>,
  ): Record<string, unknown> {
    try {
      const encryptedData = encryptSensitiveKycFields(
        data,
        this.encryptionService,
      );

      const encryptedFields = Object.keys(data).filter(
        (field) => encryptedData[field] !== data[field],
      );

      void this.auditService.log({
        action: AuditAction.KYC_ENCRYPTED,
        entityType: 'Kyc',
        entityId: userId,
        performedBy: userId,
        status: AuditStatus.SUCCESS,
        level: AuditLevel.SECURITY,
        metadata: { userId, fieldsEncrypted: encryptedFields.length },
      });

      this.logger.debug('KYC data encrypted successfully');
      return encryptedData;
    } catch (error) {
      void this.auditService.log({
        action: AuditAction.KYC_ENCRYPTED,
        entityType: 'Kyc',
        entityId: userId,
        performedBy: userId,
        status: AuditStatus.FAILURE,
        level: AuditLevel.ERROR,
        errorMessage: error instanceof Error ? error.message : String(error),
        metadata: { userId },
      });
      this.logger.error('Failed to encrypt KYC data', error);
      throw error;
    }
  }

  private decryptKycData(
    userId: string,
    data: Record<string, unknown>,
  ): Record<string, unknown> {
    try {
      const decryptedData = decryptSensitiveKycFields(
        data,
        this.encryptionService,
      );

      const decryptedFields = Object.keys(data).filter(
        (field) => decryptedData[field] !== data[field],
      );

      void this.auditService.log({
        action: AuditAction.KYC_DECRYPTED,
        entityType: 'Kyc',
        entityId: userId,
        performedBy: userId,
        status: AuditStatus.SUCCESS,
        level: AuditLevel.SECURITY,
        metadata: { userId, fieldsDecrypted: decryptedFields.length },
      });

      this.logger.debug('KYC data decrypted successfully');
      return decryptedData;
    } catch (error) {
      void this.auditService.log({
        action: AuditAction.KYC_DECRYPTED,
        entityType: 'Kyc',
        entityId: userId,
        performedBy: userId,
        status: AuditStatus.FAILURE,
        level: AuditLevel.ERROR,
        errorMessage: error instanceof Error ? error.message : String(error),
        metadata: { userId },
      });
      this.logger.error('Failed to decrypt KYC data', error);
      throw error;
    }
  }
}
