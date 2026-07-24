import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class DatabasePerformanceService {
  private readonly logger = new Logger(DatabasePerformanceService.name);

  constructor(private readonly dataSource: DataSource) {}

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

  async getIndexSizes() {
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

  async getTableSizes() {
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

  async getUnusedIndexes(minScans = 10, minSizeBytes = 10 * 1024 * 1024) {
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
        totalIndexes: indexUsage.length as number,
        totalIndexSize: (indexSizes as any[]).reduce(
          (sum: number, idx: any) => sum + Number(idx.index_size_bytes || 0),
          0,
        ),
        unusedIndexes: unused.length as number,
      },
      indexUsage,
      indexSizes,
      tableSizes,
      unusedIndexes: unused,
      recommendations: this.generateIndexRecommendations(
        tableSizes as any[],
        unused as any[],
      ),
    };
  }

  private generateIndexRecommendations(
    tableSizes: Array<{ tablename: string; index_ratio: number }>,
    unused: any[],
  ): string[] {
    const recs: string[] = [];

    if (unused.length > 0) {
      recs.push(
        `Consider dropping ${unused.length} unused or rarely-used index(es) to reduce write overhead and save disk space.`,
      );
    }

    const highRatio = tableSizes.filter((t) => t.index_ratio > 150);
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
}
