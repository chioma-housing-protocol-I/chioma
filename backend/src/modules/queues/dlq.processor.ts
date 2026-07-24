import { Injectable, Logger } from '@nestjs/common';
import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { IncidentService } from '../../common/resilience/incident.service';
import { IncidentSeverity } from '../../common/resilience/resilience.types';

export const DLQ_QUEUE_NAME = 'dead-letter-queue';

export interface DeadLetterJob {
  originalQueue: string;
  originalJobId: string;
  failureCount: number;
  lastError: {
    message: string;
    stack?: string;
  };
  originalData: any;
  timestamp: number;
}

/**
 * Dead-Letter Queue processor for handling permanently failed jobs.
 * Jobs that fail after max retries are moved here for analysis and recovery.
 */
@Processor(DLQ_QUEUE_NAME)
@Injectable()
export class DLQProcessor {
  private readonly logger = new Logger(DLQProcessor.name);

  constructor(private readonly incident: IncidentService) {}

  /**
   * Process dead-letter queue jobs
   */
  @Process()
  async processDLQ(job: Job<DeadLetterJob>): Promise<void> {
    const dlqJob = job.data;

    this.logger.error(
      `Processing DLQ job from queue: ${dlqJob.originalQueue}`,
      {
        jobId: dlqJob.originalJobId,
        failureCount: dlqJob.failureCount,
        error: dlqJob.lastError,
        age: Date.now() - dlqJob.timestamp,
      },
    );

    try {
      // Classify the failure
      const severity = this.classifyFailure(dlqJob);

      // Create incident for investigation
      this.incident.declare({
        title: `Dead-Letter Job: ${dlqJob.originalQueue}`,
        description: `Job failed after ${dlqJob.failureCount} attempts: ${dlqJob.lastError.message}`,
        severity,
        affectedServices: [dlqJob.originalQueue],
      });

      // Archive the job for later analysis
      await this.archiveJob(dlqJob);

      // Attempt recovery if applicable
      if (this.isRecoverable(dlqJob)) {
        await this.attemptRecovery(dlqJob);
      }
    } catch (error) {
      this.logger.error(
        `Failed to process DLQ job: ${dlqJob.originalJobId}`,
        error,
      );
      // Re-throw to ensure job is marked as failed
      throw error;
    }
  }

  /**
   * Classify failure severity based on error and job characteristics
   */
  private classifyFailure(dlqJob: DeadLetterJob): IncidentSeverity {
    const errorMessage = dlqJob.lastError.message.toLowerCase();

    // Critical failures
    if (
      errorMessage.includes('database') ||
      errorMessage.includes('connection refused')
    ) {
      return IncidentSeverity.SEV1;
    }

    // High priority failures
    if (
      errorMessage.includes('payment') ||
      errorMessage.includes('blockchain') ||
      errorMessage.includes('auth')
    ) {
      return IncidentSeverity.SEV2;
    }

    // Medium priority
    if (dlqJob.failureCount >= 10) {
      return IncidentSeverity.SEV3;
    }

    // Low priority
    return IncidentSeverity.SEV4;
  }

  /**
   * Check if job is recoverable
   */
  private isRecoverable(dlqJob: DeadLetterJob): boolean {
    const errorMessage = dlqJob.lastError.message.toLowerCase();

    // Network errors are usually recoverable
    if (
      errorMessage.includes('timeout') ||
      errorMessage.includes('econnrefused') ||
      errorMessage.includes('temporarily unavailable')
    ) {
      return true;
    }

    // Transient errors
    if (
      errorMessage.includes('try again') ||
      errorMessage.includes('rate limit') ||
      errorMessage.includes('throttled')
    ) {
      return true;
    }

    // Don't retry validation or client errors
    if (
      errorMessage.includes('validation') ||
      errorMessage.includes('invalid') ||
      errorMessage.includes('not found')
    ) {
      return false;
    }

    return false;
  }

  /**
   * Archive job for analysis
   */
  private async archiveJob(dlqJob: DeadLetterJob): Promise<void> {
    // Store in persistent storage (e.g., database)
    // This would be implemented with actual storage logic
    this.logger.debug(`Archiving DLQ job: ${dlqJob.originalJobId}`);
  }

  /**
   * Attempt to recover the job
   */
  private async attemptRecovery(dlqJob: DeadLetterJob): Promise<void> {
    if (dlqJob.failureCount > 15) {
      this.logger.log(
        `DLQ job recovery skipped: too many failures (${dlqJob.failureCount})`,
      );
      return;
    }

    this.logger.log(`Attempting recovery for DLQ job: ${dlqJob.originalJobId}`);

    // Re-enqueue with exponential backoff
    const delayMs = Math.min(
      60_000 * dlqJob.failureCount, // Exponential: 1min, 2min, 3min...
      3_600_000, // Max 1 hour
    );

    this.logger.log(
      `Will retry DLQ job ${dlqJob.originalJobId} after ${delayMs}ms`,
    );

    // In production, re-enqueue to the original queue with delay
    // This would be implemented with actual queue logic
  }
}
