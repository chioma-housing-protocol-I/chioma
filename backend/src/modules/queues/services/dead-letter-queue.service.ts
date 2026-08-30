import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { Job, Queue } from 'bull';
import {
  DEAD_LETTER_JOB_NAME,
  DEAD_LETTER_QUEUE_NAME,
  isWorkerQueueName,
  WorkerQueueName,
} from '../queues.constants';
import {
  DeadLetterJobPayload,
  DeadLetterJobSummary,
  DeadLetterQueueStats,
} from '../dead-letter.types';
import { JobData } from './queue-management.service';
import { ErrorNotificationService } from '../../monitoring/error-notification.service';
import { AlertPayload, EscalationTier } from '../../monitoring/alert.types';

@Injectable()
export class DeadLetterQueueService {
  private readonly logger = new Logger(DeadLetterQueueService.name);

  constructor(
    @InjectQueue(DEAD_LETTER_QUEUE_NAME)
    private readonly deadLetterQueue: Queue<DeadLetterJobPayload>,
    @InjectQueue('email') private readonly emailQueue: Queue,
    @InjectQueue('documents') private readonly documentsQueue: Queue,
    @InjectQueue('blockchain') private readonly blockchainQueue: Queue,
    @InjectQueue('data-sync') private readonly dataSyncQueue: Queue,
    @InjectQueue('analytics') private readonly analyticsQueue: Queue,
    private readonly configService: ConfigService,
    private readonly errorNotificationService: ErrorNotificationService,
  ) {}

  isEnabled(): boolean {
    return (
      this.configService.get<string>('DEAD_LETTER_QUEUE_ENABLED') !== 'false'
    );
  }

  async moveToDeadLetter(
    sourceQueue: WorkerQueueName,
    job: Job,
    error: Error,
  ): Promise<void> {
    if (!this.isEnabled()) {
      this.logger.warn(
        `Dead letter queue disabled; leaving failed job ${job.id} on ${sourceQueue}`,
      );
      return;
    }

    const payload: DeadLetterJobPayload = {
      sourceQueue,
      originalJobId: job.id,
      data: job.data,
      failedReason: error.message,
      stacktrace: job.stacktrace ?? [],
      attemptsMade: job.attemptsMade,
      maxAttempts: job.opts.attempts ?? 1,
      failedAt: new Date().toISOString(),
    };

    await this.deadLetterQueue.add(DEAD_LETTER_JOB_NAME, payload, {
      removeOnComplete: false,
      removeOnFail: false,
      attempts: 1,
    });

    try {
      await job.remove();
    } catch (removeError) {
      this.logger.warn(
        `Could not remove source job ${job.id} from ${sourceQueue}: ${
          removeError instanceof Error
            ? removeError.message
            : String(removeError)
        }`,
      );
    }

    this.logger.error(
      `Job ${job.id} moved to dead letter queue from ${sourceQueue}: ${error.message}`,
    );

    await this.alertRetryExhaustion(sourceQueue, payload);
  }

  /**
   * Notifies on-call once a job has exhausted all retry attempts and been
   * moved to the dead-letter queue. This is the alert path for otherwise
   * silent fire-and-forget failures (e.g. emails, notifications).
   */
  private async alertRetryExhaustion(
    sourceQueue: WorkerQueueName,
    payload: DeadLetterJobPayload,
  ): Promise<void> {
    const alert: AlertPayload = {
      status: 'firing',
      labels: {
        alertname: 'AsyncJobRetryExhausted',
        queue: sourceQueue,
        severity: sourceQueue === 'email' ? 'high' : 'warning',
      },
      annotations: {
        summary: `${sourceQueue} job ${String(payload.originalJobId)} exhausted all retries`,
        description: `Job failed after ${payload.attemptsMade}/${payload.maxAttempts} attempts on the "${sourceQueue}" queue and was moved to the dead-letter queue. Reason: ${payload.failedReason}`,
      },
      startsAt: payload.failedAt,
      generatorURL: `dead-letter-queue/${sourceQueue}`,
    };

    try {
      await this.errorNotificationService.notifyAlert(
        alert,
        EscalationTier.ONCALL,
      );
    } catch (notifyError) {
      this.logger.error(
        `Failed to send retry-exhaustion alert for ${sourceQueue} job ${String(payload.originalJobId)}`,
        notifyError instanceof Error ? notifyError.stack : String(notifyError),
      );
    }
  }

  shouldMoveToDeadLetter(job: Job): boolean {
    const maxAttempts = job.opts.attempts ?? 1;
    return job.attemptsMade >= maxAttempts;
  }

  async getDeadLetterJobs(
    start = 0,
    end = 50,
  ): Promise<DeadLetterJobSummary[]> {
    const completed = await this.deadLetterQueue.getCompleted(start, end);
    const waiting = await this.deadLetterQueue.getWaiting(start, end);
    const failed = await this.deadLetterQueue.getFailed(start, end);
    const jobs = [...completed, ...waiting, ...failed];

    return jobs.map((job) => this.toSummary(job));
  }

