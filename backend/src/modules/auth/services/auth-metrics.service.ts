import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThanOrEqual } from 'typeorm';
import { AuthMethod } from '../../users/entities/user.entity';
import { AuthMetric } from '../entities/auth-metric.entity';

export interface AuthAttemptData {
  authMethod: AuthMethod;
  success: boolean;
  duration: number; // in milliseconds
  ipAddress?: string;
  userAgent?: string;
  errorMessage?: string;
}

export interface AuthStats {
  totalAttempts: number;
  successfulAttempts: number;
  failedAttempts: number;
  successRate: number;
  averageDuration: number;
  methodBreakdown: {
    [key in AuthMethod]: {
      attempts: number;
      successes: number;
      failures: number;
      successRate: number;
      averageDuration: number;
    };
  };
  dailyTrend: Array<{
    date: string;
    attempts: number;
    successes: number;
    failures: number;
  }>;
  errorBreakdown: Array<{
    error: string;
    count: number;
    percentage: number;
  }>;
}

export interface PerformanceMetrics {
  method: AuthMethod;
  p50: number; // 50th percentile
  p95: number; // 95th percentile
  p99: number; // 99th percentile
  average: number;
  min: number;
  max: number;
}

@Injectable()
export class AuthMetricsService {
  private readonly logger = new Logger(AuthMetricsService.name);

  constructor(
    @InjectRepository(AuthMetric)
    private authMetricRepository: Repository<AuthMetric>,
  ) {}

  async recordAuthAttempt(data: AuthAttemptData): Promise<void> {
    try {
      const metric = this.authMetricRepository.create({
        authMethod: data.authMethod,
        success: data.success,
        duration: data.duration,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        errorMessage: data.errorMessage,
        timestamp: new Date(),
      });

      await this.authMetricRepository.save(metric);

      this.logger.debug(
        `Auth attempt recorded: ${data.authMethod} - ${data.success ? 'SUCCESS' : 'FAILURE'} (${data.duration}ms)`,
      );
    } catch (error) {
      this.logger.error('Failed to record auth attempt', error);
      // Don't throw error to avoid impacting auth flow
    }
  }

  async getAuthStats(days: number = 30): Promise<AuthStats> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const metrics = await this.authMetricRepository.find({
      where: {
        timestamp: MoreThanOrEqual(startDate),
      },
      order: {
        timestamp: 'DESC',
      },
    });

    const totalAttempts = metrics.length;
    const successfulAttempts = metrics.filter(m => m.success).length;
    const failedAttempts = totalAttempts - successfulAttempts;
    const successRate = totalAttempts > 0 ? (successfulAttempts / totalAttempts) * 100 : 0;
    const averageDuration = totalAttempts > 0 
      ? metrics.reduce((sum, m) => sum + m.duration, 0) / totalAttempts 
      : 0;

    // Method breakdown
    const methodBreakdown = {
      [AuthMethod.PASSWORD]: this.calculateMethodStats(metrics, AuthMethod.PASSWORD),
      [AuthMethod.STELLAR]: this.calculateMethodStats(metrics, AuthMethod.STELLAR),
    };

    // Daily trend
    const dailyTrend = this.calculateDailyTrend(metrics, days);

    // Error breakdown
    const errorBreakdown = this.calculateErrorBreakdown(metrics);

