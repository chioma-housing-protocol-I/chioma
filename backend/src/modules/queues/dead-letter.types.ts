export enum DeadLetterJobStatus {
  PENDING = 'pending',
  RETRYING = 'retrying',
  RESOLVED = 'resolved',
  PERMANENTLY_FAILED = 'permanently_failed',
}

/** Key injected into re-enqueued job data to link it back to its DLQ record. */
export const DLQ_ID_KEY = '__dlqId';

export const DLQ_MAX_RECOVERY_ATTEMPTS = 3;
export const DLQ_BASE_BACKOFF_MS = 5000;
export interface DeadLetterJobPayload {
  sourceQueue: string;
  originalJobId: string | number;
  data: Record<string, unknown>;
  failedReason: string;
  stacktrace: string[];
  attemptsMade: number;
  maxAttempts: number;
  failedAt: string;
}

export interface DeadLetterJobSummary {
  id: string | number;
  sourceQueue: string;
  originalJobId: string | number;
  failedReason: string;
  attemptsMade: number;
  maxAttempts: number;
  failedAt: string;
  data: Record<string, unknown>;
}

export interface DeadLetterQueueStats {
  name: string;
  archivedCount: number;
  waitingCount: number;
  failedCount: number;
}
