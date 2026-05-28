import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { MetricsService } from './metrics.service';
import { AlertService } from './alert.service';
import { AlertPayload } from './alert.types';

export interface PerformanceMetrics {
  timestamp: Date;
  endpoint: string;
  method: string;
  responseTime: number;
  statusCode: number;
  userAgent?: string;
  userId?: string;
  memoryUsage: NodeJS.MemoryUsage;
  cpuUsage?: number;
}

/** Requests exceeding this duration (ms) are classified as slow. Overridden by RESPONSE_TIME_SLOW_THRESHOLD_MS (falls back to LOG_SLOW_REQUEST_THRESHOLD for backwards compat). */
export const SLOW_REQUEST_THRESHOLD_MS: number =
  parseInt(process.env.RESPONSE_TIME_SLOW_THRESHOLD_MS ?? process.env.LOG_SLOW_REQUEST_THRESHOLD ?? '1000', 10);

export interface PerformanceThreshold {
  endpoint: string;
  maxResponseTime: number; // milliseconds
  maxErrorRate: number; // percentage
  minThroughput: number; // requests per minute
}

export interface PerformanceAlert {
  type: 'response_time' | 'error_rate' | 'throughput' | 'memory' | 'cpu';
  severity: 'warning' | 'critical';
  message: string;
  metrics: any;
  timestamp: Date;
}

@Injectable()
export class PerformanceMonitorService {
  private readonly logger = new Logger(PerformanceMonitorService.name);
  private readonly performanceData: Map<string, PerformanceMetrics[]> =
    new Map();
  private readonly performanceThresholds: PerformanceThreshold[] = [
    {
      endpoint: '/health',
      maxResponseTime: 100,
      maxErrorRate: 1,
      minThroughput: 100,
    },
    {
      endpoint: '/health/detailed',
      maxResponseTime: 200,
      maxErrorRate: 2,
      minThroughput: 50,
    },
    {
      endpoint: '/api/auth/login',
      maxResponseTime: 1000,
      maxErrorRate: 5,
      minThroughput: 20,
    },
    {
      endpoint: '/api/properties',
      maxResponseTime: 1500,
      maxErrorRate: 3,
      minThroughput: 30,
    },
    {
      endpoint: '/api/payments',
      maxResponseTime: 3000,
      maxErrorRate: 2,
      minThroughput: 10,
    },
  ];

  // Memory usage tracking
  private memoryUsageHistory: NodeJS.MemoryUsage[] = [];
  private readonly MAX_HISTORY_SIZE: number =
    parseInt(process.env.RESPONSE_TIME_BUFFER_SIZE ?? '1000', 10);

  // Database query performance tracking (per operation)
  private readonly databaseQueryData: Map<string, number[]> = new Map();
  private readonly slowQueries: Array<{
    operation: string;
    duration: number;
    timestamp: Date;
  }> = [];
  private readonly SLOW_QUERY_THRESHOLD_MS = 500;
  private readonly MAX_SLOW_QUERY_HISTORY = 100;

  constructor(
    private readonly metricsService: MetricsService,
    private readonly alertService: AlertService,
  ) {
    this.logger.log('Performance Monitor Service initialized');
  }

  /**
   * Record performance metrics for an HTTP request
   */
  recordRequestMetrics(metrics: PerformanceMetrics): void {
    const key = `${metrics.method}:${metrics.endpoint}`;

    if (!this.performanceData.has(key)) {
      this.performanceData.set(key, []);
    }

    const endpointData = this.performanceData.get(key)!;
    endpointData.push(metrics);

    // Keep only recent data (last 1000 requests per endpoint)
    if (endpointData.length > this.MAX_HISTORY_SIZE) {
      endpointData.shift();
    }

    // Record in metrics service
    this.metricsService.recordHttpRequest(
      metrics.method,
      metrics.endpoint,
      metrics.statusCode,
    );
    this.metricsService.recordHttpDuration(
      metrics.method,
      metrics.endpoint,
      metrics.statusCode,
      metrics.responseTime,
    );

    // Check thresholds immediately for critical issues
    this.checkPerformanceThresholds(key, metrics);
  }