    return {
      totalAttempts,
      successfulAttempts,
      failedAttempts,
      successRate: Math.round(successRate * 100) / 100,
      averageDuration: Math.round(averageDuration * 100) / 100,
      methodBreakdown,
      dailyTrend,
      errorBreakdown,
    };
  }

  async getPerformanceMetrics(days: number = 30): Promise<PerformanceMetrics[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const metrics = await this.authMetricRepository.find({
      where: {
        timestamp: MoreThanOrEqual(startDate),
        success: true, // Only successful attempts for performance metrics
      },
    });

    const passwordMetrics = metrics.filter(m => m.authMethod === AuthMethod.PASSWORD);
    const stellarMetrics = metrics.filter(m => m.authMethod === AuthMethod.STELLAR);

    return [
      this.calculatePerformanceMetrics(AuthMethod.PASSWORD, passwordMetrics),
      this.calculatePerformanceMetrics(AuthMethod.STELLAR, stellarMetrics),
    ];
  }

  async getHourlyUsage(days: number = 7): Promise<Array<{
    hour: string;
    password: number;
    stellar: number;
    total: number;
  }>> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const metrics = await this.authMetricRepository.find({
      where: {
        timestamp: MoreThanOrEqual(startDate),
      },
    });

    // Group by hour
    const hourlyData = new Map<string, { password: number; stellar: number }>();

    metrics.forEach(metric => {
      const hour = metric.timestamp.toISOString().slice(0, 13); // YYYY-MM-DDTHH
      const current = hourlyData.get(hour) || { password: 0, stellar: 0 };

      if (metric.authMethod === AuthMethod.PASSWORD) {
        current.password++;
      } else if (metric.authMethod === AuthMethod.STELLAR) {
        current.stellar++;
      }

      hourlyData.set(hour, current);
    });

    // Convert to array and sort
    return Array.from(hourlyData.entries())
      .map(([hour, data]) => ({
        hour,
        password: data.password,
        stellar: data.stellar,
        total: data.password + data.stellar,
      }))
      .sort((a, b) => a.hour.localeCompare(b.hour));
  }

  async cleanupOldMetrics(daysToKeep: number = 90): Promise<void> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const result = await this.authMetricRepository.delete({
        timestamp: MoreThanOrEqual(cutoffDate),
      });

      this.logger.log(`Cleaned up ${result.affected} old auth metrics`);
    } catch (error) {
      this.logger.error('Failed to cleanup old metrics', error);
    }
  }

  private calculateMethodStats(metrics: AuthMetric[], method: AuthMethod) {
    const methodMetrics = metrics.filter(m => m.authMethod === method);
    const attempts = methodMetrics.length;
    const successes = methodMetrics.filter(m => m.success).length;
    const failures = attempts - successes;
    const successRate = attempts > 0 ? (successes / attempts) * 100 : 0;
    const averageDuration = attempts > 0 
      ? methodMetrics.reduce((sum, m) => sum + m.duration, 0) / attempts 
      : 0;

    return {
      attempts,
      successes,
      failures,
      successRate: Math.round(successRate * 100) / 100,
      averageDuration: Math.round(averageDuration * 100) / 100,
    };
  }

  private calculateDailyTrend(metrics: AuthMetric[], days: number) {
    const dailyData = new Map<string, { attempts: number; successes: number; failures: number }>();

    // Initialize all days
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().slice(0, 10);
      dailyData.set(dateStr, { attempts: 0, successes: 0, failures: 0 });
    }

    // Fill with actual data
    metrics.forEach(metric => {
      const dateStr = metric.timestamp.toISOString().slice(0, 10);
      const current = dailyData.get(dateStr) || { attempts: 0, successes: 0, failures: 0 };

      current.attempts++;
      if (metric.success) {
        current.successes++;
      } else {
        current.failures++;
      }

      dailyData.set(dateStr, current);
    });

    return Array.from(dailyData.entries())
      .map(([date, data]) => ({
        date,
        ...data,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  private calculateErrorBreakdown(metrics: AuthMetric[]) {
    const errorCounts = new Map<string, number>();

    metrics
      .filter(m => !m.success && m.errorMessage)
      .forEach(metric => {
        const error = metric.errorMessage!;
        errorCounts.set(error, (errorCounts.get(error) || 0) + 1);
      });

    const totalErrors = Array.from(errorCounts.values()).reduce((sum, count) => sum + count, 0);

    return Array.from(errorCounts.entries())
      .map(([error, count]) => ({
        error,
        count,
        percentage: totalErrors > 0 ? Math.round((count / totalErrors) * 10000) / 100 : 0,
      }))
      .sort((a, b) => b.count - a.count);
  }

  private calculatePerformanceMetrics(method: AuthMethod, metrics: AuthMetric[]): PerformanceMetrics {
    const durations = metrics.map(m => m.duration).sort((a, b) => a - b);
    
    if (durations.length === 0) {
      return {
        method,
        p50: 0,
        p95: 0,
        p99: 0,
        average: 0,
        min: 0,
        max: 0,
      };
    }

    const p50Index = Math.floor(durations.length * 0.5);
    const p95Index = Math.floor(durations.length * 0.95);
    const p99Index = Math.floor(durations.length * 0.99);

    return {
      method,
      p50: durations[p50Index],
      p95: durations[p95Index],
      p99: durations[p99Index],
      average: durations.reduce((sum, d) => sum + d, 0) / durations.length,
      min: durations[0],
      max: durations[durations.length - 1],
    };
  }
}
