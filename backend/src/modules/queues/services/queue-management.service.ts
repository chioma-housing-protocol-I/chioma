import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue, Job } from 'bull';

export interface JobData {
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
  ) {}

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
      ...options,
    };

    this.logger.debug(`Adding email job: ${JSON.stringify(data)}`);
    return this.emailQueue.add(data, defaultOptions);
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
      ...options,
    };

    this.logger.debug(`Adding document job: ${JSON.stringify(data)}`);
    return this.documentsQueue.add(data, defaultOptions);
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
      ...options,
    };

    this.logger.debug(`Adding blockchain job: ${JSON.stringify(data)}`);
    return this.blockchainQueue.add(data, defaultOptions);
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
      ...options,
    };

    this.logger.debug(`Adding data sync job: ${JSON.stringify(data)}`);
    return this.dataSyncQueue.add(data, defaultOptions);
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
    const queues = ['email', 'documents', 'blockchain', 'data-sync'];
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
      createdAt: (job as any).createdTimestamp || (job as any).timestamp,
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
      default:
        throw new Error(`Unknown queue: ${queueName}`);
    }
  }
}
