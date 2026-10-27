/**
 * Process-wide hook that lets the monitoring layer observe cache lookups
 * without CacheService depending on MetricsService (CacheService is provided
 * in several modules that do not import MonitoringModule).
 */
export type CacheLookupObserver = (hit: boolean) => void;

let observer: CacheLookupObserver | null = null;

/** Register (or replace) the observer notified on every cache lookup. */
export function registerCacheLookupObserver(
  next: CacheLookupObserver | null,
): void {
  observer = next;
}

/** Notify the registered observer of a cache hit or miss. Never throws. */
export function notifyCacheLookup(hit: boolean): void {
  if (!observer) return;
  try {
    observer(hit);
  } catch {
    // Metrics must never break the cache path.
  }
}
