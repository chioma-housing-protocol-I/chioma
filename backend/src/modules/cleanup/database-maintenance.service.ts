import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DataSource } from 'typeorm';

export interface DatabaseMaintenanceStats {
  checkedAt: string;
  databaseType: string;
  vacuumAnalyzeRan: boolean;
  tablesNeedingVacuum: number;
}

@Injectable()
export class DatabaseMaintenanceService {
  private readonly logger = new Logger(DatabaseMaintenanceService.name);

  constructor(private readonly dataSource: DataSource) {}

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async runScheduledMaintenance(): Promise<void> {
    const stats = await this.runMaintenance();
    this.logger.log(
      `Database maintenance completed: vacuum=${stats.vacuumAnalyzeRan}, tablesNeedingVacuum=${stats.tablesNeedingVacuum}`,
    );
  }

  async runMaintenance(): Promise<DatabaseMaintenanceStats> {
    const databaseType = String(this.dataSource.options.type);
    const stats: DatabaseMaintenanceStats = {
      checkedAt: new Date().toISOString(),
      databaseType,
      vacuumAnalyzeRan: false,
      tablesNeedingVacuum: 0,
    };

    if (databaseType !== 'postgres') {
      this.logger.debug(`Skipping maintenance for ${databaseType} database`);
      return stats;
    }

    const tables = await this.getTablesNeedingVacuum();
    stats.tablesNeedingVacuum = tables.length;

    await this.dataSource.query('VACUUM (ANALYZE)');
    stats.vacuumAnalyzeRan = true;

    return stats;
  }

  async getTablesNeedingVacuum(
    minimumDeadTuples = 1000,
  ): Promise<Array<{ tableName: string; deadTuples: number }>> {
    const databaseType = String(this.dataSource.options.type);
    if (databaseType !== 'postgres') {
      return [];
    }

    const rows = await this.dataSource.query(
      `
        SELECT relname AS "tableName", n_dead_tup AS "deadTuples"
        FROM pg_stat_user_tables
        WHERE n_dead_tup >= $1
        ORDER BY n_dead_tup DESC
      `,
      [minimumDeadTuples],
    );

    return rows.map((row) => ({
      tableName: row.tableName,
      deadTuples: Number(row.deadTuples),
    }));
  }
}
