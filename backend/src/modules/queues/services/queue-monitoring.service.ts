import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bull';
import { Cron, CronExpression } from '@nestjs/schedule';
import { MetricsService } from '../../monitoring/metrics.service';
import { AlertService } from '../../monitoring/alert.service';

export interface QueueMetrics {
  timestamp: Date;
  queueName: string;
  active: number;
  waiting: number;
  delayed: number;
  failed: number;
  completed: number;
  paused: boolean;
  /** Waiting plus delayed jobs. */
  depth: number;
  /** Age in seconds of the oldest waiting job (0 when nothing waits). */
  oldestJobAgeSeconds: number;
}

/** Default age (seconds) a waiting job may reach before the queue counts as stalled. */
export const DEFAULT_STALLED_QUEUE_THRESHOLD_SECONDS = 300;

/** How many waiting jobs to sample when looking for the oldest one. */
const OLDEST_JOB_SAMPLE_SIZE = 50;

@Injectable()
export class QueueMonitoringService {
  private readonly logger = new Logger(QueueMonitoringService.name);
  private metrics: Map<string, QueueMetrics[]> = new Map();
  private readonly maxMetricsPerQueue = 1000; // Keep last 1000 metrics per queue
  /** Queues currently flagged as stalled, so alerts fire only on transitions. */
  private readonly stalledQueues = new Set<string>();
  private readonly stalledThresholdSeconds: number;

  constructor(
    @InjectQueue('email') private emailQueue: Queue,
    @InjectQueue('documents') private documentsQueue: Queue,
    @InjectQueue('blockchain') private blockchainQueue: Queue,
    @InjectQueue('data-sync') private dataSyncQueue: Queue,
    private readonly metricsService: MetricsService,
    private readonly alertService: AlertService,
    configService: ConfigService,
  ) {
    const configured = Number(
      configService.get(
        'STALLED_QUEUE_THRESHOLD_SECONDS',
        DEFAULT_STALLED_QUEUE_THRESHOLD_SECONDS,
      ),
    );
    this.stalledThresholdSeconds =
      Number.isFinite(configured) && configured > 0
        ? configured
        : DEFAULT_STALLED_QUEUE_THRESHOLD_SECONDS;
    this.initializeMetrics();
  }

  private initializeMetrics(): void {
    this.metrics.set('email', []);
    this.metrics.set('documents', []);
    this.metrics.set('blockchain', []);
    this.metrics.set('data-sync', []);
    this.metrics.set('analytics', []);
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
      { name: 'analytics', queue: this.analyticsQueue },
    ];

    for (const { name, queue } of queues) {
      try {
        const counts = await queue.getJobCounts();
        const isPaused = await queue.isPaused();
        // Bull reports the waiting count as `waiting`; some Redis providers
        // surface it as `wait`, so accept either.
        const waiting = (counts as any).wait ?? (counts as any).waiting ?? 0;
        const oldestJobAgeSeconds = await this.getOldestWaitingJobAge(queue);
        const metric: QueueMetrics = {
          timestamp: new Date(),
          queueName: name,
          active: counts.active,
          waiting,
          delayed: counts.delayed,
          failed: counts.failed,
          completed: counts.completed,
          paused: isPaused,
          depth: waiting + counts.delayed,
          oldestJobAgeSeconds,
        };

        const queueMetrics = this.metrics.get(name) || [];
        queueMetrics.push(metric);

        // Keep only last N metrics
        if (queueMetrics.length > this.maxMetricsPerQueue) {
          queueMetrics.shift();
        }

        this.metrics.set(name, queueMetrics);

        const stalled = this.evaluateStalledState(metric);
        this.metricsService.setQueueMetrics(name, {
          depth: metric.depth,
          oldestJobAgeSeconds,
          active: counts.active,
          failed: counts.failed,
          paused: isPaused,
          stalled,
        });

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
   * Age in seconds of the oldest job in the waiting list, sampled over the
   * first [`OLDEST_JOB_SAMPLE_SIZE`] entries. Returns 0 when nothing waits.
   */
  private async getOldestWaitingJobAge(queue: Queue): Promise<number> {
    const waitingJobs = await queue.getWaiting(0, OLDEST_JOB_SAMPLE_SIZE - 1);
    if (!waitingJobs || waitingJobs.length === 0) {
      return 0;
    }
    const oldestTimestamp = waitingJobs.reduce(
      (oldest, job) => Math.min(oldest, job.timestamp),
      Number.POSITIVE_INFINITY,
    );
    if (!Number.isFinite(oldestTimestamp)) {
      return 0;
    }
    return Math.max(0, Math.floor((Date.now() - oldestTimestamp) / 1000));
  }

  /**
   * A queue is stalled when jobs are waiting and the oldest of them has
   * exceeded the configured threshold. Fires a `QueueStalled` alert on the
   * transition into the stalled state and resolves it on recovery, so a
   * stalled processor is surfaced before user-facing symptoms appear.
   */
  private evaluateStalledState(metric: QueueMetrics): boolean {
    const stalled =
      metric.depth > 0 &&
      metric.oldestJobAgeSeconds >= this.stalledThresholdSeconds;
    const wasStalled = this.stalledQueues.has(metric.queueName);

    if (stalled && !wasStalled) {
      this.stalledQueues.add(metric.queueName);
      this.logger.error(
        `Queue ${metric.queueName} is stalled: oldest waiting job is ${metric.oldestJobAgeSeconds}s old (threshold ${this.stalledThresholdSeconds}s)`,
      );
      void this.fireStalledAlert(metric, 'firing');
    } else if (!stalled && wasStalled) {
      this.stalledQueues.delete(metric.queueName);
      this.logger.log(`Queue ${metric.queueName} recovered from stall`);
      void this.fireStalledAlert(metric, 'resolved');
    }
    return stalled;
  }

  private async fireStalledAlert(
    metric: QueueMetrics,
    status: 'firing' | 'resolved',
  ): Promise<void> {
    try {
      await this.alertService.handleAlert({
        alerts: [
          {
            status,
            labels: {
              alertname: 'QueueStalled',
              severity: 'critical',
              queue: metric.queueName,
            },
            annotations: {
              summary: `Queue ${metric.queueName} is stalled`,
              description: `Oldest waiting job in queue "${metric.queueName}" is ${metric.oldestJobAgeSeconds}s old with a depth of ${metric.depth} (threshold ${this.stalledThresholdSeconds}s).`,
            },
            startsAt: metric.timestamp.toISOString(),
            generatorURL: '',
          },
        ],
      });
    } catch (error) {
      this.logger.error(
        `Failed to dispatch ${status} QueueStalled alert for ${metric.queueName}`,
        error instanceof Error ? error.stack : 'Unknown error',
      );
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
