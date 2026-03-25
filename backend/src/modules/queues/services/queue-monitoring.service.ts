import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { Cron, CronExpression } from '@nestjs/schedule';

export interface QueueMetrics {
  timestamp: Date;
  queueName: string;
  active: number;
  waiting: number;
  delayed: number;
  failed: number;
  completed: number;
  paused: boolean;
}

@Injectable()
export class QueueMonitoringService {
  private readonly logger = new Logger(QueueMonitoringService.name);
  private metrics: Map<string, QueueMetrics[]> = new Map();
  private readonly maxMetricsPerQueue = 1000; // Keep last 1000 metrics per queue

  constructor(
    @InjectQueue('email') private emailQueue: Queue,
    @InjectQueue('documents') private documentsQueue: Queue,
    @InjectQueue('blockchain') private blockchainQueue: Queue,
    @InjectQueue('data-sync') private dataSyncQueue: Queue,
  ) {
    this.initializeMetrics();
  }

  private initializeMetrics(): void {
    this.metrics.set('email', []);
    this.metrics.set('documents', []);
    this.metrics.set('blockchain', []);
    this.metrics.set('data-sync', []);
  }

  /**
   * Collect metrics for all queues every minute
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async collectMetrics(): Promise<void> {
    const queues = [
      { name: 'email', queue: this.emailQueue },
      { name: 'documents', queue: this.documentsQueue },
      { name: 'blockchain', queue: this.blockchainQueue },
      { name: 'data-sync', queue: this.dataSyncQueue },
    ];

    for (const { name, queue } of queues) {
      try {
        const counts = await queue.getJobCounts();
        const isPaused = await queue.isPaused();
        const metric: QueueMetrics = {
          timestamp: new Date(),
          queueName: name,
          active: counts.active,
          waiting: (counts as any).wait || 0,
          delayed: counts.delayed,
          failed: counts.failed,
          completed: counts.completed,
          paused: isPaused,
        };

        const queueMetrics = this.metrics.get(name) || [];
        queueMetrics.push(metric);

        // Keep only last N metrics
        if (queueMetrics.length > this.maxMetricsPerQueue) {
          queueMetrics.shift();
        }

        this.metrics.set(name, queueMetrics);

        // Log warning if queue has too many failed jobs
        if (counts.failed > 10) {
          this.logger.warn(`Queue ${name} has ${counts.failed} failed jobs`);
        }
      } catch (error) {
        this.logger.error(
          `Failed to collect metrics for queue ${name}`,
          error instanceof Error ? error.stack : 'Unknown error',
        );
      }
    }
  }

  /**
   * Get current metrics for a queue
   */
  async getCurrentMetrics(queueName: string): Promise<QueueMetrics | null> {
    const queueMetrics = this.metrics.get(queueName);
    return queueMetrics && queueMetrics.length > 0
      ? queueMetrics[queueMetrics.length - 1]
      : null;
  }

  /**
   * Get metrics history for a queue
   */
  getMetricsHistory(queueName: string, limit = 100): QueueMetrics[] {
    const queueMetrics = this.metrics.get(queueName) || [];
    return queueMetrics.slice(-limit);
  }

  /**
   * Get all current metrics
   */
  async getAllCurrentMetrics(): Promise<QueueMetrics[]> {
    const allMetrics: QueueMetrics[] = [];

    for (const queueName of ['email', 'documents', 'blockchain', 'data-sync']) {
      const metric = await this.getCurrentMetrics(queueName);
      if (metric) {
        allMetrics.push(metric);
      }
    }

    return allMetrics;
  }

  /**
   * Get queue health status
   */
  async getQueueHealth(): Promise<any> {
    const metrics = await this.getAllCurrentMetrics();
    const health = {
      timestamp: new Date(),
      queues: metrics,
      summary: {
        totalActive: 0,
        totalWaiting: 0,
        totalDelayed: 0,
        totalFailed: 0,
        totalCompleted: 0,
        unhealthyQueues: [] as string[],
      },
    };

    for (const metric of metrics) {
      health.summary.totalActive += metric.active;
      health.summary.totalWaiting += metric.waiting;
      health.summary.totalDelayed += metric.delayed;
      health.summary.totalFailed += metric.failed;
      health.summary.totalCompleted += metric.completed;

      // Queue is unhealthy if paused or has many failed jobs
      if (metric.paused || metric.failed > 20) {
        health.summary.unhealthyQueues.push(metric.queueName);
      }
    }

    return health;
  }

  /**
   * Get queue statistics for dashboard
   */
  async getDashboardStats(): Promise<any> {
    const health = await this.getQueueHealth();
    const queues: any[] = [];

    for (const queueName of ['email', 'documents', 'blockchain', 'data-sync']) {
      const queue = this.getQueue(queueName);
      const counts = await queue.getJobCounts();
      const history = this.getMetricsHistory(queueName, 60);
      const isPaused = await queue.isPaused();

      queues.push({
        name: queueName,
        current: counts,
        history,
        isPaused,
      });
    }

    return {
      timestamp: new Date(),
      health: health.summary,
      queues,
    };
  }

  /**
   * Clear old metrics (keep only recent ones)
   */
  clearOldMetrics(olderThanMinutes = 60): void {
    const cutoffTime = new Date(Date.now() - olderThanMinutes * 60 * 1000);

    for (const [queueName, metrics] of this.metrics.entries()) {
      const filtered = metrics.filter((m) => m.timestamp > cutoffTime);
      this.metrics.set(queueName, filtered);
      this.logger.debug(
        `Cleared old metrics for ${queueName}: ${metrics.length} -> ${filtered.length}`,
      );
    }
  }

  private getQueue(queueName: string): Queue {
    switch (queueName) {
      case 'email':
        return this.emailQueue;
      case 'documents':
        return this.documentsQueue;
      case 'blockchain':
        return this.blockchainQueue;
      case 'data-sync':
        return this.dataSyncQueue;
      default:
        throw new Error(`Unknown queue: ${queueName}`);
    }
  }
}