  /**
   * Record the duration of a database query for an operation (e.g. a repository
   * method). Wired from the `DatabasePerformanceTrack` decorator. Durations are
   * forwarded to the metrics service and slow queries are tracked for
   * bottleneck detection.
   */
  recordDatabaseQuery(operation: string, duration: number): void {
    const durations = this.databaseQueryData.get(operation) ?? [];
    durations.push(duration);
    if (durations.length > this.MAX_HISTORY_SIZE) {
      durations.shift();
    }
    this.databaseQueryData.set(operation, durations);

    this.metricsService.recordDatabaseQuery(operation, duration);

    if (duration >= this.SLOW_QUERY_THRESHOLD_MS) {
      this.slowQueries.push({ operation, duration, timestamp: new Date() });
      if (this.slowQueries.length > this.MAX_SLOW_QUERY_HISTORY) {
        this.slowQueries.shift();
      }
      this.logger.warn(
        `Slow database query: ${operation} took ${duration}ms (threshold: ${this.SLOW_QUERY_THRESHOLD_MS}ms)`,
      );
    }
  }

  /**
   * Aggregated database query statistics, including the slowest operations
   * (bottleneck detection) and recent slow queries.
   */
  getDatabaseStats(): {
    timestamp: Date;
    totalQueries: number;
    slowQueryThresholdMs: number;
    operations: Array<{
      operation: string;
      count: number;
      avgDuration: number;
      minDuration: number;
      maxDuration: number;
      p95Duration: number;
      slowCount: number;
    }>;
    slowestOperations: Array<{ operation: string; avgDuration: number }>;
    recentSlowQueries: Array<{
      operation: string;
      duration: number;
      timestamp: Date;
    }>;
  } {
    const operations = Array.from(this.databaseQueryData.entries()).map(
      ([operation, durations]) => ({
        operation,
        count: durations.length,
        avgDuration: this.calculateAverage(durations),
        minDuration: Math.min(...durations),
        maxDuration: Math.max(...durations),
        p95Duration: this.calculatePercentile(durations, 95),
        slowCount: durations.filter((d) => d >= this.SLOW_QUERY_THRESHOLD_MS)
          .length,
      }),
    );

    const totalQueries = operations.reduce((sum, op) => sum + op.count, 0);
    const slowestOperations = [...operations]
      .sort((a, b) => b.avgDuration - a.avgDuration)
      .slice(0, 5)
      .map(({ operation, avgDuration }) => ({ operation, avgDuration }));

    return {
      timestamp: new Date(),
      totalQueries,
      slowQueryThresholdMs: this.SLOW_QUERY_THRESHOLD_MS,
      operations,
      slowestOperations,
      recentSlowQueries: this.slowQueries.slice(-20),
    };
  }

  /**
   * Get performance statistics for an endpoint
   */
  getEndpointStats(method: string, endpoint: string): any {
    const key = `${method}:${endpoint}`;
    const data = this.performanceData.get(key) || [];

    if (data.length === 0) {
      return null;
    }

    return this.buildEndpointStats(method, endpoint, data);
  }

  /**
   * Build stats object from raw data — shared by getEndpointStats and getSystemStats.
   */
  private buildEndpointStats(
    method: string,
    endpoint: string,
    data: PerformanceMetrics[],
  ): any {
    const responseTimes = data.map((d) => d.responseTime);
    const errorCount = data.filter((d) => d.statusCode >= 400).length;
    const recentData = data.filter(
      (d) => Date.now() - d.timestamp.getTime() < 60000,
    ); // Last minute

    return {
      endpoint,
      method,
      totalRequests: data.length,
      recentRequests: recentData.length,
      avgResponseTime: this.calculateAverage(responseTimes),
      minResponseTime: Math.min(...responseTimes),
      maxResponseTime: Math.max(...responseTimes),
      p50ResponseTime: this.calculatePercentile(responseTimes, 50),
      p95ResponseTime: this.calculatePercentile(responseTimes, 95),
      p99ResponseTime: this.calculatePercentile(responseTimes, 99),
      errorRate: (errorCount / data.length) * 100,
      throughput: recentData.length, // requests per minute
      lastUpdated: data[data.length - 1].timestamp,
    };
  }

