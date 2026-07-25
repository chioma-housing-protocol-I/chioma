/**
 * Shared types for the resilience module.
 *
 * The resilience module groups together the production-readiness patterns that
 * keep the platform responsive when downstream dependencies misbehave:
 *
 * - Bulkhead isolation ({@link BulkheadOptions})
 * - Fallback execution ({@link FallbackOptions})
 * - Graceful degradation ({@link DegradationLevel}, {@link FeaturePriority})
 * - Incident tracking ({@link IncidentSeverity}, {@link IncidentStatus})
 * - Timeout enforcement ({@link TimeoutOptions}, {@link TimeoutMetrics})
 */

// ── Bulkhead ────────────────────────────────────────────────────────────────

/** Configuration for an isolated bulkhead compartment. */
export interface BulkheadOptions {
  /** Maximum number of calls allowed to run concurrently. */
  maxConcurrent: number;
  /** Maximum number of calls allowed to wait for a free slot. */
  maxQueue: number;
}

export const DEFAULT_BULKHEAD_OPTIONS: BulkheadOptions = {
  maxConcurrent: 10,
  maxQueue: 20,
};

/** Point-in-time view of a bulkhead compartment. */
export interface BulkheadMetrics {
  name: string;
  /** Calls currently executing. */
  active: number;
  /** Calls currently waiting for a free slot. */
  queued: number;
  maxConcurrent: number;
  maxQueue: number;
  /** Calls that have completed (successfully or not). */
  totalExecuted: number;
  /** Calls rejected because the compartment was saturated. */
  totalRejected: number;
}

// ── Timeout ───────────────────────────────────────────────────────────────

/** Default per-call deadline used when no explicit `timeoutMs` is provided. */
export const DEFAULT_TIMEOUT_MS = 10_000;

/** Configuration for a single timeout-protected call site. */
export interface TimeoutOptions {
  /**
   * Maximum milliseconds to wait for the wrapped function to settle.
   * Defaults to {@link DEFAULT_TIMEOUT_MS} when omitted.
   */
  timeoutMs?: number;
  /** Human-readable label used in log messages and metrics. */
  context?: string;
  /** Invoked immediately before the deadline fires (useful for cleanup/logging). */
  onTimeout?: (context: string, timeoutMs: number) => void;
}

/** Aggregate view of a named timeout call site. */
export interface TimeoutMetrics {
  /** The label that was passed as `options.context`. */
  context: string;
  /** Total invocations (both successful and timed-out). */
  totalCalls: number;
  /** Invocations that exceeded the deadline. */
  totalTimeouts: number;
  /** Last deadline that was enforced (ms), or `undefined` if never called. */
  lastTimeoutMs: number | undefined;
}

// ── Fallback ──────────────────────────────────────────────────────────────

/**
 * Options describing how to recover when the primary operation fails.
 * Exactly one of `fallbackFn` or `fallbackValue` should be supplied; when both
 * are present `fallbackFn` takes precedence.
 */
export interface FallbackOptions<T> {
  /** Produces a fallback result from the primary error. */
  fallbackFn?: (error: Error) => Promise<T> | T;
  /** Static value returned when the primary operation fails. */
  fallbackValue?: T;
  /**
   * Predicate deciding whether a given error should trigger the fallback.
   * Defaults to falling back on every error.
   */
  shouldFallback?: (error: Error) => boolean;
  /** Label used in logs. */
  context?: string;
  /** Invoked when the fallback path is taken. */
  onFallback?: (error: Error) => void;
}

export interface FallbackStats {
  totalCalls: number;
  totalFallbacks: number;
  lastError?: Error;
}

// ── Graceful degradation ──────────────────────────────────────────────────

/** Overall health posture used to gate non-essential functionality. */
export enum DegradationLevel {
  /** Everything is healthy; all features enabled. */
  NORMAL = 'normal',
  /** Reduced capacity; optional features disabled. */
  PARTIAL = 'partial',
  /** Major outage; only essential features remain. */
  SEVERE = 'severe',
}

/** How important a feature is, used to decide what to shed under load. */
export enum FeaturePriority {
  /** Must always remain available (auth, payments, core reads). */
  ESSENTIAL = 'essential',
  /** Normal functionality; disabled only under a severe outage. */
  STANDARD = 'standard',
  /** Nice-to-have; first to be disabled when degraded. */
  OPTIONAL = 'optional',
}

export interface FeatureStatus {
  name: string;
  priority: FeaturePriority;
  enabled: boolean;
}

export interface DegradationStatus {
  level: DegradationLevel;
  reason?: string;
  since: Date;
  features: FeatureStatus[];
}

// ── Incident tracking ──────────────────────────────────────────────────────

/** Severity levels mirrored from docs/INCIDENT_RESPONSE.md. */
export enum IncidentSeverity {
  /** Critical: complete outage or data loss. */
  SEV1 = 'SEV1',
  /** Major: significant degradation affecting many users. */
  SEV2 = 'SEV2',
  /** Minor: limited impact or workaround available. */
  SEV3 = 'SEV3',
  /** Low: cosmetic or negligible impact. */
  SEV4 = 'SEV4',
}

/** Lifecycle states mirrored from docs/INCIDENT_RESPONSE.md. */
export enum IncidentStatus {
  OPEN = 'open',
  INVESTIGATING = 'investigating',
  MITIGATING = 'mitigating',
  MONITORING = 'monitoring',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
}

export interface IncidentTimelineEntry {
  at: Date;
  message: string;
}

export interface DeclareIncidentInput {
  title: string;
  severity: IncidentSeverity;
  description?: string;
  category?: string;
  reportedBy?: string;
  affectedServices?: string[];
  /** When the incident actually began (defaults to now). */
  startedAt?: Date;
}

export interface Incident {
  /** Human-readable identifier in the form INC-YYYY-NNN. */
  id: string;
  title: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  description?: string;
  category?: string;
  reportedBy?: string;
  affectedServices: string[];
  startedAt: Date;
  detectedAt: Date;
  mitigatedAt?: Date;
  resolvedAt?: Date;
  updatedAt: Date;
  timeline: IncidentTimelineEntry[];
}

/**
 * Response-effectiveness metrics for a single incident, in milliseconds.
 * Mirrors the MTTM / MTTR definitions in docs/INCIDENT_RESPONSE.md.
 * Values are `undefined` until the relevant milestone is reached.
 */
export interface IncidentMetrics {
  id: string;
  /** Detection latency: detectedAt - startedAt. */
  timeToDetectMs: number;
  /** Mean Time To Mitigate: mitigatedAt - detectedAt. */
  timeToMitigateMs?: number;
  /** Mean Time To Resolve: resolvedAt - detectedAt. */
  timeToResolveMs?: number;
}
