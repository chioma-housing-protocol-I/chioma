import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { MetricsService } from './metrics.service';
import { AlertService } from './alert.service';
import { AlertPayload } from './alert.types';
import { PerformanceMonitorService } from './performance-monitor.service';

export interface DatabasePoolMetrics {
  totalConnections: number;
  activeConnections: number;
  idleConnections: number;
  maxConnections: number;
  waitingClients: number;
  connectionUsagePercent: number;
  applicationPool: DatabaseApplicationPoolMetrics | null;
}

/**
 * Stats read directly off the node-postgres Pool that TypeORM's
 * PostgresDriver creates for this app (sized via DB_POOL_MAX/DB_POOL_MIN).
 * Distinct from the pg_stat_activity based fields above, which count every
 * connection to the database from any client. `waiting > 0` here means
 * requests are queued because this app's own pool has run out of
 * connections - the direct signal of pool exhaustion.
 */
export interface DatabaseApplicationPoolMetrics {
  total: number;
  idle: number;
  waiting: number;
  max: number;
  utilizationPercent: number;
}

export interface DatabaseQueryMetrics {
  totalQueries: number;
  avgQueryTimeMs: number;
  maxQueryTimeMs: number;
  tps: number;
  cacheHitRatio: number;
  activeConnections: number;
}

export interface DatabaseSizeMetrics {
  databaseSizeBytes: number;
  databaseSizeHuman: string;
  tableCount: number;
  indexCount: number;
  totalIndexSizeBytes: number;
  totalIndexSizeHuman: string;
}

export interface DatabaseHealthSnapshot {
  timestamp: Date;
  pool: DatabasePoolMetrics | null;
  size: DatabaseSizeMetrics | null;
  queries: DatabaseQueryMetrics | null;
}

@Injectable()
export class DatabaseMonitorService {
  private readonly logger = new Logger(DatabaseMonitorService.name);
  private readonly history: DatabaseHealthSnapshot[] = [];
  private readonly MAX_HISTORY = 60;
  private lastQueryTime = 0;
  private lastQueryCount = 0;

  // Connection pool thresholds
  private readonly POOL_WARNING_PERCENT = 0.7;
  private readonly POOL_CRITICAL_PERCENT = 0.9;

