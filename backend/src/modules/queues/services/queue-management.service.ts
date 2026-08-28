import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue, Job } from 'bull';
import { requestContext } from '../../../common/request-context/request-context';
import { AnalyticsJobData } from '../processors/analytics.processor';

export interface JobData {
  correlationId?: string;
  requestId?: string;
  [key: string]: any;
}

export interface QueueJobOptions {
  priority?: number;
  delay?: number;
  attempts?: number;
  backoff?: {
    type: 'fixed' | 'exponential';
    delay: number;
  };
  removeOnComplete?: boolean;
  removeOnFail?: boolean;
}

@Injectable()
export class QueueManagementService {
  private readonly logger = new Logger(QueueManagementService.name);

  constructor(
    @InjectQueue('email') private emailQueue: Queue,
    @InjectQueue('documents') private documentsQueue: Queue,
    @InjectQueue('blockchain') private blockchainQueue: Queue,
    @InjectQueue('data-sync') private dataSyncQueue: Queue,
    @InjectQueue('analytics') private analyticsQueue: Queue,
  ) {}

  private enrichJobData<T extends Record<string, any>>(
    data: T,
  ): T & { correlationId?: string; requestId?: string } {
    const ctx = requestContext.get();
    const correlationId =
      data.correlationId || ctx?.correlationId || ctx?.requestId;
    const requestId = data.requestId || ctx?.requestId || correlationId;
    return {
      ...(correlationId ? { correlationId } : {}),
      ...(requestId ? { requestId } : {}),
      ...data,
    };
  }

  /**
   * Add email job to queue
   */
  async addEmailJob(data: JobData, options?: QueueJobOptions): Promise<Job> {
    const defaultOptions = {
      attempts: 3,
      backoff: {
        type: 'exponential' as const,
        delay: 2000,
      },
      removeOnComplete: true,
      removeOnFail: false,
      ...options,
    };

    const enrichedData = this.enrichJobData(data);
    this.logger.debug(`Adding email job: ${JSON.stringify(enrichedData)}`);
    return this.emailQueue.add(enrichedData, defaultOptions);
  }

  /**
   * Add document processing job to queue
   */
  async addDocumentJob(data: JobData, options?: QueueJobOptions): Promise<Job> {
    const defaultOptions = {
      attempts: 3,
      backoff: {
        type: 'exponential' as const,
        delay: 3000,
      },
      removeOnComplete: true,
      removeOnFail: false,
      ...options,
    };

    const enrichedData = this.enrichJobData(data);
    this.logger.debug(`Adding document job: ${JSON.stringify(enrichedData)}`);
    return this.documentsQueue.add(enrichedData, defaultOptions);
  }

  /**
   * Add blockchain transaction job to queue
   */
  async addBlockchainJob(
    data: JobData,
    options?: QueueJobOptions,
  ): Promise<Job> {
    const defaultOptions = {
      attempts: 5,
      backoff: {
        type: 'exponential' as const,
        delay: 5000,
      },
      removeOnComplete: false, // Keep for audit trail
      removeOnFail: false,
      ...options,
    };

    const enrichedData = this.enrichJobData(data);
    this.logger.debug(`Adding blockchain job: ${JSON.stringify(enrichedData)}`);
    return this.blockchainQueue.add(enrichedData, defaultOptions);
  }

  /**
   * Add data synchronization job to queue
   */
  async addDataSyncJob(data: JobData, options?: QueueJobOptions): Promise<Job> {
    const defaultOptions = {
      attempts: 3,
      backoff: {
        type: 'exponential' as const,
        delay: 2000,
      },
      removeOnComplete: true,
      removeOnFail: false,
      ...options,
    };

    const enrichedData = this.enrichJobData(data);
    this.logger.debug(`Adding data sync job: ${JSON.stringify(enrichedData)}`);
    return this.dataSyncQueue.add(enrichedData, defaultOptions);
  }

