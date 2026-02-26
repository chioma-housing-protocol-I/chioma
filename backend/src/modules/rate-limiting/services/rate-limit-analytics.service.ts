import { Injectable, Logger, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RateLimitMetrics } from '../types/rate-limit.types';
import { ANALYTICS_CONFIG } from '../config/rate-limit.config';

interface MetricSnapshot {
  timestamp: number;
  totalRequests: number;
  blockedRequests: number;
  uniqueIdentifiers: Set<string>;
  abuseDetections: number;
  responseTimes: number[];
}

@Injectable()
export class RateLimitAnalyticsService {
  private readonly logger = new Logger(RateLimitAnalyticsService.name);
  private currentSnapshot: MetricSnapshot = this.createSnapshot();

  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  async recordRequest(identifier: string, blocked: boolean, responseTime: number): Promise<void> {
    this.currentSnapshot.totalRequests++;
    if (blocked) {
      this.currentSnapshot.blockedRequests++;
    }
    this.currentSnapshot.uniqueIdentifiers.add(identifier);
    this.currentSnapshot.responseTimes.push(responseTime);
  }

  async recordAbuseDetection(identifier: string): Promise<void> {
    this.currentSnapshot.abuseDetections++;
    this.logger.warn(`Abuse detected: ${identifier}`);
  }

  async getMetrics(): Promise<RateLimitMetrics> {
    const snapshot = this.currentSnapshot;
    return {
      totalRequests: snapshot.totalRequests,
      blockedRequests: snapshot.blockedRequests,
      uniqueUsers: snapshot.uniqueIdentifiers.size,
      abuseDetections: snapshot.abuseDetections,
      averageResponseTime: this.calculateAverageResponseTime(snapshot.responseTimes),
    };
  }

  async getHistoricalMetrics(hours: number = 24): Promise<RateLimitMetrics[]> {
    const metrics: RateLimitMetrics[] = [];
    const endTime = Date.now();
    const startTime = endTime - hours * 3600 * 1000;

    for (let time = startTime; time < endTime; time += ANALYTICS_CONFIG.aggregationInterval * 1000) {
      const key = `metrics:snapshot:${Math.floor(time / 1000)}`;
      const snapshot = await this.cacheManager.get<any>(key);
      if (snapshot) {
        metrics.push({
          totalRequests: snapshot.totalRequests,
          blockedRequests: snapshot.blockedRequests,
          uniqueUsers: snapshot.uniqueIdentifiers?.length || 0,
          abuseDetections: snapshot.abuseDetections,
          averageResponseTime: snapshot.averageResponseTime,
        });
      }
    }

    return metrics;
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async aggregateMetrics(): Promise<void> {
    try {
      const metrics = await this.getMetrics();
      const timestamp = Math.floor(Date.now() / 1000);
      const key = `metrics:snapshot:${timestamp}`;

      await this.cacheManager.set(
        key,
        {
          ...metrics,
          uniqueIdentifiers: Array.from(this.currentSnapshot.uniqueIdentifiers),
          averageResponseTime: metrics.averageResponseTime,
        },
        ANALYTICS_CONFIG.metricsRetentionDays * 24 * 3600 * 1000,
      );

      await this.checkThresholds(metrics);

      this.currentSnapshot = this.createSnapshot();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to aggregate metrics: ${message}`);
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  async cleanupOldMetrics(): Promise<void> {
    this.logger.log('Cleaning up old rate limit metrics');
  }

  private createSnapshot(): MetricSnapshot {
    return {
      timestamp: Date.now(),
      totalRequests: 0,
      blockedRequests: 0,
      uniqueIdentifiers: new Set<string>(),
      abuseDetections: 0,
      responseTimes: [],
    };
  }

  private calculateAverageResponseTime(responseTimes: number[]): number {
    if (responseTimes.length === 0) return 0;
    const sum = responseTimes.reduce((acc, time) => acc + time, 0);
    return sum / responseTimes.length;
  }

  private async checkThresholds(metrics: RateLimitMetrics): Promise<void> {
    const blockedPercentage = metrics.totalRequests > 0 
      ? (metrics.blockedRequests / metrics.totalRequests) * 100 
      : 0;

    if (blockedPercentage > ANALYTICS_CONFIG.alertThresholds.blockedRequestsPercentage) {
      this.logger.warn(
        `High blocked request rate: ${blockedPercentage.toFixed(2)}% (${metrics.blockedRequests}/${metrics.totalRequests})`,
      );
    }

    if (metrics.abuseDetections > ANALYTICS_CONFIG.alertThresholds.abuseDetectionsPerHour / 12) {
      this.logger.warn(
        `High abuse detection rate: ${metrics.abuseDetections} in 5 minutes`,
      );
    }
  }
}
