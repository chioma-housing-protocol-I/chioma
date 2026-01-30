import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import {
  AuditLog,
  AuditAction,
  AuditStatus,
  AuditLevel,
} from './entities/audit-log.entity';
import { QueryAuditLogsDto } from './dto/query-audit-logs.dto';
import { User } from '../users/entities/user.entity';

export interface AuditLogData {
  action: AuditAction;
  entityType?: string;
  entityId?: string;
  oldValues?: any;
  newValues?: any;
  performedBy?: string;
  ipAddress?: string;
  userAgent?: string;
  status?: AuditStatus;
  level?: AuditLevel;
  errorMessage?: string;
  metadata?: any;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectRepository(AuditLog)
    private auditLogRepository: Repository<AuditLog>,
  ) {}

  async log(auditLogData: AuditLogData): Promise<void> {
    try {
      const auditLog = this.auditLogRepository.create({
        action: auditLogData.action,
        entity_type: auditLogData.entityType,
        entity_id: auditLogData.entityId,
        old_values: auditLogData.oldValues,
        new_values: auditLogData.newValues,
        performed_by: auditLogData.performedBy,
        ip_address: auditLogData.ipAddress,
        user_agent: auditLogData.userAgent,
        status: auditLogData.status || AuditStatus.SUCCESS,
        level: auditLogData.level || AuditLevel.INFO,
        error_message: auditLogData.errorMessage,
        metadata: auditLogData.metadata,
      });

      await this.auditLogRepository.save(auditLog);
      this.logger.debug(
        `Audit log created: ${auditLog.action} on ${auditLog.entity_type}:${auditLog.entity_id}`,
      );
    } catch (error) {
      this.logger.error('Failed to create audit log', error);
    }
  }

  async logSuccess(
    action: AuditAction,
    entityType: string,
    entityId: string,
    performedBy?: string,
    oldValues?: any,
    newValues?: any,
    metadata?: any,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    await this.log({
      action,
      entityType,
      entityId,
      oldValues,
      newValues,
      performedBy,
      ipAddress,
      userAgent,
      status: AuditStatus.SUCCESS,
      metadata,
    });
  }

  async logFailure(
    action: AuditAction,
    entityType: string,
    entityId: string,
    errorMessage: string,
    performedBy?: string,
    metadata?: any,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    await this.log({
      action,
      entityType,
      entityId,
      errorMessage,
      performedBy,
      ipAddress,
      userAgent,
      status: AuditStatus.FAILURE,
      metadata,
    });
  }

  async logUserAction(
    action: AuditAction,
    user: User,
    ipAddress?: string,
    userAgent?: string,
    metadata?: any,
  ): Promise<void> {
    await this.log({
      action,
      entityType: 'User',
      entityId: user.id,
      performedBy: user.id,
      ipAddress,
      userAgent,
      metadata: {
        userEmail: user.email,
        ...metadata,
      },
    });
  }

  async query(queryDto: QueryAuditLogsDto): Promise<{
    data: AuditLog[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const queryBuilder = this.auditLogRepository
      .createQueryBuilder('audit_log')
      .leftJoinAndSelect('audit_log.performed_by_user', 'user')
      .orderBy('audit_log.performed_at', 'DESC');

    // Apply filters
    if (queryDto.startDate) {
      queryBuilder.andWhere('audit_log.performed_at >= :startDate', {
        startDate: new Date(queryDto.startDate),
      });
    }

    if (queryDto.endDate) {
      queryBuilder.andWhere('audit_log.performed_at <= :endDate', {
        endDate: new Date(queryDto.endDate),
      });
    }

    if (queryDto.performedBy) {
      queryBuilder.andWhere('audit_log.performed_by = :performedBy', {
        performedBy: queryDto.performedBy,
      });
    }

    if (queryDto.entityType) {
      queryBuilder.andWhere('audit_log.entity_type = :entityType', {
        entityType: queryDto.entityType,
      });
    }

    if (queryDto.entityId) {
      queryBuilder.andWhere('audit_log.entity_id = :entityId', {
        entityId: queryDto.entityId,
      });
    }

    if (queryDto.action) {
      queryBuilder.andWhere('audit_log.action = :action', {
        action: queryDto.action,
      });
    }

    if (queryDto.status) {
      queryBuilder.andWhere('audit_log.status = :status', {
        status: queryDto.status,
      });
    }

    if (queryDto.level) {
      queryBuilder.andWhere('audit_log.level = :level', {
        level: queryDto.level,
      });
    }

    if (queryDto.search) {
      queryBuilder.andWhere(
        '(audit_log.action ILIKE :search OR audit_log.entity_type ILIKE :search OR audit_log.entity_id ILIKE :search OR audit_log.error_message ILIKE :search OR user.email ILIKE :search)',
        { search: `%${queryDto.search}%` },
      );
    }

    const page = queryDto.page || 1;
    const limit = Math.min(queryDto.limit || 50, 100); // Max 100 per page
    const offset = (page - 1) * limit;

    queryBuilder.skip(offset).take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getAuditTrail(
    entityType: string,
    entityId: string,
    limit: number = 100,
  ): Promise<AuditLog[]> {
    return this.auditLogRepository.find({
      where: { entity_type: entityType, entity_id: entityId },
      relations: ['performed_by_user'],
      order: { performed_at: 'DESC' },
      take: limit,
    });
  }

  async getUserActivity(
    userId: string,
    limit: number = 100,
  ): Promise<AuditLog[]> {
    return this.auditLogRepository.find({
      where: { performed_by: userId },
      relations: ['performed_by_user'],
      order: { performed_at: 'DESC' },
      take: limit,
    });
  }
}
