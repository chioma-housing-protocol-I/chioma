import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Kyc } from './kyc.entity';
import { KycStatus } from './kyc-status.enum';
import { User, UserRole } from '../users/entities/user.entity';
import { UserKycStatusService } from '../users/user-kyc-status.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditService } from '../audit/audit.service';
import {
  AuditAction,
  AuditLevel,
  AuditStatus,
} from '../audit/entities/audit-log.entity';
import { hashKycPayload } from './kyc-encryption.util';

/**
 * True when a KYC provider failure is a timeout, which is the only failure
 * class we degrade gracefully. Data errors still surface to the caller.
 */
export function isKycTimeoutError(error: unknown): boolean {
  if (!error) {
    return false;
  }
  const candidate = error as {
    name?: string;
    code?: string;
    message?: string;
  };
  if (
    candidate.name === 'TimeoutError' ||
    candidate.name === 'ExternalCallTimeoutError' ||
    candidate.code === 'EXT_6002' ||
    candidate.code === 'NET_7002'
  ) {
    return true;
  }
  return /timed?\s*out|timeout/i.test(candidate.message ?? '');
}

/**
 * Fallback queue for KYC verification timeouts. A timed-out submission is
 * persisted as MANUAL_REVIEW, the user is told the decision is pending a
 * human check, and every admin is notified so the queue is actually worked.
 */
@Injectable()
export class KycManualReviewService {
  private readonly logger = new Logger(KycManualReviewService.name);

  constructor(
    @InjectRepository(Kyc)
    private readonly kycRepository: Repository<Kyc>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly userKycStatusService: UserKycStatusService,
    private readonly notificationsService: NotificationsService,
    private readonly auditService: AuditService,
  ) {}

  async queueForManualReview(
    userId: string,
    kycData: Record<string, unknown>,
    documentHash: string | null,
    reason: string,
    providerReference?: string,
  ): Promise<Kyc> {
    this.logger.warn(
      `Queuing KYC for manual review for user ${userId}: ${reason}`,
    );

    // The payload was already encrypted by the caller; only its checksum is
    // needed in the queue record so no additional sensitive data is stored.
    const record = this.kycRepository.create({
      userId,
      encryptedKycData: null,
      documentHash: documentHash ?? hashKycPayload(kycData),
      status: KycStatus.MANUAL_REVIEW,
      providerReference: providerReference ?? null,
      reason: `Manual review: ${reason}`,
    });
    const saved = await this.kycRepository.save(record);

    await this.userKycStatusService.setStatus(userId, KycStatus.MANUAL_REVIEW);

    await this.notificationsService.notify(
      userId,
      'Verification in manual review',
      'Your identity check is taking longer than expected. A reviewer will finish it shortly.',
      'KYC_MANUAL_REVIEW',
    );

    await this.notifyAdmins(userId, saved.id, reason);

    await this.auditService.log({
      action: AuditAction.KYC_MANUAL_REVIEW_QUEUED,
      entityType: 'Kyc',
      entityId: saved.id,
      performedBy: userId,
      status: AuditStatus.SUCCESS,
      level: AuditLevel.SECURITY,
      metadata: { userId, reason },
    });

    return saved;
  }

  private async notifyAdmins(
    userId: string,
    kycId: string,
    reason: string,
  ): Promise<void> {
    const admins = await this.userRepository.find({
      where: { role: In([UserRole.ADMIN, UserRole.SUPER_ADMIN]) },
    });

    await Promise.all(
      admins.map((admin) =>
        this.notificationsService.notify(
          admin.id,
          'Manual review: KYC verification timed out',
          `User ${userId} (verification ${kycId}) needs manual review. Reason: ${reason}`,
          'KYC_MANUAL_REVIEW',
        ),
      ),
    );
  }
}
