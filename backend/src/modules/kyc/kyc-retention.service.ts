import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, LessThanOrEqual, Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { Kyc } from './kyc.entity';
import { KycStatus } from './kyc-status.enum';
import { AuditService } from '../audit/audit.service';
import {
  AuditAction,
  AuditLevel,
  AuditStatus,
} from '../audit/entities/audit-log.entity';
import { computeRetentionCutoff } from './kyc-retention.config';

const DECIDED_STATUSES: KycStatus[] = [KycStatus.APPROVED, KycStatus.REJECTED];

/**
 * Purges raw KYC documents once their retention window (post-decision) has
 * elapsed. The decision (status/reason/providerReference) and the
 * non-reversible `documentHash` are kept - only `encryptedKycData` is
 * cleared - and every purge is recorded in the audit log.
 */
@Injectable()
export class KycRetentionService {
  private readonly logger = new Logger(KycRetentionService.name);

  constructor(
    @InjectRepository(Kyc)
    private readonly kycRepository: Repository<Kyc>,
    private readonly auditService: AuditService,
    private readonly configService: ConfigService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async purgeExpiredDocuments(): Promise<{ purged: number; errors: number }> {
    const cutoff = computeRetentionCutoff(new Date(), this.configService);

    const candidates = await this.kycRepository.find({
      where: {
        status: In(DECIDED_STATUSES),
        updatedAt: LessThanOrEqual(cutoff),
        documentPurgedAt: IsNull(),
      },
    });

    let purged = 0;
    let errors = 0;

    for (const kyc of candidates) {
      try {
        await this.purgeOne(kyc);
        purged++;
      } catch (error) {
        errors++;
        this.logger.error(
          `Failed to purge KYC document ${kyc.id}`,
          error instanceof Error ? error.stack : String(error),
        );
      }
    }

    if (purged > 0 || errors > 0) {
      this.logger.log(
        `KYC document retention sweep: ${purged} purged, ${errors} errors (cutoff ${cutoff.toISOString()})`,
      );
    }

    return { purged, errors };
  }

  private async purgeOne(kyc: Kyc): Promise<void> {
    kyc.encryptedKycData = null;
    kyc.documentPurgedAt = new Date();
    await this.kycRepository.save(kyc);

    await this.auditService.log({
      action: AuditAction.KYC_DOCUMENT_PURGED,
      entityType: 'Kyc',
      entityId: kyc.id,
      // System-initiated (scheduled job), not a specific admin/user action.
      status: AuditStatus.SUCCESS,
      level: AuditLevel.SECURITY,
      metadata: {
        userId: kyc.userId,
        decisionStatus: kyc.status,
        documentHash: kyc.documentHash,
        purgedBy: 'system:kyc-retention-sweep',
      },
    });
  }
}
