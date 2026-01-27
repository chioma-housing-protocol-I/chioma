import { Injectable, Logger } from '@nestjs/common';
import {
  HealthIndicator,
  HealthIndicatorResult,
  HealthCheckError,
} from '@nestjs/terminus';

@Injectable()
export class MemoryHealthIndicator extends HealthIndicator {
  private readonly logger = new Logger(MemoryHealthIndicator.name);

  // Memory thresholds in bytes
  private readonly warningThreshold = 512 * 1024 * 1024; // 512MB
  private readonly errorThreshold = 1024 * 1024 * 1024; // 1GB

  isHealthy(key: string): Promise<HealthIndicatorResult> {
    const startTime = Date.now();

    try {
      const memoryUsage = process.memoryUsage();
      const heapUsed = memoryUsage.heapUsed;
      const heapTotal = memoryUsage.heapTotal;
      const external = memoryUsage.external;
      const rss = memoryUsage.rss;

      const responseTime = Date.now() - startTime;

      // Determine status based on heap usage
      let status: 'up' | 'warning' | 'down' = 'up';
      let statusMessage = 'Memory usage is normal';

      if (heapUsed > this.errorThreshold) {
        status = 'down';
        statusMessage = 'Memory usage is critical';
      } else if (heapUsed > this.warningThreshold) {
        status = 'warning';
        statusMessage = 'Memory usage is elevated';
      }

      const result = this.getStatus(key, status !== 'down', {
        status,
        responseTime,
        message: statusMessage,
        heapUsed: this.formatBytes(heapUsed),
        heapTotal: this.formatBytes(heapTotal),
        external: this.formatBytes(external),
        rss: this.formatBytes(rss),
        heapUsedBytes: heapUsed,
        heapTotalBytes: heapTotal,
        heapUsagePercentage: Math.round((heapUsed / heapTotal) * 100),
        uptime: Math.floor(process.uptime()),
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        pid: process.pid,
      });

      if (status === 'warning') {
        this.logger.warn(
          `Memory usage warning: ${this.formatBytes(heapUsed)} used`,
        );
        return Promise.resolve(result);
      } else if (status === 'down') {
        this.logger.error(
          `Memory usage critical: ${this.formatBytes(heapUsed)} used`,
        );
        return Promise.reject(
          new HealthCheckError('Memory usage critical', result),
        );
      } else {
        this.logger.log(`Memory health check passed in ${responseTime}ms`);
        return Promise.resolve(result);
      }
    } catch (error) {
      const responseTime = Date.now() - startTime;

      this.logger.error('Memory health check failed', error);

      const result = this.getStatus(key, false, {
        status: 'down',
        responseTime,
        error: (error as Error).message,
      });

      return Promise.reject(
        new HealthCheckError('Memory check failed', result),
      );
    }
  }

  private formatBytes(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';

    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    const size = (bytes / Math.pow(1024, i)).toFixed(2);

    return `${size} ${sizes[i]}`;
  }

  getMemoryThresholds() {
    return {
      warning: this.formatBytes(this.warningThreshold),
      error: this.formatBytes(this.errorThreshold),
      warningBytes: this.warningThreshold,
      errorBytes: this.errorThreshold,
    };
  }
}