  /**
   * Return the response-time summary for all routes within a sliding window.
   * This is the data source for GET /api/performance/response-times.
   */
  getResponseTimeStats(windowSeconds = parseInt(process.env.RESPONSE_TIME_WINDOW_SECONDS ?? '60', 10)): {
    generatedAt: Date;
    windowSeconds: number;
    routes: Array<{
      route: string;
      count: number;
      rps: number;
      p50Ms: number;
      p95Ms: number;
      p99Ms: number;
      slowCount: number;
    }>;
  } {
    const cutoff = Date.now() - windowSeconds * 1000;
    const routes: ReturnType<typeof this.getResponseTimeStats>['routes'] = [];

    for (const [key, data] of this.performanceData.entries()) {
      const window = data.filter((d) => d.timestamp.getTime() > cutoff);
      if (window.length === 0) continue;

      const colonIdx = key.indexOf(':');
      const method = key.slice(0, colonIdx);
      const endpoint = key.slice(colonIdx + 1);
      const times = window.map((d) => d.responseTime);

      routes.push({
        route: `${method} ${endpoint}`,
        count: window.length,
        rps: parseFloat((window.length / windowSeconds).toFixed(2)),
        p50Ms: this.calculatePercentile(times, 50),
        p95Ms: this.calculatePercentile(times, 95),
        p99Ms: this.calculatePercentile(times, 99),
        slowCount: window.filter(
          (d) => d.responseTime > SLOW_REQUEST_THRESHOLD_MS,
        ).length,
      });
    }

    routes.sort((a, b) => b.p99Ms - a.p99Ms);

    return { generatedAt: new Date(), windowSeconds, routes };
  }

  /**
   * Return the N slowest endpoints by average response time.
   */
  getSlowEndpoints(limit = 10, thresholdMs = 0): any[] {
    const results: any[] = [];

    for (const [key, data] of this.performanceData.entries()) {
      if (data.length === 0) continue;
      // Split only on the FIRST colon so paths like /api/items/:id are preserved.
      const colonIdx = key.indexOf(':');
      const method = key.slice(0, colonIdx);
      const endpoint = key.slice(colonIdx + 1);
      const stats = this.buildEndpointStats(method, endpoint, data);
      if (stats.avgResponseTime >= thresholdMs) {
        results.push(stats);
      }
    }

    return results
      .sort((a, b) => b.avgResponseTime - a.avgResponseTime)
      .slice(0, limit);
  }

  /**
   * Return percentile breakdown for a specific endpoint.
   */
  getEndpointPercentiles(
    method: string,
    endpoint: string,
  ): { p50: number; p75: number; p90: number; p95: number; p99: number } | null {
    const key = `${method}:${endpoint}`;
    const data = this.performanceData.get(key);
    if (!data || data.length === 0) return null;

    const responseTimes = data.map((d) => d.responseTime);
    return {
      p50: this.calculatePercentile(responseTimes, 50),
      p75: this.calculatePercentile(responseTimes, 75),
      p90: this.calculatePercentile(responseTimes, 90),
      p95: this.calculatePercentile(responseTimes, 95),
      p99: this.calculatePercentile(responseTimes, 99),
    };
  }

  /**
   * Return percentile breakdown for ALL tracked endpoints.
   */
  getAllEndpointPercentiles(): any[] {
    const results: any[] = [];

    for (const [key, data] of this.performanceData.entries()) {
      if (data.length === 0) continue;
      const colonIdx = key.indexOf(':');
      const method = key.slice(0, colonIdx);
      const endpoint = key.slice(colonIdx + 1);
      const responseTimes = data.map((d) => d.responseTime);
      results.push({
        method,
        endpoint,
        sampleSize: data.length,
        p50: this.calculatePercentile(responseTimes, 50),
        p75: this.calculatePercentile(responseTimes, 75),
        p90: this.calculatePercentile(responseTimes, 90),
        p95: this.calculatePercentile(responseTimes, 95),
        p99: this.calculatePercentile(responseTimes, 99),
      });
    }

    return results.sort((a, b) => b.p95 - a.p95);
  }

  /**
   * Get overall system performance statistics
   */
  getSystemStats(): any {
    const currentMemory = process.memoryUsage();
    this.memoryUsageHistory.push(currentMemory);

    // Keep only recent memory data
    if (this.memoryUsageHistory.length > 100) {
      this.memoryUsageHistory.shift();
    }

    const allEndpoints = Array.from(this.performanceData.keys());
    const endpointStats = allEndpoints
      .map((key) => {
        const colonIdx = key.indexOf(':');
        const method = key.slice(0, colonIdx);
        const endpoint = key.slice(colonIdx + 1);
        return this.getEndpointStats(method, endpoint);
      })
      .filter(Boolean);

    const totalRequests = endpointStats.reduce(
      (sum, stat) => sum + stat.totalRequests,
      0,
    );
    const avgResponseTime =
      endpointStats.length > 0
        ? endpointStats.reduce((sum, stat) => sum + stat.avgResponseTime, 0) /
          endpointStats.length
        : 0;

    return {
      timestamp: new Date(),
      totalEndpoints: allEndpoints.length,
      totalRequests,
      avgResponseTime,
      memoryUsage: {
        current: currentMemory,
        trend: this.calculateMemoryTrend(),
      },
      endpointStats,
      uptime: process.uptime(),
    };
  }