  /**
   * Add analytics tracking job to queue
   */
  async addAnalyticsJob(
    data: AnalyticsJobData,
    options?: QueueJobOptions,
  ): Promise<Job> {
    const defaultOptions = {
      attempts: 3,
      backoff: {
        type: 'exponential' as const,
        delay: 2000,
      },
      removeOnComplete: true,
      removeOnFail: false,
      ...options,
    };

    const enrichedData = this.enrichJobData(data);
    this.logger.debug(`Adding analytics job: ${JSON.stringify(enrichedData)}`);
    return this.analyticsQueue.add(enrichedData, defaultOptions);
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(queueName: string): Promise<any> {
    const queue = this.getQueue(queueName);
    const counts = await queue.getJobCounts();
    const failedJobs = await queue.getFailed(0, -1);
    const delayedJobs = await queue.getDelayed(0, -1);

    return {
      name: queueName,
      counts,
      failedCount: failedJobs.length,
      delayedCount: delayedJobs.length,
      isPaused: queue.isPaused(),
    };
  }

  /**
   * Get all queue statistics
   */
  async getAllQueueStats(): Promise<any[]> {
    const queues = [
      'email',
      'documents',
      'blockchain',
      'data-sync',
      'analytics',
    ];
    return Promise.all(queues.map((q) => this.getQueueStats(q)));
  }

  /**
   * Pause queue
   */
  async pauseQueue(queueName: string): Promise<void> {
    const queue = this.getQueue(queueName);
    await queue.pause();
    this.logger.log(`Queue ${queueName} paused`);
  }

  /**
   * Resume queue
   */
  async resumeQueue(queueName: string): Promise<void> {
    const queue = this.getQueue(queueName);
    await queue.resume();
    this.logger.log(`Queue ${queueName} resumed`);
  }

  /**
   * Clear queue
   */
  async clearQueue(queueName: string): Promise<void> {
    const queue = this.getQueue(queueName);
    await queue.clean(0, 'failed');
    await queue.clean(0, 'delayed');
    await queue.clean(0, 'active');
    await queue.clean(0, 'wait');
    this.logger.log(`Queue ${queueName} cleared`);
  }

  /**
   * Get failed jobs
   */
  async getFailedJobs(queueName: string, start = 0, end = -1): Promise<Job[]> {
    const queue = this.getQueue(queueName);
    return queue.getFailed(start, end);
  }

  /**
   * Retry failed job
   */
  async retryFailedJob(queueName: string, jobId: string): Promise<void> {
    const queue = this.getQueue(queueName);
    const job = await queue.getJob(jobId);

    if (!job) {
      throw new Error(`Job ${jobId} not found in queue ${queueName}`);
    }

    await job.retry();
    this.logger.log(`Job ${jobId} retried in queue ${queueName}`);
  }

  /**
   * Remove job
   */
  async removeJob(queueName: string, jobId: string): Promise<void> {
    const queue = this.getQueue(queueName);
    const job = await queue.getJob(jobId);

    if (!job) {
      throw new Error(`Job ${jobId} not found in queue ${queueName}`);
    }

    await job.remove();
    this.logger.log(`Job ${jobId} removed from queue ${queueName}`);
  }

  /**
   * Get job details
   */
  async getJobDetails(queueName: string, jobId: string): Promise<any> {
    const queue = this.getQueue(queueName);
    const job = await queue.getJob(jobId);

    if (!job) {
      throw new Error(`Job ${jobId} not found in queue ${queueName}`);
    }

    return {
      id: job.id,
      data: job.data,
      state: await job.getState(),
      progress: job.progress(),
      attempts: job.attemptsMade,
      maxAttempts: job.opts.attempts,
      failedReason: job.failedReason,
      stacktrace: job.stacktrace,
      createdAt: job.timestamp,
      finishedAt: job.finishedOn,
    };
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
      case 'analytics':
        return this.analyticsQueue;
      default:
        throw new Error(`Unknown queue: ${queueName}`);
    }
  }
}
