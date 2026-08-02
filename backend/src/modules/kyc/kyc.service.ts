import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Kyc } from './kyc.entity';
import { SubmitKycDto, KycWebhookDto, AdminKycQueryDto } from './kyc.dto';
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
import { UserKycStatusService } from '../users/user-kyc-status.service';
import { KycStatus } from './kyc-status.enum';
import { NotificationsService } from '../notifications/notifications.service';
import { User } from '../users/entities/user.entity';

export interface AdminKycUserView {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  role?: string;
}

export interface AdminKycView {
  id: string;
  userId: string;
  status: KycStatus;
  reason?: string;
  providerReference?: string;
  createdAt: Date;
  updatedAt: Date;
  user?: AdminKycUserView;
  kycData?: Record<string, unknown>;
  documents: [];
}

export interface PaginatedAdminKycResult {
  data: AdminKycView[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class KycService {
  private readonly logger = new Logger(KycService.name);

  constructor(
    @InjectRepository(Kyc)
    private readonly kycRepository: Repository<Kyc>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly userKycStatusService: UserKycStatusService,
    private readonly encryptionService: EncryptionService,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
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

      await this.userKycStatusService.setStatus(userId, KycStatus.PENDING);
      const savedKyc = await this.kycRepository.save(kyc);

      await this.notificationsService.notify(
        userId,
        'KYC submitted',
        'Your verification documents were submitted and are under review.',
        'KYC_SUBMITTED',
      );

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
    await this.userKycStatusService.setStatus(kyc.userId, dto.status);

    if (dto.status === KycStatus.APPROVED) {
      await this.notificationsService.notify(
        kyc.userId,
        'KYC approved',
        'Your identity verification has been approved.',
        'KYC_APPROVED',
      );
      return;
    }

    if (dto.status === KycStatus.REJECTED) {
      await this.notificationsService.notify(
        kyc.userId,
        'KYC rejected',
        'Your verification was rejected. Please review and resubmit.',
        'KYC_REJECTED',
      );
      return;
    }

    await this.notificationsService.notify(
      kyc.userId,
      'KYC status updated',
      `Your KYC status is now ${dto.status}.`,
      'KYC_UPDATED',
    );
  }

  async findPendingForAdmin(
    query: AdminKycQueryDto,
  ): Promise<PaginatedAdminKycResult> {
    return this.findByStatusForAdmin(KycStatus.PENDING, query);
  }

  async findRejectedForAdmin(
    query: AdminKycQueryDto,
  ): Promise<PaginatedAdminKycResult> {
    return this.findByStatusForAdmin(KycStatus.REJECTED, query);
  }

  async findByIdForAdmin(id: string): Promise<AdminKycView> {
    const kyc = await this.kycRepository.findOne({ where: { id } });
    if (!kyc) {
      throw new NotFoundException('KYC verification not found');
    }
    const user = await this.userRepository.findOne({
      where: { id: kyc.userId },
    });
    return this.toAdminView(kyc, user ?? undefined);
  }

  async approveKyc(
    id: string,
    adminId: string,
    reason?: string,
  ): Promise<AdminKycView> {
    const kyc = await this.kycRepository.findOne({ where: { id } });
    if (!kyc) {
      throw new NotFoundException('KYC verification not found');
    }

    if (kyc.status === KycStatus.APPROVED) {
      const user = await this.userRepository.findOne({
        where: { id: kyc.userId },
      });
      return this.toAdminView(kyc, user ?? undefined);
    }

    const previousStatus = kyc.status;
    kyc.status = KycStatus.APPROVED;
    kyc.reason = reason ?? null;
    const saved = await this.kycRepository.save(kyc);

    await this.userKycStatusService.setStatus(kyc.userId, KycStatus.APPROVED);

    await this.auditService.log({
      action: AuditAction.KYC_APPROVED,
      entityType: 'Kyc',
      entityId: saved.id,
      performedBy: adminId,
      status: AuditStatus.SUCCESS,
      level: AuditLevel.SECURITY,
      oldValues: { status: previousStatus },
      newValues: { status: KycStatus.APPROVED },
      metadata: { userId: kyc.userId },
    });

    await this.notificationsService.notify(
      kyc.userId,
      'KYC approved',
      'Your identity verification has been approved.',
      'KYC_APPROVED',
    );

    const user = await this.userRepository.findOne({
      where: { id: kyc.userId },
    });
    return this.toAdminView(saved, user ?? undefined);
  }

  async rejectKyc(
    id: string,
    adminId: string,
    reason?: string,
  ): Promise<AdminKycView> {
    const kyc = await this.kycRepository.findOne({ where: { id } });
    if (!kyc) {
      throw new NotFoundException('KYC verification not found');
    }

    if (kyc.status === KycStatus.REJECTED) {
      const user = await this.userRepository.findOne({
        where: { id: kyc.userId },
      });
      return this.toAdminView(kyc, user ?? undefined);
    }

    const previousStatus = kyc.status;
    kyc.status = KycStatus.REJECTED;
    kyc.reason = reason ?? null;
    const saved = await this.kycRepository.save(kyc);

    await this.userKycStatusService.setStatus(kyc.userId, KycStatus.REJECTED);

    await this.auditService.log({
      action: AuditAction.KYC_REJECTED,
      entityType: 'Kyc',
      entityId: saved.id,
      performedBy: adminId,
      status: AuditStatus.SUCCESS,
      level: AuditLevel.SECURITY,
      oldValues: { status: previousStatus },
      newValues: { status: KycStatus.REJECTED, reason: saved.reason },
      metadata: { userId: kyc.userId },
    });

    await this.notificationsService.notify(
      kyc.userId,
      'KYC rejected',
      reason
        ? `Your verification was rejected: ${reason}`
        : 'Your verification was rejected. Please review and resubmit.',
      'KYC_REJECTED',
    );

    const user = await this.userRepository.findOne({
      where: { id: kyc.userId },
    });
    return this.toAdminView(saved, user ?? undefined);
  }

  private async findByStatusForAdmin(
    status: KycStatus,
    query: AdminKycQueryDto,
  ): Promise<PaginatedAdminKycResult> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const sortBy = query.sortBy ?? 'createdAt';
    const sortOrder = (query.sortOrder ?? 'desc').toUpperCase() as
      | 'ASC'
      | 'DESC';

    const qb = this.kycRepository
      .createQueryBuilder('kyc')
      .leftJoin(User, 'user', 'user.id = kyc.userId')
      .where('kyc.status = :status', { status });

    if (query.search) {
      qb.andWhere(
        '(user.email ILIKE :search OR user.firstName ILIKE :search OR user.lastName ILIKE :search OR CAST(kyc.userId AS TEXT) ILIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    qb.orderBy(`kyc.${sortBy}`, sortOrder)
      .skip((page - 1) * limit)
      .take(limit);

    const [rows, total] = await qb.getManyAndCount();
    const data = await this.toAdminViewList(rows);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.max(Math.ceil(total / limit), 1),
    };
  }

  private async toAdminViewList(rows: Kyc[]): Promise<AdminKycView[]> {
    if (rows.length === 0) {
      return [];
    }

    const userIds = [...new Set(rows.map((row) => row.userId))];
    const users = await this.userRepository.find({
      where: { id: In(userIds) },
    });
    const usersById = new Map(users.map((user) => [user.id, user]));

    return rows.map((row) => this.toAdminView(row, usersById.get(row.userId)));
  }

  private toAdminView(kyc: Kyc, user?: User): AdminKycView {
    const kycData = kyc.encryptedKycData
      ? this.decryptKycData(kyc.userId, kyc.encryptedKycData)
      : undefined;

    return {
      id: kyc.id,
      userId: kyc.userId,
      status: kyc.status,
      reason: kyc.reason ?? undefined,
      providerReference: kyc.providerReference ?? undefined,
      createdAt: kyc.createdAt,
      updatedAt: kyc.updatedAt,
      user: user
        ? {
            id: user.id,
            name:
              [user.firstName, user.lastName].filter(Boolean).join(' ') ||
              undefined,
            email: user.email ?? undefined,
            phone: user.phoneNumber ?? undefined,
            role: user.role,
          }
        : undefined,
      kycData,
      documents: [],
    };
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