  /**
   * Check performance thresholds and trigger alerts
   */
  private checkPerformanceThresholds(
    key: string,
    metrics: PerformanceMetrics,
  ): void {
    const colonIdx = key.indexOf(':');
    const endpoint = key.slice(colonIdx + 1);
    const threshold = this.performanceThresholds.find(
      (t) => t.endpoint === endpoint,
    );

    if (!threshold) return;

    const endpointData = this.performanceData.get(key) || [];
    const recentData = endpointData.filter(
      (d) => Date.now() - d.timestamp.getTime() < 60000,
    );

    // Check response time
    if (metrics.responseTime > threshold.maxResponseTime) {
      this.triggerAlert({
        type: 'response_time',
        severity:
          metrics.responseTime > threshold.maxResponseTime * 2
            ? 'critical'
            : 'warning',
        message: `High response time detected for ${endpoint}: ${metrics.responseTime}ms (threshold: ${threshold.maxResponseTime}ms)`,
        metrics: {
          endpoint,
          responseTime: metrics.responseTime,
          threshold: threshold.maxResponseTime,
        },
        timestamp: new Date(),
      });
    }

    // Check error rate (only if we have enough data)
    if (recentData.length >= 10) {
      const recentErrors = recentData.filter((d) => d.statusCode >= 400).length;
      const errorRate = (recentErrors / recentData.length) * 100;

      if (errorRate > threshold.maxErrorRate) {
        this.triggerAlert({
          type: 'error_rate',
          severity:
            errorRate > threshold.maxErrorRate * 2 ? 'critical' : 'warning',
          message: `High error rate detected for ${endpoint}: ${errorRate.toFixed(2)}% (threshold: ${threshold.maxErrorRate}%)`,
          metrics: { endpoint, errorRate, threshold: threshold.maxErrorRate },
          timestamp: new Date(),
        });
      }
    }

    // Check throughput
    if (recentData.length < threshold.minThroughput) {
      this.triggerAlert({
        type: 'throughput',
        severity:
          recentData.length < threshold.minThroughput * 0.5
            ? 'critical'
            : 'warning',
        message: `Low throughput detected for ${endpoint}: ${recentData.length} req/min (threshold: ${threshold.minThroughput} req/min)`,
        metrics: {
          endpoint,
          throughput: recentData.length,
          threshold: threshold.minThroughput,
        },
        timestamp: new Date(),
      });
    }
  }

  /**
   * Trigger performance alert
   */
  private async triggerAlert(alert: PerformanceAlert): Promise<void> {
    this.logger.warn(
      `Performance Alert [${alert.severity.toUpperCase()}]: ${alert.message}`,
    );

    try {
      // Convert to AlertPayload format
      const alertPayload: AlertPayload = {
        status: 'firing',
        labels: {
          alertname: `performance_${alert.type}`,
          severity: alert.severity,
          service: 'chioma-backend',
        },
        annotations: {
          summary: alert.message,
          description: `Performance issue detected: ${alert.message}`,
        },
        startsAt: alert.timestamp.toISOString(),
        generatorURL: 'http://localhost:5000/api/performance/dashboard',
      };

      await this.alertService.handleAlert({
        alerts: [alertPayload],
      });
    } catch (error) {
      this.logger.error('Failed to send performance alert:', error);
    }
  }

