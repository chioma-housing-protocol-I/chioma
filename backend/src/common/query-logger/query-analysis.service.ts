import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { QueryThresholdConfig } from './query-threshold.config';

export interface QueryRecord {
  query: string;
  normalizedQuery: string;
  parameters: any[];
  duration: number;
  timestamp: Date;
  stackTrace: string;
}

export interface NPlusOneReport {
  id: string;
  normalizedQuery: string;
  sampleQuery: string;
  occurrenceCount: number;
  firstSeen: Date;
  lastSeen: Date;
  averageDuration: number;
  totalDuration: number;
  sourceLocations: string[];
  sampleParameters: any[];
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface QueryStats {
  normalizedQuery: string;
  sampleQuery: string;
  count: number;
  avgDuration: number;
  minDuration: number;
  maxDuration: number;
  p95Duration: number;
  totalDuration: number;
  lastSeen: Date;
}

const N_PLUS_ONE_THRESHOLD = 5;
const N_PLUS_ONE_WINDOW_MS = 5000;
const MAX_QUERY_HISTORY = 10000;
const MAX_QUERY_STATS = 500;

/**
 * TypeORM's public `Driver` interface does not expose `query()` — it is an
 * implementation detail of concrete drivers (Postgres, MySQL, etc). This
 * narrow type describes only the shape this service needs to monkey-patch,
 * and is paired with a runtime `typeof` guard before use.
 */
interface InterceptableDriver {
  query?: (
    query: string,
    parameters?: unknown[],
    ...args: unknown[]
  ) => unknown;
}

@Injectable()
export class QueryAnalysisService implements OnModuleInit {
  private readonly logger = new Logger(QueryAnalysisService.name);
  private queryHistory: QueryRecord[] = [];
  private queryStatsMap: Map<string, QueryStats> = new Map();
  private nPlusOneCandidates: Map<
    string,
    { records: QueryRecord[]; lastReset: number }
  > = new Map();
  private nPlusOneReports: NPlusOneReport[] = [];
  private readonly maxHistory = MAX_QUERY_HISTORY;
  private readonly maxStats = MAX_QUERY_STATS;
  private intercepting = false;

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly queryThreshold: QueryThresholdConfig,
  ) {}

  onModuleInit(): void {
    this.setupQueryInterceptor();
  }

  private setupQueryInterceptor(): void {
    if (this.intercepting) return;
    this.intercepting = true;

    try {
      const driver = this.dataSource.driver as unknown as InterceptableDriver;
      if (!driver || typeof driver.query !== 'function') {
        this.logger.warn(
          'DataSource driver does not support query interception',
        );
        return;
      }

      const originalQuery = driver.query.bind(driver);

      driver.query = (query: string, parameters: any[], ...args: any[]) => {
        const start = Date.now();
        const stackTrace = new Error().stack || '';

        const promise = originalQuery(query, parameters, ...args);

        if (promise && typeof promise.then === 'function') {
          return promise
            .then((result: any) => {
              const duration = Date.now() - start;
              this.recordQuery(query, parameters, duration, stackTrace);
              return result;
            })
            .catch((error: any) => {
              const duration = Date.now() - start;
              this.recordQuery(query, parameters, duration, stackTrace);
              throw error;
            });
        }

        return promise;
      };

      this.logger.log('Database query interceptor installed successfully');
    } catch (error: any) {
      this.logger.error(
        `Failed to install query interceptor: ${error.message}`,
      );
    }
  }

