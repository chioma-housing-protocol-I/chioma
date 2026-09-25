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
