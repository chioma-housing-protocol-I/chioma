import { DataSource } from 'typeorm';

export interface PoolWarmUpOptions {
  /** Configured `extra.max` pool size. */
  maxConnections: number;
  /** Fraction of the pool to pre-connect. Defaults to 0.5. */
  warmRatio?: number;
  /** Overrides the computed count when supplied (mostly for tests). */
  targetConnections?: number;
  query?: string;
  /** Per-connection deadline, in milliseconds. Defaults to 5000. */
  timeoutMs?: number;
}

export interface PoolWarmUpResult {
  attempted: number;
  warmed: number;
  failed: number;
  durationMs: number;
}

export interface PoolWarmUpLogger {
  log(message: string): void;
  warn(message: string, context?: unknown): void;
}

/** Number of connections to open at bootstrap: half the pool, rounded up. */
export function connectionsToWarm(
  maxConnections: number,
  warmRatio = 0.5,
): number {
  if (!Number.isFinite(maxConnections) || maxConnections <= 0) {
    return 0;
  }
  const boundedRatio = Math.min(Math.max(warmRatio, 0), 1);
  return Math.min(maxConnections, Math.ceil(maxConnections * boundedRatio));
}

/**
 * Opens a fraction of the pool concurrently, without blocking the caller's
 * event loop beyond the cost of starting the queries. Failures are reported
 * in the result and never reject, so a warm-up problem cannot stop boot.
 */
export async function warmConnectionPool(
  query: (sql: string) => Promise<unknown>,
  options: PoolWarmUpOptions,
): Promise<PoolWarmUpResult> {
  const startedAt = Date.now();
  const count =
    options.targetConnections ??
    connectionsToWarm(options.maxConnections, options.warmRatio ?? 0.5);
  const timeoutMs = options.timeoutMs ?? 5000;
  const sql = options.query ?? 'SELECT 1';
  if (count <= 0) {
    return { attempted: 0, warmed: 0, failed: 0, durationMs: 0 };
  }

  const outcomes = await Promise.all(
    Array.from({ length: count }, async () => {
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        await Promise.race([
          query(sql),
          new Promise<never>((_resolve, reject) => {
            timer = setTimeout(
              () => reject(new Error('Pool warm-up query timed out')),
              timeoutMs,
            );
          }),
        ]);
        return true;
      } catch {
        return false;
      } finally {
        if (timer) {
          clearTimeout(timer);
        }
      }
    }),
  );

  const warmed = outcomes.filter(Boolean).length;
  return {
    attempted: count,
    warmed,
    failed: count - warmed,
    durationMs: Date.now() - startedAt,
  };
}

/**
 * Fire-and-forget bootstrap helper. Starts warming before the HTTP listener
 * is ready but never awaits it, so startup remains non-blocking. Returns a
 * cancel function for graceful shutdown.
 */
export function startPoolWarmUp(
  query: (sql: string) => Promise<unknown>,
  options: PoolWarmUpOptions,
  logger: PoolWarmUpLogger,
): () => void {
  let cancelled = false;
  void warmConnectionPool(query, options).then((result) => {
    if (cancelled) {
      return;
    }
    const message = `Database pool warm-up complete: ${result.warmed}/${result.attempted} connections ready in ${result.durationMs}ms`;
    if (result.failed > 0) {
      logger.warn(message, { failed: result.failed });
    } else {
      logger.log(message);
    }
  });
  return () => {
    cancelled = true;
  };
}

/** DataSource adapter used by production bootstrap. */
export function dataSourceWarmUpQuery(
  dataSource: DataSource,
): (sql: string) => Promise<unknown> {
  return (sql: string) => dataSource.query(sql);
}