  /**
   * Periodic system health check
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async performSystemHealthCheck(): Promise<void> {
    const memoryUsage = process.memoryUsage();
    const memoryUsageMB = memoryUsage.heapUsed / 1024 / 1024;

    // Check memory usage
    if (memoryUsageMB > 512) {
      // 512MB threshold
      this.triggerAlert({
        type: 'memory',
        severity: memoryUsageMB > 1024 ? 'critical' : 'warning',
        message: `High memory usage detected: ${memoryUsageMB.toFixed(2)}MB`,
        metrics: { memoryUsage: memoryUsageMB },
        timestamp: new Date(),
      });
    }

    // Log system stats periodically
    if (Date.now() % (5 * 60 * 1000) < 60000) {
      // Every 5 minutes
      const systemStats = this.getSystemStats();
      this.logger.log(
        `System Performance: ${systemStats.totalRequests} total requests, ${systemStats.avgResponseTime.toFixed(2)}ms avg response time, ${memoryUsageMB.toFixed(2)}MB memory`,
      );
    }
  }

  /**
   * Generate performance report
   */
  generatePerformanceReport(): any {
    const systemStats = this.getSystemStats();
    const slowestEndpoints = systemStats.endpointStats
      .sort((a, b) => b.avgResponseTime - a.avgResponseTime)
      .slice(0, 5);

    const highestErrorRates = systemStats.endpointStats
      .filter((stat) => stat.errorRate > 0)
      .sort((a, b) => b.errorRate - a.errorRate)
      .slice(0, 5);

    return {
      timestamp: new Date(),
      summary: {
        totalEndpoints: systemStats.totalEndpoints,
        totalRequests: systemStats.totalRequests,
        avgResponseTime: systemStats.avgResponseTime,
        uptime: systemStats.uptime,
        memoryUsage: systemStats.memoryUsage.current.heapUsed / 1024 / 1024,
      },
      slowestEndpoints,
      highestErrorRates,
      thresholds: this.performanceThresholds,
      recommendations: this.generateRecommendations(systemStats),
    };
  }

  /**
   * Generate performance recommendations
   */
  private generateRecommendations(systemStats: any): string[] {
    const recommendations: string[] = [];

    // Check for slow endpoints
    const slowEndpoints = systemStats.endpointStats.filter(
      (stat) => stat.avgResponseTime > SLOW_REQUEST_THRESHOLD_MS,
    );
    if (slowEndpoints.length > 0) {
      recommendations.push(
        `Consider optimizing ${slowEndpoints.length} slow endpoints with average response time > ${SLOW_REQUEST_THRESHOLD_MS}ms`,
      );
    }

    // Check for high error rates
    const errorEndpoints = systemStats.endpointStats.filter(
      (stat) => stat.errorRate > 5,
    );
    if (errorEndpoints.length > 0) {
      recommendations.push(
        `Investigate ${errorEndpoints.length} endpoints with error rate > 5%`,
      );
    }

    // Check memory usage
    const memoryUsageMB =
      systemStats.memoryUsage.current.heapUsed / 1024 / 1024;
    if (memoryUsageMB > 256) {
      recommendations.push(
        `Consider memory optimization - current usage: ${memoryUsageMB.toFixed(2)}MB`,
      );
    }

    // Check throughput
    const lowThroughputEndpoints = systemStats.endpointStats.filter(
      (stat) => stat.throughput < 10,
    );
    if (lowThroughputEndpoints.length > 0) {
      recommendations.push(
        `Monitor ${lowThroughputEndpoints.length} endpoints with low throughput`,
      );
    }

    return recommendations;
  }

  /**
   * Utility methods
   */
  private calculateAverage(numbers: number[]): number {
    return numbers.length > 0
      ? numbers.reduce((a, b) => a + b, 0) / numbers.length
      : 0;
  }

  private calculatePercentile(numbers: number[], percentile: number): number {
    if (numbers.length === 0) return 0;
    const sorted = [...numbers].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  private calculateMemoryTrend(): 'increasing' | 'decreasing' | 'stable' {
    if (this.memoryUsageHistory.length < 10) return 'stable';

    const recent = this.memoryUsageHistory.slice(-10);
    const older = this.memoryUsageHistory.slice(-20, -10);

    const recentAvg =
      recent.reduce((sum, mem) => sum + mem.heapUsed, 0) / recent.length;
    const olderAvg =
      older.reduce((sum, mem) => sum + mem.heapUsed, 0) / older.length;

    const difference = (recentAvg - olderAvg) / olderAvg;

    if (difference > 0.1) return 'increasing';
    if (difference < -0.1) return 'decreasing';
    return 'stable';
  }

  /**
   * Clear old performance data
   */
  @Cron(CronExpression.EVERY_HOUR)
  cleanupOldData(): void {
    const cutoffTime = Date.now() - 24 * 60 * 60 * 1000; // 24 hours ago

    for (const [key, data] of this.performanceData.entries()) {
      const filteredData = data.filter(
        (d) => d.timestamp.getTime() > cutoffTime,
      );
      this.performanceData.set(key, filteredData);
    }

    this.logger.debug('Cleaned up old performance data');
  }
}
