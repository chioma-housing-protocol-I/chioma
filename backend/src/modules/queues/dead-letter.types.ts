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
