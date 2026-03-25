import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

export interface JobPayload {
  type: string;
  data: Record<string, any>;
  priority?: number;
}

/**
 * In-process job queue using NestJS @nestjs/schedule for background tasks.
 * For high-throughput production: swap with BullMQ + Redis backed queues.
 */
@Injectable()
export class JobQueueService {
  private readonly logger = new Logger(JobQueueService.name);
  private readonly queue: Array<JobPayload & { id: string; createdAt: Date }> =
    [];
  private processing = false;

  async enqueue(job: JobPayload): Promise<string> {
    const id = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.queue.push({ ...job, id, createdAt: new Date() });
    this.logger.debug(`Enqueued job: ${job.type} id=${id}`);
    // Trigger processing if not running
    if (!this.processing) {
      setImmediate(() => {
        void this.processNext();
      });
    }
    return id;
  }

  @Cron(CronExpression.EVERY_10_SECONDS)
  async drainQueue(): Promise<void> {
    if (this.queue.length > 0 && !this.processing) {
      await this.processNext();
    }
  }

  private async processNext(): Promise<void> {
    if (this.processing || this.queue.length === 0) return;
    this.processing = true;

    // Sort by priority descending, then FIFO
    this.queue.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
    const job = this.queue.shift();
    if (!job) {
      this.processing = false;
      return;
    }

    try {
      await this.handleJob(job);
      this.logger.debug(`Completed job: ${job.type} id=${job.id}`);
    } catch (error) {
      this.logger.error(
        `Failed job: ${job.type} id=${job.id} error=${error.message}`,
      );
    } finally {
      this.processing = false;
      if (this.queue.length > 0) {
        setImmediate(() => {
          void this.processNext();
        });
      }
    }
  }

  private async handleJob(job: JobPayload & { id: string }): Promise<void> {
    switch (job.type) {
      case 'send_notification':
        this.logger.log(`[Job] Sending notification to: ${job.data.userId}`);
        break;
      case 'sync_agent_profile':
        this.logger.log(
          `[Job] Syncing agent profile: ${job.data.agentPublicKey}`,
        );
        break;
      case 'index_property':
        this.logger.log(`[Job] Indexing property: ${job.data.propertyId}`);
        break;
      case 'process_payment':
        this.logger.log(`[Job] Processing payment: ${job.data.paymentId}`);
        break;
      default:
        this.logger.warn(`[Job] Unknown job type: ${job.type}`);
    }
  }

  getQueueStats() {
    return {
      pending: this.queue.length,
      processing: this.processing,
    };
  }
}