  async getDeadLetterStats(): Promise<DeadLetterQueueStats> {
    const counts = await this.deadLetterQueue.getJobCounts();
    const completed = await this.deadLetterQueue.getCompleted(0, -1);

    return {
      name: DEAD_LETTER_QUEUE_NAME,
      archivedCount: completed.length,
      waitingCount: counts.waiting,
      failedCount: counts.failed,
    };
  }

  async retryFromDeadLetter(jobId: string): Promise<void> {
    const job = await this.deadLetterQueue.getJob(jobId);
    if (!job) {
      throw new NotFoundException(`Dead letter job ${jobId} not found`);
    }

    const payload = job.data;
    if (!isWorkerQueueName(payload.sourceQueue)) {
      throw new BadRequestException(
        `Unknown source queue: ${payload.sourceQueue}`,
      );
    }

    const queue = this.getWorkerQueue(payload.sourceQueue);
    await queue.add(payload.data, {
      attempts: payload.maxAttempts,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: payload.sourceQueue !== 'blockchain',
      removeOnFail: false,
    });

    await job.remove();
    this.logger.log(
      `Dead letter job ${jobId} re-queued to ${payload.sourceQueue}`,
    );
  }

  async removeDeadLetterJob(jobId: string): Promise<void> {
    const job = await this.deadLetterQueue.getJob(jobId);
    if (!job) {
      throw new NotFoundException(`Dead letter job ${jobId} not found`);
    }
    await job.remove();
    this.logger.log(`Dead letter job ${jobId} removed`);
  }

  async purgeExpiredJobs(): Promise<number> {
    const retentionDays = Number(
      this.configService.get<string>('DEAD_LETTER_RETENTION_DAYS') ?? '30',
    );
    const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
    const jobs = await this.deadLetterQueue.getJobs(
      ['completed', 'waiting', 'failed', 'delayed'],
      0,
      -1,
    );

    let removed = 0;
    for (const job of jobs) {
      const failedAt = Date.parse(job.data.failedAt);
      if (Number.isFinite(failedAt) && failedAt < cutoff) {
        await job.remove();
        removed += 1;
      }
    }

    if (removed > 0) {
      this.logger.log(`Purged ${removed} expired dead letter jobs`);
    }
    return removed;
  }

  @Cron(CronExpression.EVERY_DAY_AT_4AM)
  async purgeExpiredJobsScheduled(): Promise<void> {
    if (!this.isEnabled()) {
      return;
    }
    await this.purgeExpiredJobs();
  }

  /**
   * Dead-letter queue backlog monitoring: alerts when the number of
   * unprocessed dead-letter jobs exceeds a configurable threshold,
   * signalling that something upstream is failing systematically rather
   * than transiently.
   */
  @Cron(CronExpression.EVERY_10_MINUTES)
  async monitorDeadLetterBacklog(): Promise<void> {
    if (!this.isEnabled()) {
      return;
    }

    const threshold = Number(
      this.configService.get<string>('DEAD_LETTER_QUEUE_ALERT_THRESHOLD') ??
        '20',
    );
    const stats = await this.getDeadLetterStats();
    const backlog = stats.waitingCount + stats.failedCount;

    if (backlog <= threshold) {
      return;
    }

    this.logger.warn(
      `Dead letter queue backlog (${backlog}) exceeds threshold (${threshold})`,
    );

    const alert: AlertPayload = {
      status: 'firing',
      labels: {
        alertname: 'DeadLetterQueueBacklogHigh',
        severity: 'warning',
      },
      annotations: {
        summary: `Dead letter queue backlog is ${backlog} (threshold ${threshold})`,
        description:
          'A growing dead-letter queue backlog indicates jobs are failing systematically rather than transiently. Review /api/v1/queues/dead-letter/jobs.',
      },
      startsAt: new Date().toISOString(),
      generatorURL: 'dead-letter-queue/backlog',
    };

    try {
      await this.errorNotificationService.notifyAlert(
        alert,
        EscalationTier.TEAM,
      );
    } catch (notifyError) {
      this.logger.error(
        'Failed to send dead-letter backlog alert',
        notifyError instanceof Error ? notifyError.stack : String(notifyError),
      );
    }
  }

  private toSummary(job: Job<DeadLetterJobPayload>): DeadLetterJobSummary {
    return {
      id: job.id,
      sourceQueue: job.data.sourceQueue,
      originalJobId: job.data.originalJobId,
      failedReason: job.data.failedReason,
      attemptsMade: job.data.attemptsMade,
      maxAttempts: job.data.maxAttempts,
      failedAt: job.data.failedAt,
      data: job.data.data,
    };
  }

  private getWorkerQueue(queueName: WorkerQueueName): Queue<JobData> {
    switch (queueName) {
      case 'email':
        return this.emailQueue;
      case 'documents':
        return this.documentsQueue;
      case 'blockchain':
        return this.blockchainQueue;
      case 'data-sync':
        return this.dataSyncQueue;
      case 'analytics':
        return this.analyticsQueue;
      default: {
        const _exhaustive: never = queueName;
        throw new BadRequestException(`Unknown queue: ${String(_exhaustive)}`);
      }
    }
  }
}
