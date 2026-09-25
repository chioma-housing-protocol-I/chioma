import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job, Queue } from 'bull';
import { DeadLetterJob } from '../entities/dead-letter-job.entity';
import {
  DeadLetterJobStatus,
  DLQ_BASE_BACKOFF_MS,
  DLQ_ID_KEY,
  DLQ_MAX_RECOVERY_ATTEMPTS,
} from '../dead-letter.types';

@Injectable()
export class DeadLetterQueueService {
  private readonly logger = new Logger(DeadLetterQueueService.name);
  private readonly queues = new Map<string, Queue>();

  constructor(
    @InjectRepository(DeadLetterJob)
    private readonly repo: Repository<DeadLetterJob>,
  ) {}

  registerQueue(queue: Queue): void {
    this.queues.set(queue.name, queue);
  }

  /**
   * Persist a job that exhausted its retries. If the job is itself a DLQ
   * recovery, update the existing record instead of creating a new one.
   */
  async archiveJob(job: Job, error: Error | string): Promise<DeadLetterJob> {
    const message = typeof error === 'string' ? error : error?.message;
    const { [DLQ_ID_KEY]: dlqId, ...payload } = job.data ?? {};

    if (dlqId) {
      const existing = await this.repo.findOne({ where: { id: dlqId } });
      if (existing) {
        existing.error = message;
        existing.stacktrace = job.stacktrace?.join('\n') ?? null;
        existing.attemptCount += job.attemptsMade ?? 1;
        existing.status =
          existing.recoveryAttempts >= DLQ_MAX_RECOVERY_ATTEMPTS
            ? DeadLetterJobStatus.PERMANENTLY_FAILED
            : DeadLetterJobStatus.PENDING;
        return this.repo.save(existing);
      }
    }

    const record = this.repo.create({
      queueName: job.queue?.name,
      jobName: job.name,
      originalJobId: job.id?.toString(),
      payload,
      options: job.opts as Record<string, any>,
      error: message,
      stacktrace: job.stacktrace?.join('\n') ?? null,
      attemptCount: job.attemptsMade ?? 1,
      status: DeadLetterJobStatus.PENDING,
    });
    const saved = await this.repo.save(record);
    this.logger.warn(
      `Archived failed job ${job.id} from "${record.queueName}" as ${saved.id}`,
    );
    return saved;
  }

  calculateBackoff(recoveryAttempt: number): number {
    return DLQ_BASE_BACKOFF_MS * Math.pow(2, recoveryAttempt);
  }

  /** Re-enqueue an archived job onto its source queue after a backoff. */
  async attemptRecovery(id: string): Promise<DeadLetterJob> {
    const record = await this.repo.findOne({ where: { id } });
    if (!record) throw new NotFoundException(`DLQ job ${id} not found`);

    if (
      record.status === DeadLetterJobStatus.RESOLVED ||
      record.status === DeadLetterJobStatus.PERMANENTLY_FAILED
    ) {
      return record;
    }

    if (record.recoveryAttempts >= DLQ_MAX_RECOVERY_ATTEMPTS) {
      record.status = DeadLetterJobStatus.PERMANENTLY_FAILED;
      return this.repo.save(record);
    }

    const queue = this.queues.get(record.queueName);
    if (!queue) throw new Error(`Unknown source queue: ${record.queueName}`);

    const delay = this.calculateBackoff(record.recoveryAttempts);
    await queue.add(
      record.jobName,
      { ...record.payload, [DLQ_ID_KEY]: record.id },
      { attempts: 1, delay },
    );

    record.recoveryAttempts += 1;
    record.status = DeadLetterJobStatus.RETRYING;
    this.logger.log(
      `Re-enqueued DLQ job ${id} on "${record.queueName}" with ${delay}ms delay`,
    );
    return this.repo.save(record);
  }

  async markResolved(job: Job): Promise<void> {
    const dlqId = job.data?.[DLQ_ID_KEY];
    if (!dlqId) return;
    await this.repo.update(dlqId, {
      status: DeadLetterJobStatus.RESOLVED,
      resolvedAt: new Date(),
    });
  }

  findAll(status?: DeadLetterJobStatus): Promise<DeadLetterJob[]> {
    return this.repo.find({
      where: status ? { status } : {},
      order: { createdAt: 'DESC' },
    });
  }
}
