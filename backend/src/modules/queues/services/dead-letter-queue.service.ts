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
    private readonly configService: ConfigService,
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
      default: {
        const _exhaustive: never = queueName;
        throw new BadRequestException(`Unknown queue: ${String(_exhaustive)}`);
      }
    }
  }
}
