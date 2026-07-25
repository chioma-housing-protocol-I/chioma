const BASE_DELAY_MS = 500;
const MAX_JITTER_MS = 200;

export type RetryEventType = 'retry' | 'success' | 'failure' | 'exhausted';

export interface RetryEvent {
  type: RetryEventType;
  endpoint: string;
  attempt: number;
  maxAttempts: number;
  delayMs: number;
  totalElapsedMs: number;
  error?: unknown;
}

export type RetryListener = (event: RetryEvent) => void;

export interface RetryEndpointMetrics {
  endpoint: string;
  totalAttempts: number;
  totalRetries: number;
  successes: number;
  failures: number;
  exhausted: number;
  lastError?: unknown;
  lastSuccessAt?: number;
  lastFailureAt?: number;
}

class RetryMetricsCollector {
  private metrics = new Map<string, RetryEndpointMetrics>();
  private listeners = new Set<RetryListener>();

  subscribe(listener: RetryListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(event: RetryEvent) {
    this.listeners.forEach((l) => l(event));
  }

  recordEvent(event: RetryEvent) {
    const existing = this.metrics.get(event.endpoint) ?? {
      endpoint: event.endpoint,
      totalAttempts: 0,
      totalRetries: 0,
      successes: 0,
      failures: 0,
      exhausted: 0,
    };

    existing.totalAttempts++;
    if (event.type === 'retry') existing.totalRetries++;
    if (event.type === 'success') {
      existing.successes++;
      existing.lastSuccessAt = Date.now();
      existing.lastError = undefined;
    }
    if (event.type === 'failure') {
      existing.failures++;
      existing.lastFailureAt = Date.now();
      existing.lastError = event.error;
    }
    if (event.type === 'exhausted') {
      existing.exhausted++;
      existing.lastFailureAt = Date.now();
      existing.lastError = event.error;
    }

    this.metrics.set(event.endpoint, existing);
    this.notify(event);
  }

  getMetrics(endpoint: string): RetryEndpointMetrics | undefined {
    return this.metrics.get(endpoint);
  }

  getAllMetrics(): RetryEndpointMetrics[] {
    return Array.from(this.metrics.values());
  }

  resetMetrics(endpoint?: string) {
    if (endpoint) {
      this.metrics.delete(endpoint);
    } else {
      this.metrics.clear();
    }
  }
}

export const globalRetryMetrics = new RetryMetricsCollector();

function getJitter(): number {
  return Math.floor(Math.random() * MAX_JITTER_MS);
}

export function getRetryDelay(attempt: number): number {
  return BASE_DELAY_MS * 2 ** Math.max(0, attempt - 1) + getJitter();
}

export async function withRetry<T>(
  operation: () => Promise<T>,
  options?: {
    maxAttempts?: number;
    shouldRetry?: (error: unknown) => boolean;
    endpoint?: string;
    onRetry?: (attempt: number, error: unknown, delayMs: number) => void;
  },
): Promise<T> {
  const maxAttempts = options?.maxAttempts ?? 3;
  const shouldRetry = options?.shouldRetry ?? (() => true);
  const endpoint = options?.endpoint ?? 'unknown';
  const startTime = Date.now();

  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const p = operation();
      p.catch(() => {}); // prevent unhandled-rejection warnings when timers fire between creation and await
      const result = await p;
      globalRetryMetrics.recordEvent({
        type: 'success',
        endpoint,
        attempt,
        maxAttempts,
        delayMs: 0,
        totalElapsedMs: Date.now() - startTime,
      });
      return result;
    } catch (error) {
      lastError = error;
      const canRetry = attempt < maxAttempts && shouldRetry(error);
      if (!canRetry) {
        globalRetryMetrics.recordEvent({
          type: attempt >= maxAttempts ? 'exhausted' : 'failure',
          endpoint,
          attempt,
          maxAttempts,
          delayMs: 0,
          totalElapsedMs: Date.now() - startTime,
          error,
        });
        break;
      }
      const delayMs = getRetryDelay(attempt);
      globalRetryMetrics.recordEvent({
        type: 'retry',
        endpoint,
        attempt,
        maxAttempts,
        delayMs,
        totalElapsedMs: Date.now() - startTime,
        error,
      });
      options?.onRetry?.(attempt, error, delayMs);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw lastError;
}
