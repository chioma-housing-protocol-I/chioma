import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import {
  QueryAnalysisService,
  NPlusOneReport,
} from '../../common/query-logger/query-analysis.service';

interface IndexSizeRow {
  tablename: string;
  indexname: string;
  index_size: string;
  index_size_bytes: string;
}

interface TableSizeRow {
  table_name: string;
  total_size: string;
  table_size: string;
  external_size: string;
  total_size_bytes: string;
}

interface UnusedIndexRow {
  schemaname: string;
  tablename: string;
  indexname: string;
  idx_scan: number;
  index_size: string;
  index_size_bytes: string;
}

type QuerySeverity = NPlusOneReport['severity'];
const VALID_SEVERITIES: readonly QuerySeverity[] = [
  'low',
  'medium',
  'high',
  'critical',
];

function isQuerySeverity(value?: string): value is QuerySeverity {
  return (
    value !== undefined &&
    (VALID_SEVERITIES as readonly string[]).includes(value)
  );
}

@Injectable()
export class DatabasePerformanceService {
  private readonly logger = new Logger(DatabasePerformanceService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly queryAnalysis: QueryAnalysisService,
  ) {}

  async getIndexUsage() {
    return this.dataSource.query(`
      SELECT
          schemaname,
          tablename,
          indexname,
          idx_scan as index_scans,
          idx_tup_read as tuples_read,
          idx_tup_fetch as tuples_fetched
      FROM pg_stat_user_indexes
      WHERE schemaname = 'public'
      ORDER BY idx_scan DESC;
    `);
  }

  async getIndexSizes(): Promise<IndexSizeRow[]> {
    return this.dataSource.query(`
      SELECT
          tablename,
          indexname,
          pg_size_pretty(pg_relation_size(indexrelid)) as index_size,
          pg_relation_size(indexrelid) as index_size_bytes
      FROM pg_stat_user_indexes
      WHERE schemaname = 'public'
      ORDER BY pg_relation_size(indexrelid) DESC;
    `);
  }

  async getTableSizes(): Promise<TableSizeRow[]> {
    return this.dataSource.query(`
      SELECT
          relname as table_name,
          pg_size_pretty(pg_total_relation_size(relid)) as total_size,
          pg_size_pretty(pg_relation_size(relid)) as table_size,
          pg_size_pretty(pg_total_relation_size(relid) - pg_relation_size(relid)) as external_size,
          pg_total_relation_size(relid) as total_size_bytes
      FROM pg_stat_user_tables
      WHERE schemaname = 'public'
      ORDER BY pg_total_relation_size(relid) DESC;
    `);
  }

  async getSlowQueries(limit = 10) {
    try {
      return await this.dataSource.query(
        `
        SELECT
            query,
            calls,
            total_exec_time,
            min_exec_time,
            max_exec_time,
            mean_exec_time,
            stddev_exec_time,
            rows,
            shared_blks_hit,
            shared_blks_read
        FROM pg_stat_statements
        ORDER BY total_exec_time DESC
        LIMIT $1;
      `,
        [limit],
      );
    } catch (error) {
      this.logger.warn(
        'pg_stat_statements not available or accessible:',
        error.message,
      );
      return [];
    }
  }

  async getDatabaseSettings() {
    const settings = [
      'max_connections',
      'shared_buffers',
      'effective_cache_size',
      'maintenance_work_mem',
      'checkpoint_completion_target',
      'wal_buffers',
      'default_statistics_target',
      'random_page_cost',
      'effective_io_concurrency',
      'work_mem',
      'min_wal_size',
      'max_wal_size',
    ];

    return this.dataSource.query(
      `
      SELECT name, setting, unit, description
      FROM pg_settings
      WHERE name = ANY($1);
    `,
      [settings],
    );
  }

  async getUnusedIndexes(
    minScans = 10,
    minSizeBytes = 10 * 1024 * 1024,
  ): Promise<UnusedIndexRow[]> {
    return this.dataSource.query(
      `
      SELECT
        schemaname,
        tablename,
        indexname,
        idx_scan,
        pg_size_pretty(pg_relation_size(indexrelid)) as index_size,
        pg_relation_size(indexrelid) as index_size_bytes
      FROM pg_stat_user_indexes
      WHERE schemaname = 'public'
        AND idx_scan < $1
        AND pg_relation_size(indexrelid) > $2
      ORDER BY pg_relation_size(indexrelid) DESC
    `,
      [minScans, minSizeBytes],
    );
  }