  // Query time thresholds
  private readonly QUERY_TIME_WARNING_MS = 500;
  private readonly QUERY_TIME_CRITICAL_MS = 2000;

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly metricsService: MetricsService,
    private readonly alertService: AlertService,
    private readonly performanceMonitor: PerformanceMonitorService,
  ) {
    this.logger.log('DatabaseMonitorService initialized');
  }

  /**
   * Collect pool metrics from pg_stat_activity.
   */
  async getPoolMetrics(): Promise<DatabasePoolMetrics | null> {
    try {
      const rows = await this.dataSource.query(`
        SELECT
          COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE state = 'active')::int AS active,
          COUNT(*) FILTER (WHERE state = 'idle')::int AS idle,
          COUNT(*) FILTER (WHERE wait_event_type IS NOT NULL)::int AS waiting
        FROM pg_stat_activity
        WHERE datname = current_database()
          AND pid <> pg_backend_pid()
      `);

      const maxResult = await this.dataSource.query(
        `SELECT setting::int AS max_conn FROM pg_settings WHERE name = 'max_connections'`,
      );

      const total = rows[0]?.total ?? 0;
      const active = rows[0]?.active ?? 0;
      const idle = rows[0]?.idle ?? 0;
      const waiting = rows[0]?.waiting ?? 0;
      const maxConnections = maxResult[0]?.max_conn ?? 100;

      const applicationPool = this.getApplicationPoolMetrics();
      if (applicationPool) {
        this.metricsService.setDatabasePoolUsage(
          applicationPool.total - applicationPool.idle,
          applicationPool.idle,
          applicationPool.max,
          applicationPool.waiting,
        );
      } else {
        this.logger.warn(
          'Application connection pool stats unavailable; database_pool_* metrics not updated',
        );
      }

      return {
        totalConnections: total,
        activeConnections: active,
        idleConnections: idle,
        maxConnections,
        waitingClients: waiting,
        connectionUsagePercent:
          maxConnections > 0
            ? parseFloat(((active / maxConnections) * 100).toFixed(1))
            : 0,
        applicationPool,
      };
    } catch (error) {
      this.logger.error(
        'Failed to get pool metrics',
        error instanceof Error ? error.message : String(error),
      );
      return null;
    }
  }

  /**
   * Reads live stats directly off the node-postgres Pool that TypeORM's
   * PostgresDriver holds as `driver.master`. This is the actual connection
   * pool the app manages (see DB_POOL_MAX/DB_POOL_MIN in database-config.ts),
   * which is what "exhausts" when traffic outpaces `DB_POOL_MAX` - long
   * before Postgres' own `max_connections` is anywhere near its limit.
   */
  private getApplicationPoolMetrics(): DatabaseApplicationPoolMetrics | null {
    const pool = (
      this.dataSource.driver as unknown as {
        master?: {
          totalCount?: number;
          idleCount?: number;
          waitingCount?: number;
          options?: { max?: number };
        };
      }
    ).master;

    if (
      !pool ||
      typeof pool.totalCount !== 'number' ||
      typeof pool.idleCount !== 'number' ||
      typeof pool.waitingCount !== 'number'
    ) {
      return null;
    }

    const max = pool.options?.max ?? 0;
    const active = pool.totalCount - pool.idleCount;

    return {
      total: pool.totalCount,
      idle: pool.idleCount,
      waiting: pool.waitingCount,
      max,
      utilizationPercent:
        max > 0 ? parseFloat(((active / max) * 100).toFixed(1)) : 0,
    };
  }

  /**
   * Collect database size metrics.
   */
  async getSizeMetrics(): Promise<DatabaseSizeMetrics | null> {
    try {
      const dbSize = await this.dataSource.query(`
        SELECT
          pg_database_size(current_database()) AS size_bytes,
          pg_size_pretty(pg_database_size(current_database())) AS size_human
      `);

      const stats = await this.dataSource.query(`
        SELECT
          (SELECT COUNT(*)::int FROM information_schema.tables WHERE table_schema = 'public') AS table_count,
          (SELECT COUNT(*)::int FROM pg_indexes WHERE schemaname = 'public') AS index_count,
          COALESCE((
            SELECT SUM(pg_relation_size(indexrelid))
            FROM pg_stat_user_indexes
            WHERE schemaname = 'public'
          ), 0) AS index_size_bytes
      `);

      return {
        databaseSizeBytes: dbSize[0]?.size_bytes ?? 0,
        databaseSizeHuman: dbSize[0]?.size_human ?? '0 bytes',
        tableCount: stats[0]?.table_count ?? 0,
        indexCount: stats[0]?.index_count ?? 0,
        totalIndexSizeBytes: Number(stats[0]?.index_size_bytes ?? 0),
        totalIndexSizeHuman: this.formatBytes(
          Number(stats[0]?.index_size_bytes ?? 0),
        ),
      };
    } catch (error) {
      this.logger.error(
        'Failed to get size metrics',
        error instanceof Error ? error.message : String(error),
      );
      return null;
    }
  }

  /**
   * Collect query performance metrics from pg_stat_statements.
   */
  async getQueryMetrics(): Promise<DatabaseQueryMetrics | null> {
    try {
      const stats = await this.dataSource.query(`
        SELECT
          COALESCE(SUM(calls), 0)::bigint AS total_calls,
          COALESCE(AVG(mean_exec_time), 0)::float AS avg_time,
          COALESCE(MAX(max_exec_time), 0)::float AS max_time
        FROM pg_stat_statements
      `);

      const totalCalls = Number(stats[0]?.total_calls ?? 0);
      const avgTime = stats[0]?.avg_time ?? 0;
      const maxTime = stats[0]?.max_time ?? 0;

      const now = Date.now();
      const elapsed = (now - this.lastQueryTime) / 1000;
      let tps = 0;
      if (elapsed > 0 && this.lastQueryCount > 0) {
        tps = parseFloat(
          ((totalCalls - this.lastQueryCount) / elapsed).toFixed(2),
        );
      }
      this.lastQueryTime = now;
      this.lastQueryCount = totalCalls > 0 ? totalCalls : 0;

      // Cache hit ratio from pg_stat_database
      const cacheResult = await this.dataSource.query(`
        SELECT
          CASE
            WHEN (blks_hit + blks_read) > 0
            THEN ROUND((blks_hit::numeric / (blks_hit + blks_read) * 100), 1)
            ELSE 100.0
          END AS cache_hit_ratio
        FROM pg_stat_database
        WHERE datname = current_database()
      `);
      const cacheHitRatio = Number(cacheResult[0]?.cache_hit_ratio ?? 100);

      const pool = await this.getPoolMetrics();
      const activeConnections = pool?.activeConnections ?? 0;

      return {
        totalQueries: totalCalls,
        avgQueryTimeMs: parseFloat(avgTime.toFixed(2)),
        maxQueryTimeMs: parseFloat(maxTime.toFixed(2)),
        tps,
        cacheHitRatio,
        activeConnections,
      };
    } catch {
      // pg_stat_statements may not be available
      return null;
    }
  }

  /**
   * Take a full health snapshot of the database.
   */
  async getHealthSnapshot(): Promise<DatabaseHealthSnapshot> {
    const [pool, size, queries] = await Promise.all([
      this.getPoolMetrics(),
      this.getSizeMetrics(),
      this.getQueryMetrics(),
    ]);

    const snapshot: DatabaseHealthSnapshot = {
      timestamp: new Date(),
      pool,
      size,
      queries,
    };

    this.history.push(snapshot);
    if (this.history.length > this.MAX_HISTORY) {
      this.history.shift();
    }

    return snapshot;
  }

  /**
   * Get the history of health snapshots (last N entries).
   */
  getHistory(count = 10): DatabaseHealthSnapshot[] {
    return this.history.slice(-count);
  }

  /**
   * Periodic health check and alert evaluation.
   * Runs every minute.
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async performDatabaseHealthCheck(): Promise<void> {
    try {
      const snapshot = await this.getHealthSnapshot();
      const alerts: AlertPayload[] = [];

      // Check pool metrics
      if (snapshot.pool) {
        const usage = snapshot.pool.connectionUsagePercent;

        if (usage >= this.POOL_CRITICAL_PERCENT * 100) {
          alerts.push({
            status: 'firing',
            labels: {
              alertname: 'database_pool_exhaustion',
              severity: 'critical',
              service: 'chioma-backend',
            },
            annotations: {
              summary: `Database connection pool near exhaustion: ${usage}% used`,
              description: `Active: ${snapshot.pool.activeConnections}, Idle: ${snapshot.pool.idleConnections}, Max: ${snapshot.pool.maxConnections}, Waiting: ${snapshot.pool.waitingClients}`,
            },
            startsAt: new Date().toISOString(),
            generatorURL: '',
          });
        } else if (usage >= this.POOL_WARNING_PERCENT * 100) {
          alerts.push({
            status: 'firing',
            labels: {
              alertname: 'database_pool_warning',
              severity: 'warning',
              service: 'chioma-backend',
            },
            annotations: {
              summary: `Database connection pool usage elevated: ${usage}%`,
              description: `Active: ${snapshot.pool.activeConnections}, Max: ${snapshot.pool.maxConnections}`,
            },
            startsAt: new Date().toISOString(),
            generatorURL: '',
          });
        }

        // Check the application's own connection pool (DB_POOL_MAX), which
        // exhausts independently of - and usually well before - Postgres'
        // server-wide max_connections checked above.
        const appPool = snapshot.pool.applicationPool;
        if (appPool) {
          if (appPool.waiting > 0) {
            alerts.push({
              status: 'firing',
              labels: {
                alertname: 'database_application_pool_exhausted',
                severity: 'critical',
                service: 'chioma-backend',
              },
              annotations: {
                summary: `Application connection pool exhausted: ${appPool.waiting} request(s) queued waiting for a connection`,
                description: `Total: ${appPool.total}, Idle: ${appPool.idle}, Max: ${appPool.max}, Utilization: ${appPool.utilizationPercent}%`,
              },
              startsAt: new Date().toISOString(),
              generatorURL: '',
            });
          } else if (
            appPool.utilizationPercent >=
            this.POOL_CRITICAL_PERCENT * 100
          ) {
            alerts.push({
              status: 'firing',
              labels: {
                alertname: 'database_application_pool_critical',
                severity: 'critical',
                service: 'chioma-backend',
              },
              annotations: {
                summary: `Application connection pool near exhaustion: ${appPool.utilizationPercent}% used`,
                description: `Total: ${appPool.total}, Idle: ${appPool.idle}, Max: ${appPool.max}`,
              },
              startsAt: new Date().toISOString(),
              generatorURL: '',
            });
          } else if (
            appPool.utilizationPercent >=
            this.POOL_WARNING_PERCENT * 100
          ) {
            alerts.push({
              status: 'firing',
              labels: {
                alertname: 'database_application_pool_warning',
                severity: 'warning',
                service: 'chioma-backend',
              },
              annotations: {
                summary: `Application connection pool usage elevated: ${appPool.utilizationPercent}%`,
                description: `Total: ${appPool.total}, Max: ${appPool.max}`,
              },
              startsAt: new Date().toISOString(),
              generatorURL: '',
            });
          }
        }
      }

      // Check query time metrics
      if (snapshot.queries) {
        const avgTime = snapshot.queries.avgQueryTimeMs;
        if (avgTime >= this.QUERY_TIME_CRITICAL_MS) {
          alerts.push({
            status: 'firing',
            labels: {
              alertname: 'database_slow_queries',
              severity: 'critical',
              service: 'chioma-backend',
            },
            annotations: {
              summary: `Database query performance degraded: avg ${avgTime}ms`,
              description: `Average query time: ${avgTime}ms, Max: ${snapshot.queries.maxQueryTimeMs}ms, TPS: ${snapshot.queries.tps}`,
            },
            startsAt: new Date().toISOString(),
            generatorURL: '',
          });
        } else if (avgTime >= this.QUERY_TIME_WARNING_MS) {
          alerts.push({
            status: 'firing',
            labels: {
              alertname: 'database_slow_queries_warning',
              severity: 'warning',
              service: 'chioma-backend',
            },
            annotations: {
              summary: `Database query time elevated: avg ${avgTime}ms`,
              description: `Average query time: ${avgTime}ms, Threshold: ${this.QUERY_TIME_WARNING_MS}ms`,
            },
            startsAt: new Date().toISOString(),
            generatorURL: '',
          });
        }

        // Check cache hit ratio
        const cacheRatio = snapshot.queries.cacheHitRatio;
        if (cacheRatio < 95) {
          alerts.push({
            status: 'firing',
            labels: {
              alertname: 'database_cache_hit_ratio_low',
              severity: cacheRatio < 90 ? 'critical' : 'warning',
              service: 'chioma-backend',
            },
            annotations: {
              summary: `Database cache hit ratio low: ${cacheRatio}%`,
              description: `Cache hit ratio: ${cacheRatio}%. Expected > 95%. Consider increasing shared_buffers or reviewing query patterns.`,
            },
            startsAt: new Date().toISOString(),
            generatorURL: '',
          });
        }
      }

      // Check database size growth (warn if > 10GB)
      if (
        snapshot.size &&
        snapshot.size.databaseSizeBytes > 10 * 1024 * 1024 * 1024
      ) {
        alerts.push({
          status: 'firing',
          labels: {
            alertname: 'database_size_large',
            severity: 'warning',
            service: 'chioma-backend',
          },
          annotations: {
            summary: `Database size is large: ${snapshot.size.databaseSizeHuman}`,
            description: `Database: ${snapshot.size.databaseSizeHuman}, Tables: ${snapshot.size.tableCount}, Indexes: ${snapshot.size.indexCount}`,
          },
          startsAt: new Date().toISOString(),
          generatorURL: '',
        });
      }

      // Fire alerts if any
      if (alerts.length > 0) {
        await this.alertService.handleAlert({ alerts });
      }

      this.logger.debug(
        `Database health check complete: ${snapshot.pool ? `${snapshot.pool.activeConnections} active conns` : 'pool N/A'}, ${snapshot.queries ? `${snapshot.queries.avgQueryTimeMs}ms avg query` : 'queries N/A'}`,
      );
    } catch (error) {
      this.logger.error(
        'Database health check failed',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  /**
   * Record a database query duration (called from decorators/interceptors).
   */
  recordQueryDuration(operation: string, durationMs: number): void {
    this.metricsService.recordDatabaseQuery(operation, durationMs);
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
  }
}
