import { Injectable } from '@nestjs/common';
import { DeadLetterQueueService } from './services/dead-letter-queue.service';
import { DeadLetterJob } from './entities/dead-letter-job.entity';

/** Thin facade kept for callers that archive/recover DLQ jobs directly. */
@Injectable()
export class DlqProcessor {
  constructor(private readonly dlq: DeadLetterQueueService) {}

  archiveJob(
    ...args: Parameters<DeadLetterQueueService['archiveJob']>
  ): Promise<DeadLetterJob> {
    return this.dlq.archiveJob(...args);
  }

  attemptRecovery(id: string): Promise<DeadLetterJob> {
    return this.dlq.attemptRecovery(id);
  }
}
