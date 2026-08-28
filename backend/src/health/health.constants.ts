/**
 * Dependency classification for the health check.
 *
 * `/health` is wired to the Kubernetes liveness, readiness *and* startup probes
 * (see `k8s/deployment.yaml`), so a 503 restarts the pod. Only dependencies that
 * make every request path fail may therefore be classified as `critical`:
 * anything else has to surface as `degraded` so a downstream outage does not
 * turn into a pod-restart storm across the fleet.
 *
 * - `critical` — a failure means the service cannot serve traffic at all.
 *   Overall status becomes `error` and `/health` responds `503`.
 * - `degraded` — a failure removes a feature but the API still serves requests.
 *   Overall status becomes `warning` and `/health` responds `200`.
 *
 * The rationale per dependency is documented in `docs/HEALTH_CHECKS.md`.
 */
export type DependencyCriticality = 'critical' | 'degraded';

/**
 * Per-indicator status reported inside the `services` map.
 *
 * `skipped` marks a dependency that is intentionally not configured in the
 * current environment (for example Redis under `NODE_ENV=test`). It never
 * influences the overall status.
 */
export type DependencyStatus = 'up' | 'warning' | 'down' | 'skipped';

export const DEPENDENCY_CRITICALITY: Readonly<
  Record<string, DependencyCriticality>
> = Object.freeze({
  // Nothing can be served without Postgres.
  database: 'critical',
  // Caching, queues, locks and rate limiting degrade; reads still succeed.
  redis: 'degraded',
  // Search falls back to PostgreSQL full-text search.
  elasticsearch: 'degraded',
  // On-chain writes are queued and retried by the blockchain sync jobs.
  stellar: 'degraded',
  // Heap pressure is a warning signal, not a reason to drop out of the LB.
  memory: 'degraded',
});

/** Unknown indicators are treated as non-fatal until classified explicitly. */
export const DEFAULT_DEPENDENCY_CRITICALITY: DependencyCriticality = 'degraded';

export function getDependencyCriticality(name: string): DependencyCriticality {
  return DEPENDENCY_CRITICALITY[name] ?? DEFAULT_DEPENDENCY_CRITICALITY;
}

/** True when a reported indicator status means the dependency is unusable. */
export function isFailingStatus(status: unknown): boolean {
  return status === 'down';
}

/** True when a reported indicator status is a non-fatal warning. */
export function isDegradedStatus(status: unknown): boolean {
  return status === 'warning';
}
