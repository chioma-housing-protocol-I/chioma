import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, LessThan, MoreThan, Between } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { TenantScreeningRequest } from '../screening/entities/tenant-screening-request.entity';
import { TenantScreeningReport } from '../screening/entities/tenant-screening-report.entity';
import { TenantScreeningConsent } from '../screening/entities/tenant-screening-consent.entity';

export interface ArchivalConfig {
  retentionDays: number;
  archiveTable: string;
  softDelete: boolean;
}

export interface ArchivalStats {
  archived: number;
  deleted: number;
  errors: number;
  duration: number;
}

@Injectable()
export class DataArchivalService {
  private readonly logger = new Logger(DataArchivalService.name);

  constructor(
    private dataSource: DataSource,
    @InjectRepository(TenantScreeningRequest)
    private readonly tenantScreeningRequestRepository: Repository<TenantScreeningRequest>,
    @InjectRepository(TenantScreeningReport)
    private readonly tenantScreeningReportRepository: Repository<TenantScreeningReport>,
    @InjectRepository(TenantScreeningConsent)
    private readonly tenantScreeningConsentRepository: Repository<TenantScreeningConsent>,
  ) {}

  private readonly archivalConfigs: Record<string, ArchivalConfig> = {
    tenant_screening_requests: {
      retentionDays: 2555, // 7 years
      archiveTable: 'archived_tenant_screening_requests',
      softDelete: true,
    },
    tenant_screening_reports: {
      retentionDays: 2555, // 7 years
      archiveTable: 'archived_tenant_screening_reports',
      softDelete: true,
    },
    tenant_screening_consent: {
      retentionDays: 365, // 1 year
      archiveTable: 'archived_tenant_screening_consent',
      softDelete: false,
    },
  };

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async performScheduledArchival(): Promise<void> {
    this.logger.log('Starting scheduled data archival process');

    try {
      const totalStats: ArchivalStats = {
        archived: 0,
        deleted: 0,
        errors: 0,
        duration: 0,
      };

      const startTime = Date.now();

      for (const [entityType, config] of Object.entries(this.archivalConfigs)) {
        try {
          const stats = await this.archiveEntityData(entityType, config);
          totalStats.archived += stats.archived;
          totalStats.deleted += stats.deleted;
          totalStats.errors += stats.errors;

          this.logger.log(
            `Completed archival for ${entityType}: ${stats.archived} archived, ${stats.deleted} deleted`,
          );
        } catch (error) {
          totalStats.errors++;
          this.logger.error(
            `Failed to archive ${entityType}: ${error.message}`,
          );
        }
      }

      totalStats.duration = Date.now() - startTime;

      this.logger.log(
        `Scheduled archival completed: ${totalStats.archived} archived, ${totalStats.deleted} deleted, ${totalStats.errors} errors, ${totalStats.duration}ms`,
      );
    } catch (error) {
      this.logger.error(`Scheduled archival failed: ${error.message}`);
    }
  }

  async archiveEntityData(
    entityType: string,
    config: ArchivalConfig,
  ): Promise<ArchivalStats> {
    const stats: ArchivalStats = {
      archived: 0,
      deleted: 0,
      errors: 0,
      duration: 0,
    };

    const startTime = Date.now();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - config.retentionDays);

    this.logger.log(
      `Archiving ${entityType} older than ${cutoffDate.toISOString()}`,
    );

    try {
      await this.dataSource.transaction(async (manager) => {
        let repository: Repository<any>;

        switch (entityType) {
          case 'tenant_screening_requests':
            repository = manager.getRepository(TenantScreeningRequest);
            break;
          case 'tenant_screening_reports':
            repository = manager.getRepository(TenantScreeningReport);
            break;
          case 'tenant_screening_consent':
            repository = manager.getRepository(TenantScreeningConsent);
            break;
          default:
            throw new Error(`Unknown entity type: ${entityType}`);
        }

        // Create archive table if it doesn't exist
        await this.ensureArchiveTable(manager, entityType, config.archiveTable);

        // Find records to archive
        const recordsToArchive = await repository.find({
          where: {
            createdAt: LessThan(cutoffDate),
          },
          take: 1000, // Process in batches
        });

        if (recordsToArchive.length === 0) {
          this.logger.log(`No records to archive for ${entityType}`);
          return;
        }

        // Archive records
        if (config.softDelete) {
          // Move to archive table
          await manager
            .createQueryBuilder()
            .insert()
            .into(config.archiveTable)
            .values(recordsToArchive)
            .orIgnore()
            .execute();

          stats.archived = recordsToArchive.length;

          // Soft delete original records
          await repository.update(
            { id: recordsToArchive.map((r) => r.id) },
            { deletedAt: new Date() },
          );
        } else {
          // Hard delete
          await repository.delete({
            id: recordsToArchive.map((r) => r.id),
          });
          stats.deleted = recordsToArchive.length;
        }
      });
    } catch (error) {
      stats.errors++;
      this.logger.error(`Error archiving ${entityType}: ${error.message}`);
      throw error;
    }