  async getDuplicateIndexCandidates() {
    return this.dataSource.query(`
      SELECT
        tablename,
        indexname,
        pg_size_pretty(pg_relation_size(indexrelid)) as index_size,
        pg_relation_size(indexrelid) as index_size_bytes,
        indexdef
      FROM pg_indexes
      WHERE schemaname = 'public'
      ORDER BY tablename, indexname
    `);
  }

  async getIndexRecommendations() {
    const [indexUsage, indexSizes, tableSizes, unused] = await Promise.all([
      this.getIndexUsage(),
      this.getIndexSizes(),
      this.getTableSizes(),
      this.getUnusedIndexes(),
    ]);

    return {
      generatedAt: new Date().toISOString(),
      summary: {
        totalIndexes: indexUsage.length,
        totalIndexSize: indexSizes.reduce(
          (sum: number, idx) => sum + Number(idx.index_size_bytes || 0),
          0,
        ),
        unusedIndexes: unused.length,
      },
      indexUsage,
      indexSizes,
      tableSizes,
      unusedIndexes: unused,
      recommendations: this.generateIndexRecommendations(
        tableSizes,
        indexSizes,
        unused,
      ),
    };
  }

  private generateIndexRecommendations(
    tableSizes: TableSizeRow[],
    indexSizes: IndexSizeRow[],
    unused: UnusedIndexRow[],
  ): string[] {
    const recs: string[] = [];

    if (unused.length > 0) {
      recs.push(
        `Consider dropping ${unused.length} unused or rarely-used index(es) to reduce write overhead and save disk space.`,
      );
    }

    const indexBytesByTable = new Map<string, number>();
    for (const idx of indexSizes) {
      const bytes = Number(idx.index_size_bytes || 0);
      indexBytesByTable.set(
        idx.tablename,
        (indexBytesByTable.get(idx.tablename) || 0) + bytes,
      );
    }

    const highRatio = tableSizes.filter((t) => {
      const tableBytes = Number(t.total_size_bytes || 0);
      if (tableBytes === 0) return false;
      const indexBytes = indexBytesByTable.get(t.table_name) || 0;
      return (indexBytes / tableBytes) * 100 > 150;
    });
    if (highRatio.length > 0) {
      recs.push(
        `${highRatio.length} table(s) have index-to-table size ratio > 150%. Review whether all indexes are necessary.`,
      );
    }

    recs.push(
      'Run "scripts/db-index-review.ts" for a detailed index usage analysis.',
    );

    return recs;
  }

  async getPerformanceReport() {
    const [indexUsage, indexSizes, tableSizes, slowQueries, settings, unused] =
      await Promise.all([
        this.getIndexUsage(),
        this.getIndexSizes(),
        this.getTableSizes(),
        this.getSlowQueries(),
        this.getDatabaseSettings(),
        this.getUnusedIndexes(),
      ]);

    return {
      generatedAt: new Date().toISOString(),
      indexUsage,
      indexSizes,
      tableSizes,
      slowQueries,
      settings,
      unusedIndexes: unused,
    };
  }

  async getQueryAnalysis() {
    return this.queryAnalysis.getQueryAnalysisReport();
  }

  async getNPlusOneDetection(severity?: string) {
    const reports = this.queryAnalysis.getNPlusOneReports(
      isQuerySeverity(severity) ? severity : undefined,
    );

    return {
      generatedAt: new Date().toISOString(),
      totalDetected: reports.length,
      reports,
      summary: {
        critical: reports.filter((r) => r.severity === 'critical').length,
        high: reports.filter((r) => r.severity === 'high').length,
        medium: reports.filter((r) => r.severity === 'medium').length,
        low: reports.filter((r) => r.severity === 'low').length,
      },
    };
  }

  async getQueryPatterns(search?: string) {
    return this.queryAnalysis.getQueryPatterns(search);
  }

  async getQueryHistory(limit = 100, minDuration?: number) {
    return this.queryAnalysis.getQueryHistory(limit, minDuration);
  }

  async getQueryStats() {
    return this.queryAnalysis.getQueryStats();
  }

  async resetQueryAnalysis() {
    this.queryAnalysis.resetAnalysis();
    return { message: 'Query analysis data reset successfully' };
  }
}
