import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  AuditLog,
  AuditAction,
  AuditStatus,
  AuditLevel,
} from '../../audit/entities/audit-log.entity';
import { requestContext } from '../../../common/request-context/request-context';

export interface AnalyticsJobData {
  type:
    | 'track-view'
    | 'track-search'
    | 'track-listing-browse'
    | 'track-analytics-query'
    | 'track-payment-event'
    | 'track-user-activity';
  entityId?: string;
  entityType?: string;
  userId?: string;
  metadata?: Record<string, unknown>;
  correlationId?: string;
  requestId?: string;
}

@Processor('analytics')
export class AnalyticsQueueProcessor {
  private readonly logger = new Logger(AnalyticsQueueProcessor.name);

  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
  ) {}

  @Process()
  async handleAnalyticsJob(job: Job<AnalyticsJobData>): Promise<void> {
    const correlationId = job.data?.correlationId || job.data?.requestId;
    const requestId = job.data?.requestId || correlationId;
    const userId = job.data?.userId;

    return requestContext.run({ correlationId, requestId, userId }, async () => {
      this.logger.debug(`Processing analytics job ${job.id}: ${job.data.type}`);

      try {
        switch (job.data.type) {
          case 'track-view':
            await this.trackView(job.data);
            break;
          case 'track-search':
            await this.trackSearch(job.data);
            break;
          case 'track-listing-browse':
            await this.trackListingBrowse(job.data);
            break;
          case 'track-analytics-query':
            await this.trackAnalyticsQuery(job.data);
            break;
          case 'track-payment-event':
            await this.trackPaymentEvent(job.data);
            break;
          case 'track-user-activity':
            await this.trackUserActivity(job.data);
            break;
          default:
            throw new Error(`Unknown analytics type: ${String(job.data.type)}`);
        }

        this.logger.debug(`Analytics job ${job.id} completed`);
      } catch (error) {
        this.logger.error(
          `Analytics job ${job.id} failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          error instanceof Error ? error.stack : '',
        );
        throw error;
      }
    });
  }

  private async trackView(data: AnalyticsJobData): Promise<void> {
    await this.auditLogRepository.save(
      this.auditLogRepository.create({
        action: AuditAction.DATA_ACCESS,
        entity_type: 'property',
        entity_id: data.entityId,
        performed_by: data.userId,
        status: AuditStatus.SUCCESS,
        level: AuditLevel.INFO,
        metadata: { ...data.metadata, analyticsEvent: 'property.view' },
      }),
    );
  }

  private async trackSearch(data: AnalyticsJobData): Promise<void> {
    await this.auditLogRepository.save(
      this.auditLogRepository.create({
        action: AuditAction.DATA_ACCESS,
        entity_type: 'search',
        performed_by: data.userId,
        status: AuditStatus.SUCCESS,
        level: AuditLevel.INFO,
        metadata: { ...data.metadata, analyticsEvent: 'search.execute' },
      }),
    );
  }

  private async trackListingBrowse(data: AnalyticsJobData): Promise<void> {
    await this.auditLogRepository.save(
      this.auditLogRepository.create({
        action: AuditAction.DATA_ACCESS,
        entity_type: 'property',
        performed_by: data.userId,
        status: AuditStatus.SUCCESS,
        level: AuditLevel.INFO,
        metadata: { ...data.metadata, analyticsEvent: 'listing.browse' },
      }),
    );
  }

  private async trackAnalyticsQuery(data: AnalyticsJobData): Promise<void> {
    await this.auditLogRepository.save(
      this.auditLogRepository.create({
        action: AuditAction.DATA_ACCESS,
        entity_type: 'analytics',
        performed_by: data.userId,
        status: AuditStatus.SUCCESS,
        level: AuditLevel.INFO,
        metadata: { ...data.metadata, analyticsEvent: 'analytics.query' },
      }),
    );
  }

  private async trackPaymentEvent(data: AnalyticsJobData): Promise<void> {
    const action = (data.metadata?.action as AuditAction) ?? AuditAction.PAYMENT_COMPLETED;
    await this.auditLogRepository.save(
      this.auditLogRepository.create({
        action,
        entity_type: 'payment',
        entity_id: data.entityId,
        performed_by: data.userId,
        status: AuditStatus.SUCCESS,
        level: AuditLevel.INFO,
        metadata: { ...data.metadata, analyticsEvent: 'payment.event' },
      }),
    );
  }

  private async trackUserActivity(data: AnalyticsJobData): Promise<void> {
    const action = (data.metadata?.action as AuditAction) ?? AuditAction.CREATE;
    await this.auditLogRepository.save(
      this.auditLogRepository.create({
        action,
        entity_type: (data.entityType as string) ?? 'user',
        entity_id: data.entityId,
        performed_by: data.userId,
        status: AuditStatus.SUCCESS,
        level: AuditLevel.INFO,
        metadata: { ...data.metadata, analyticsEvent: 'user.activity' },
      }),
    );
  }
}
