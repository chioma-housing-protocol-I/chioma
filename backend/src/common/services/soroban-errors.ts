import {
  SorobanTransactionFailedError,
  SorobanTransactionTimeoutError,
} from '../../modules/stellar/services/soroban-transaction-poller';

/** Whether a Soroban failure is worth retrying. */
export type SorobanFailureKind = 'retriable' | 'permanent';

/**
 * Structured Soroban submission error carrying the failure classification,
 * the transaction hash (when one was assigned) and the attempts consumed.
 */
export class SorobanSubmissionError extends Error {
  constructor(
    message: string,
    readonly kind: SorobanFailureKind,
    readonly txHash?: string,
    readonly attempts = 0,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'SorobanSubmissionError';
  }
}

/** A transaction that exhausted retries or failed permanently. */
export interface SorobanDeadLetterEntry {
  operation: string;
  txHash?: string;
  kind: SorobanFailureKind;
  reason: string;
  attempts: number;
  failedAt: string;
}

/**
 * Optional sink for failed transactions (e.g. persist to the DLQ table or
 * alert). Register a provider under this token to receive dead letters.
 */
export const SOROBAN_DEAD_LETTER_HANDLER = 'SOROBAN_DEAD_LETTER_HANDLER';
export interface SorobanDeadLetterHandler {
  handle(entry: SorobanDeadLetterEntry): Promise<void> | void;
}

const RETRIABLE_PATTERNS = [
  'timeout',
  'timed out',
  'econnreset',
  'econnrefused',
  'enotfound',
  'etimedout',
  'socket hang up',
  'network',
  'try_again_later',
  'try again later',
  'rate limit',
  '429',
  '502',
  '503',
  '504',
  'tx_bad_seq',
  'tx_insufficient_fee',
];

const PERMANENT_PATTERNS = [
  'invalid',
  'validation',
  'simulation failed',
  'hosterror',
  'tx_bad_auth',
  'tx_failed',
  'op_underfunded',
  'insufficient balance',
  'not configured',
  'malformed',
];

/**
 * Classify a Soroban error as retriable (transient network/RPC conditions)
 * or permanent (validation, contract, or auth failures that will not heal).
 */
export function classifySorobanError(error: unknown): SorobanFailureKind {
  if (error instanceof SorobanSubmissionError) return error.kind;
  if (error instanceof SorobanTransactionTimeoutError) return 'retriable';
  if (error instanceof SorobanTransactionFailedError) return 'permanent';

  const message = (
    error instanceof Error ? error.message : JSON.stringify(error ?? '')
  ).toLowerCase();
  if (PERMANENT_PATTERNS.some((p) => message.includes(p))) return 'permanent';
  if (RETRIABLE_PATTERNS.some((p) => message.includes(p))) return 'retriable';
  // Unknown errors are treated as transient so a hiccup does not drop a tx.
  return 'retriable';
}

/** Exponential backoff with jitter, capped at `maxMs`. */
export function sorobanBackoffMs(
  attempt: number,
  baseMs = 1_000,
  maxMs = 16_000,
): number {
  const delay = Math.min(baseMs * 2 ** (attempt - 1), maxMs);
  return delay + Math.floor(Math.random() * (delay / 4));
}