    stats.duration = Date.now() - startTime;
    return stats;
  }

  private async ensureArchiveTable(
    manager: any,
    entityType: string,
    archiveTable: string,
  ): Promise<void> {
    try {
      const tableExists = await manager.query(
        `SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = '${archiveTable}'
        )`,
      );

      if (!tableExists[0].exists) {
        this.logger.log(`Creating archive table: ${archiveTable}`);

        // Create archive table with same structure as original
        await manager.query(`
          CREATE TABLE ${archiveTable} AS 
          SELECT * FROM ${entityType} WHERE 1=0
        `);

        // Add archive metadata
        await manager.query(`
          ALTER TABLE ${archiveTable} 
          ADD COLUMN archived_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          ADD COLUMN archival_reason VARCHAR(100) DEFAULT 'retention_policy'
        `);

        // Create indexes for performance
        await manager.query(`
          CREATE INDEX idx_${archiveTable}_archived_at 
          ON ${archiveTable}(archived_at)
        `);

        await manager.query(`
          CREATE INDEX idx_${archiveTable}_original_created_at 
          ON ${archiveTable}(created_at)
        `);
      }
    } catch (error) {
      this.logger.error(
        `Failed to create archive table ${archiveTable}: ${error.message}`,
      );
      throw error;
    }
  }

  async getArchivalStats(): Promise<Record<string, any>> {
    const stats: Record<string, any> = {};

    for (const [entityType, config] of Object.entries(this.archivalConfigs)) {
      try {
        // Count active records
        const activeCount = await this.getActiveRecordCount(entityType);

        // Count archived records
        const archivedCount = await this.getArchivedRecordCount(
          config.archiveTable,
        );

        stats[entityType] = {
          activeRecords: activeCount,
          archivedRecords: archivedCount,
          retentionDays: config.retentionDays,
          archiveTable: config.archiveTable,
        };
      } catch (error) {
        this.logger.error(
          `Failed to get stats for ${entityType}: ${error.message}`,
        );
        stats[entityType] = { error: error.message };
      }
    }

    return stats;
  }

  private async getActiveRecordCount(entityType: string): Promise<number> {
    let repository: Repository<any>;

    switch (entityType) {
      case 'tenant_screening_requests':
        repository = this.tenantScreeningRequestRepository;
        break;
      case 'tenant_screening_reports':
        repository = this.tenantScreeningReportRepository;
        break;
      case 'tenant_screening_consent':
        repository = this.tenantScreeningConsentRepository;
        break;
      default:
        throw new Error(`Unknown entity type: ${entityType}`);
    }

    return await repository.count({ where: { deletedAt: null } });
  }

  private async getArchivedRecordCount(archiveTable: string): Promise<number> {
    try {
      const result = await this.dataSource.query(
        `SELECT COUNT(*) as count FROM ${archiveTable}`,
      );
      return parseInt(result[0].count, 10);
    } catch (error) {
      // Table might not exist yet
      return 0;
    }
  }

  async manualArchive(
    entityType: string,
    olderThanDays?: number,
  ): Promise<ArchivalStats> {
    const config = this.archivalConfigs[entityType];
    if (!config) {
      throw new Error(`No archival configuration found for ${entityType}`);
    }

    if (olderThanDays) {
      // Override retention days for manual archive
      const customConfig = { ...config, retentionDays: olderThanDays };
      return await this.archiveEntityData(entityType, customConfig);
    }

    return await this.archiveEntityData(entityType, config);
  }
}
