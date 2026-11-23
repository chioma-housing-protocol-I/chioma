import { Injectable } from '@nestjs/common';
import { AuditService } from './audit.service';
import { QueryAuditLogsDto } from './dto/query-audit-logs.dto';
import {
  AuditAction,
  AuditLevel,
  AuditStatus,
} from './entities/audit-log.entity';

export interface BusinessEventData {
  action: AuditAction;
  actorId: string;
  resourceType: string;
  resourceId: string;
  before?: unknown;
  after?: unknown;
  reason?: string;
  ipAddress?: string;
  userAgent?: string;
  level?: AuditLevel;
}

export type BusinessEventFilters = Partial<QueryAuditLogsDto>;

/**
 * Business-level view of the audit trail. Every state-changing action is
 * written through AuditService so it lands in the same immutable, timestamped
 * store as the rest of the audit log, with a stable marker for querying.
 */
@Injectable()
export class BusinessEventService {
  constructor(private readonly auditService: AuditService) {}

  async recordStateChange(event: BusinessEventData): Promise<void> {
    await this.auditService.log({
      action: event.action,
      entityType: event.resourceType,
      entityId: event.resourceId,
      oldValues: event.before,
      newValues: event.after,
      performedBy: event.actorId,
      ipAddress: event.ipAddress,
      userAgent: event.userAgent,
      status: AuditStatus.SUCCESS,
      level: event.level ?? AuditLevel.INFO,
      metadata: {
        businessEvent: true,
        eventType: 'STATE_CHANGE',
        occurredAt: Date.now(),
        reason: event.reason,
      },
    });
  }

  async query(filters: BusinessEventFilters) {
    return this.auditService.query({
      ...filters,
      businessEventsOnly: true,
    });
  }
}