  private normalizeQuery(query: string): string {
    return query
      .replace(/\$(\d+)/g, '?')
      .replace(/'[^']*'/g, "'?'")
      .replace(/\b\d+\b/g, '?')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private recordQuery(
    query: string,
    parameters: any[],
    duration: number,
    stackTrace: string,
  ): void {
    if (!query || query.trim().startsWith('--')) return;

    const normalizedQuery = this.normalizeQuery(query);
    const record: QueryRecord = {
      query,
      normalizedQuery,
      parameters: parameters || [],
      duration,
      timestamp: new Date(),
      stackTrace: this.extractRelevantStack(stackTrace),
    };

    this.queryHistory.push(record);
    if (this.queryHistory.length > this.maxHistory) {
      this.queryHistory.shift();
    }

    this.updateQueryStats(normalizedQuery, query, duration);
    this.detectNPlusOne(normalizedQuery, record);
  }

  private extractRelevantStack(stack: string): string {
    const lines = stack.split('\n');
    const relevant: string[] = [];
    let found = false;

    for (const line of lines) {
      if (
        line.includes('node_modules/typeorm') ||
        line.includes('node_modules/ pg') ||
        line.includes('QueryAnalysisService')
      ) {
        found = true;
        continue;
      }
      if (found && line.trim().startsWith('at ')) {
        if (!line.includes('node_modules')) {
          relevant.push(line.trim());
        }
      }
    }

    return (
      relevant.slice(0, 5).join('\n') ||
      stack.split('\n').slice(2, 5).join('\n')
    );
  }

  private updateQueryStats(
    normalizedQuery: string,
    sampleQuery: string,
    duration: number,
  ): void {
    const existing = this.queryStatsMap.get(normalizedQuery);
    if (existing) {
      existing.count++;
      existing.avgDuration =
        (existing.avgDuration * (existing.count - 1) + duration) /
        existing.count;
      existing.minDuration = Math.min(existing.minDuration, duration);
      existing.maxDuration = Math.max(existing.maxDuration, duration);
      existing.totalDuration += duration;
      existing.lastSeen = new Date();
    } else {
      this.queryStatsMap.set(normalizedQuery, {
        normalizedQuery,
        sampleQuery,
        count: 1,
        avgDuration: duration,
        minDuration: duration,
        maxDuration: duration,
        p95Duration: duration,
        totalDuration: duration,
        lastSeen: new Date(),
      });

      if (this.queryStatsMap.size > this.maxStats) {
        const oldest = [...this.queryStatsMap.entries()].sort(
          (a, b) => a[1].lastSeen.getTime() - b[1].lastSeen.getTime(),
        )[0];
        if (oldest) this.queryStatsMap.delete(oldest[0]);
      }
    }
  }

  private detectNPlusOne(normalizedQuery: string, record: QueryRecord): void {
    const now = Date.now();
    const candidate = this.nPlusOneCandidates.get(normalizedQuery);

    if (candidate) {
      if (now - candidate.lastReset > N_PLUS_ONE_WINDOW_MS) {
        if (candidate.records.length >= N_PLUS_ONE_THRESHOLD) {
          this.createNPlusOneReport(normalizedQuery, candidate.records);
        }
        this.nPlusOneCandidates.set(normalizedQuery, {
          records: [record],
          lastReset: now,
        });
      } else {
        candidate.records.push(record);
        candidate.lastReset = now;

        if (
          candidate.records.length >= N_PLUS_ONE_THRESHOLD &&
          candidate.records.length % N_PLUS_ONE_THRESHOLD === 0
        ) {
          this.createNPlusOneReport(normalizedQuery, candidate.records);
        }
      }
    } else {
      this.nPlusOneCandidates.set(normalizedQuery, {
        records: [record],
        lastReset: now,
      });
    }

    const cutoff = now - N_PLUS_ONE_WINDOW_MS * 2;
    for (const [key, val] of this.nPlusOneCandidates.entries()) {
      if (val.lastReset < cutoff) {
        this.nPlusOneCandidates.delete(key);
      }
    }
  }

  private createNPlusOneReport(
    normalizedQuery: string,
    records: QueryRecord[],
  ): void {
    const totalDuration = records.reduce((sum, r) => sum + r.duration, 0);
    const avgDuration = totalDuration / records.length;
    const sourceLocations = [
      ...new Set(records.map((r) => r.stackTrace.split('\n')[0] || 'unknown')),
    ];

    const severity =
      records.length >= 20 || avgDuration > 500
        ? 'critical'
        : records.length >= 10 || avgDuration > 200
          ? 'high'
          : records.length >= 7
            ? 'medium'
            : 'low';

    const existingIndex = this.nPlusOneReports.findIndex(
      (r) => r.normalizedQuery === normalizedQuery,
    );

    const report: NPlusOneReport = {
      id: `nplus1_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      normalizedQuery,
      sampleQuery: records[0].query,
      occurrenceCount: records.length,
      firstSeen: records[0].timestamp,
      lastSeen: records[records.length - 1].timestamp,
      averageDuration: avgDuration,
      totalDuration,
      sourceLocations,
      sampleParameters: records[0].parameters,
      severity,
    };

    if (existingIndex >= 0) {
      const existing = this.nPlusOneReports[existingIndex];
      existing.occurrenceCount += records.length;
      existing.lastSeen = report.lastSeen;
      existing.averageDuration = (existing.averageDuration + avgDuration) / 2;
      existing.totalDuration += totalDuration;
      existing.severity = severity;
      existing.sourceLocations = [
        ...new Set([...existing.sourceLocations, ...sourceLocations]),
      ];
    } else {
      this.nPlusOneReports.unshift(report);
    }

    if (this.nPlusOneReports.length > 100) {
      this.nPlusOneReports.pop();
    }

    this.logger.warn(
      `N+1 query detected: "${normalizedQuery.substring(0, 80)}..." repeated ${records.length} times ` +
        `(avg ${avgDuration.toFixed(1)}ms each, total ${totalDuration.toFixed(0)}ms) ` +
        `from ${sourceLocations[0] || 'unknown location'}`,
    );
  }

  getQueryStats(): {
    totalQueriesTracked: number;
    uniqueQueryPatterns: number;
    nPlusOneReports: number;
    slowQueryCount: number;
    slowQueryThresholdMs: number;
    topQueries: QueryStats[];
    slowestQueries: QueryStats[];
  } {
    const stats = [...this.queryStatsMap.values()];

    return {
      totalQueriesTracked: this.queryHistory.length,
      uniqueQueryPatterns: stats.length,
      nPlusOneReports: this.nPlusOneReports.length,
      // Each pattern is compared against the threshold for its own query
      // class (select/insert/update/delete/other) — see QueryThresholdConfig.
      slowQueryCount: stats.filter((s) =>
        this.isSlow(s.sampleQuery, s.avgDuration),
      ).length,
      slowQueryThresholdMs: this.queryThreshold.defaultThreshold,
      topQueries: stats.sort((a, b) => b.count - a.count).slice(0, 10),
      slowestQueries: stats
        .sort((a, b) => b.avgDuration - a.avgDuration)
        .slice(0, 10),
    };
  }

  /** True when a query's duration exceeds the threshold for its class. */
  private isSlow(query: string, duration: number): boolean {
    return duration > this.queryThreshold.thresholdFor(query);
  }

  getQueryHistory(limit = 100, minDuration?: number): QueryRecord[] {
    let results = this.queryHistory;

    if (minDuration !== undefined) {
      results = results.filter((r) => r.duration >= minDuration);
    }

    return results.slice(-limit).reverse();
  }

  getNPlusOneReports(
    severity?: 'low' | 'medium' | 'high' | 'critical',
  ): NPlusOneReport[] {
    if (severity) {
      const severityOrder = ['low', 'medium', 'high', 'critical'];
      const minLevel = severityOrder.indexOf(severity);
      return this.nPlusOneReports
        .filter((r) => severityOrder.indexOf(r.severity) >= minLevel)
        .sort(
          (a, b) =>
            severityOrder.indexOf(b.severity) -
            severityOrder.indexOf(a.severity),
        );
    }

    return [...this.nPlusOneReports].sort(
      (a, b) => b.occurrenceCount - a.occurrenceCount,
    );
  }

  getQueryPatterns(search?: string): QueryStats[] {
    const stats = [...this.queryStatsMap.values()];

    if (search) {
      const lower = search.toLowerCase();
      return stats
        .filter(
          (s) =>
            s.normalizedQuery.toLowerCase().includes(lower) ||
            s.sampleQuery.toLowerCase().includes(lower),
        )
        .sort((a, b) => b.totalDuration - a.totalDuration);
    }

    return stats.sort((a, b) => b.totalDuration - a.totalDuration);
  }

  getQueryAnalysisReport(): any {
    const stats = this.getQueryStats();
    const nPlusOneAlerts = this.getNPlusOneReports('medium');
    // Per-record filtering (rather than one flat minDuration) so a fast
    // default-class query and a slow override-class query are each judged
    // against their own threshold.
    const recentSlowQueries = this.queryHistory
      .filter((r) => this.isSlow(r.query, r.duration))
      .slice(-50)
      .reverse();

    return {
      generatedAt: new Date().toISOString(),
      summary: {
        totalQueriesTracked: stats.totalQueriesTracked,
        uniquePatterns: stats.uniqueQueryPatterns,
        nPlusOneDetected: stats.nPlusOneReports,
        slowQueries: stats.slowQueryCount,
        slowQueryThresholdMs: stats.slowQueryThresholdMs,
      },
      frequentQueries: stats.topQueries,
      slowestQueries: stats.slowestQueries,
      nPlusOneAlerts: nPlusOneAlerts.slice(0, 20),
      recentSlowQueries: recentSlowQueries.slice(0, 20),
    };
  }

  resetAnalysis(): void {
    this.queryHistory = [];
    this.queryStatsMap.clear();
    this.nPlusOneCandidates.clear();
    this.nPlusOneReports = [];
    this.logger.log('Query analysis data reset');
  }
}
