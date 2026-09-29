import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Job, Queue } from 'bull';
import { DeadLetterQueueService } from '../services/dead-letter-queue.service';

/** Routes jobs that exhausted their retries into the DLQ store. */
@Injectable()
export class DeadLetterQueueListener implements OnModuleInit {
  constructor(
    private readonly dlq: DeadLetterQueueService,
    @InjectQueue('email') private emailQueue: Queue,
    @InjectQueue('documents') private documentsQueue: Queue,
    @InjectQueue('blockchain') private blockchainQueue: Queue,
    @InjectQueue('data-sync') private dataSyncQueue: Queue,
  ) {}

  onModuleInit(): void {
    for (const queue of [
      this.emailQueue,
      this.documentsQueue,
      this.blockchainQueue,
      this.dataSyncQueue,
    ]) {
      this.dlq.registerQueue(queue);
      queue.on('failed', (job: Job, err: Error) => {
        const maxAttempts = job.opts?.attempts ?? 1;
        if (job.attemptsMade >= maxAttempts) {
          void this.dlq.archiveJob(job, err);
        }
      });
      queue.on('completed', (job: Job) => void this.dlq.markResolved(job));
    }
import { Injectable, Logger } from '@nestjs/common';
import { OnQueueFailed, Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { DeadLetterQueueService } from '../services/dead-letter-queue.service';
import {
  DEAD_LETTER_JOB_NAME,
  DEAD_LETTER_QUEUE_NAME,
  WorkerQueueName,
} from '../queues.constants';

@Injectable()
@Processor(DEAD_LETTER_QUEUE_NAME)
export class DeadLetterQueueProcessor {
  private readonly logger = new Logger(DeadLetterQueueProcessor.name);

  @Process(DEAD_LETTER_JOB_NAME)
  async archive(job: Job): Promise<{ archived: true }> {
    this.logger.warn(
      `Archived failed job ${job.data.originalJobId} from ${job.data.sourceQueue}`,
    );
    return { archived: true };
  }
}

@Injectable()
export class DeadLetterQueueListener {
  private readonly logger = new Logger(DeadLetterQueueListener.name);

  constructor(
    private readonly deadLetterQueueService: DeadLetterQueueService,
  ) {}

  @OnQueueFailed({ name: 'email' })
  async onEmailFailed(job: Job, error: Error): Promise<void> {
    await this.handleFailed('email', job, error);
  }

  @OnQueueFailed({ name: 'documents' })
  async onDocumentsFailed(job: Job, error: Error): Promise<void> {
    await this.handleFailed('documents', job, error);
  }

  @OnQueueFailed({ name: 'blockchain' })
  async onBlockchainFailed(job: Job, error: Error): Promise<void> {
    await this.handleFailed('blockchain', job, error);
  }

  @OnQueueFailed({ name: 'data-sync' })
  async onDataSyncFailed(job: Job, error: Error): Promise<void> {
    await this.handleFailed('data-sync', job, error);
  }

  @OnQueueFailed({ name: 'analytics' })
  async onAnalyticsFailed(job: Job, error: Error): Promise<void> {
    await this.handleFailed('analytics', job, error);
  }

  private async handleFailed(
    sourceQueue: WorkerQueueName,
    job: Job,
    error: Error,
  ): Promise<void> {
    if (!this.deadLetterQueueService.shouldMoveToDeadLetter(job)) {
      this.logger.debug(
        `Job ${job.id} on ${sourceQueue} will retry (${job.attemptsMade}/${job.opts.attempts ?? 1})`,
      );
      return;
    }

    await this.deadLetterQueueService.moveToDeadLetter(sourceQueue, job, error);
  }
}
