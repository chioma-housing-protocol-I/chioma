import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { AuditLog, AuditLevel } from './entities/audit-log.entity';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuditRetentionService {
  private readonly logger = new Logger(AuditRetentionService.name);

  constructor(
    @InjectRepository(AuditLog)
    private auditLogRepository: Repository<AuditLog>,
    private readonly configService: ConfigService,
  ) {}

  private getRetentionDays(level: AuditLevel): number {
    const envKey = {
      [AuditLevel.INFO]: 'AUDIT_RETENTION_INFO_DAYS',
      [AuditLevel.WARN]: 'AUDIT_RETENTION_WARN_DAYS',
      [AuditLevel.ERROR]: 'AUDIT_RETENTION_ERROR_DAYS',
      [AuditLevel.SECURITY]: 'AUDIT_RETENTION_SECURITY_DAYS',
    }[level];

    const defaults = {
      [AuditLevel.INFO]: 90,
      [AuditLevel.WARN]: 90,
      [AuditLevel.ERROR]: 180,
      [AuditLevel.SECURITY]: 365,
    };

    const configured = this.configService.get<string>(envKey);
    const parsed = configured ? parseInt(configured, 10) : NaN;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : defaults[level];
  }

  // Run daily at 2 AM
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async performLogRetention(): Promise<void> {
    try {
      this.logger.log('Starting audit log retention cleanup');

      // Keep logs for different periods based on level
      const now = new Date();

      // Delete INFO and WARN logs based on retention config
      const infoDays = this.getRetentionDays(AuditLevel.INFO);
      const warnDays = this.getRetentionDays(AuditLevel.WARN);
      const infoCutoff = new Date(
        now.getTime() - infoDays * 24 * 60 * 60 * 1000,
      );
      const warnCutoff = new Date(
        now.getTime() - warnDays * 24 * 60 * 60 * 1000,
      );
      const infoWarnDeleted = await this.auditLogRepository.delete({
        level: AuditLevel.INFO,
        performed_at: LessThan(infoCutoff),
      });
      const warnDeleted = await this.auditLogRepository.delete({
        level: AuditLevel.WARN,
        performed_at: LessThan(warnCutoff),
      });

      // Delete ERROR logs based on retention config
      const errorDays = this.getRetentionDays(AuditLevel.ERROR);
      const errorCutoff = new Date(
        now.getTime() - errorDays * 24 * 60 * 60 * 1000,
      );
      const errorDeleted = await this.auditLogRepository.delete({
        level: AuditLevel.ERROR,
        performed_at: LessThan(errorCutoff),
      });

      // Keep SECURITY logs based on retention config
      const securityDays = this.getRetentionDays(AuditLevel.SECURITY);
      const securityCutoff = new Date(
        now.getTime() - securityDays * 24 * 60 * 60 * 1000,
      );
      const securityDeleted = await this.auditLogRepository.delete({
        level: AuditLevel.SECURITY,
        performed_at: LessThan(securityCutoff),
      });

      this.logger.log(
        `Audit log retention completed. Deleted: ${infoWarnDeleted.affected} INFO, ${warnDeleted.affected} WARN, ${errorDeleted.affected} ERROR, ${securityDeleted.affected} SECURITY logs`,
      );
    } catch (error) {
      this.logger.error('Failed to perform audit log retention', error);
    }
  }

  // Manual cleanup method for testing/admin purposes
  async cleanupOldLogs(daysToKeep: number = 90): Promise<number> {
    try {
      const cutoffDate = new Date(
        Date.now() - daysToKeep * 24 * 60 * 60 * 1000,
      );

      const result = await this.auditLogRepository.delete({
        performed_at: LessThan(cutoffDate),
        level: AuditLevel.INFO, // Only delete INFO logs manually
      });

      this.logger.log(
        `Manually deleted ${result.affected} audit logs older than ${daysToKeep} days`,
      );
      return result.affected || 0;
    } catch (error) {
      this.logger.error('Failed to cleanup old audit logs', error);
      throw error;
    }
  }

  // Get log statistics
  async getLogStatistics(): Promise<{
    total: number;
    byLevel: Record<string, number>;
    oldestLog: Date | null;
    newestLog: Date | null;
  }> {
    const total = await this.auditLogRepository.count();

    const levelStats = await this.auditLogRepository
      .createQueryBuilder('audit_log')
      .select('level')
      .addSelect('COUNT(*)', 'count')
      .groupBy('level')
      .getRawMany();

    const byLevel: Record<string, number> = {};
    levelStats.forEach((stat) => {
      byLevel[stat.level] = parseInt(stat.count);
    });

    const oldestResult = await this.auditLogRepository.find({
      select: ['performed_at'],
      order: { performed_at: 'ASC' },
      take: 1,
    });

    const newestResult = await this.auditLogRepository.find({
      select: ['performed_at'],
      order: { performed_at: 'DESC' },
      take: 1,
    });

    return {
      total,
      byLevel,
      oldestLog: oldestResult[0]?.performed_at || null,
      newestLog: newestResult[0]?.performed_at || null,
    };
  }
}
