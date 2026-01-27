import { SetMetadata } from '@nestjs/common';
import { AuditLevel } from '../entities/audit-log.entity';

export const AUDIT_LOG_KEY = 'audit_log';

export interface AuditLogOptions {
  action: string;
  entityType: string;
  level?: AuditLevel;
  includeOldValues?: boolean;
  includeNewValues?: boolean;
  sensitive?: boolean;
}

export const AuditLog = (options: AuditLogOptions) =>
  SetMetadata(AUDIT_LOG_KEY, options);
