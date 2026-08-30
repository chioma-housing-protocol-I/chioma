/**
 * Exponential backoff schedule for webhook deliveries.
 *
 * Design goals
 * ─────────────
 * • A transient subscriber outage (minutes to a few hours) is recovered
 *   automatically without operator involvement.
 * • A prolonged outage (>24 h) stops retrying so we don't accumulate an
 *   unbounded queue of stale events.
 * • Jitter (±25 % of the base delay) spreads retries across time so a
 *   single outage affecting many subscribers doesn't cause a synchronized
 *   retry storm when the endpoint comes back up.
 *
 * Retry schedule (base delays, before jitter)
 * ─────────────────────────────────────────────
 *  Attempt │ Delay after previous attempt │ Cumulative elapsed
 * ─────────┼──────────────────────────────┼───────────────────
 *    1      │ 30 s                         │  ~30 s
 *    2      │  5 min                       │  ~5 min
 *    3      │ 30 min                       │  ~35 min
 *    4      │  2 h                         │  ~2 h 35 min
 *    5      │  8 h                         │  ~10 h 35 min
 *
 * After attempt 5 the delivery is marked `exhausted = true` and no further
 * automatic retries are scheduled. The subscriber can inspect the delivery
 * log via GET /developer/webhooks/:id/deliveries and trigger a manual retry
 * via POST /developer/webhooks/:id/retry.
 *
 * Jitter
 * ──────
 * Each delay is randomised in the range [base * 0.75, base * 1.25].
 * This is "full jitter" applied to a ±25 % window, giving a smooth spread
 * without any retry arriving earlier than 75 % of the base delay.
 */

/** Base delays in milliseconds for each retry attempt (1-indexed). */
export const BACKOFF_SCHEDULE_MS: readonly number[] = [
  30_000,        // attempt 1 →  30 s
  300_000,       // attempt 2 →   5 min
  1_800_000,     // attempt 3 →  30 min
  7_200_000,     // attempt 4 →   2 h
  28_800_000,    // attempt 5 →   8 h
] as const;

/** Maximum number of automatic retry attempts. */
export const MAX_DELIVERY_ATTEMPTS = BACKOFF_SCHEDULE_MS.length;

/** Jitter factor: delay is sampled uniformly from [base*(1-J), base*(1+J)]. */
const JITTER_FACTOR = 0.25;

/**
 * Returns the next retry delay in milliseconds for the given attempt number
 * (1-indexed), with ±25 % full jitter applied.
 *
 * Returns `null` when `attempt > MAX_DELIVERY_ATTEMPTS` (no more retries).
 */
export function nextRetryDelayMs(attempt: number): number | null {
  const base = BACKOFF_SCHEDULE_MS[attempt - 1];
  if (base === undefined) return null;
  const low = base * (1 - JITTER_FACTOR);
  const high = base * (1 + JITTER_FACTOR);
  return Math.round(low + Math.random() * (high - low));
}

/**
 * Returns the `Date` at which the next retry should be attempted, or `null`
 * if all attempts are exhausted.
 */
export function nextRetryAt(attempt: number, now = new Date()): Date | null {
  const delayMs = nextRetryDelayMs(attempt);
  if (delayMs === null) return null;
  return new Date(now.getTime() + delayMs);
}
