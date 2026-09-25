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
  }
}
