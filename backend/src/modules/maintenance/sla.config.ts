/**
 * SLA window configuration and pure helpers.
 *
 * Windows are expressed in hours and are configurable per priority via
 * environment variables so operators can retune them without a redeploy:
 *   MAINTENANCE_SLA_<PRIORITY>_RESPONSE_HOURS
 *   MAINTENANCE_SLA_<PRIORITY>_RESOLUTION_HOURS
 * e.g. MAINTENANCE_SLA_URGENT_RESPONSE_HOURS=2
 *
 * Unrecognized/missing priorities fall back to the MEDIUM window so every
 * request always gets a deadline.
 */

export interface SlaWindow {
  /** Hours the landlord/agent has to respond (leave OPEN) before breach. */
  responseHours: number;
  /** Hours the request has to reach RESOLVED/CLOSED before breach. */
  resolutionHours: number;
}

export const DEFAULT_SLA_WINDOWS: Readonly<Record<string, SlaWindow>> = {
  URGENT: { responseHours: 2, resolutionHours: 24 },
  HIGH: { responseHours: 4, resolutionHours: 48 },
  MEDIUM: { responseHours: 24, resolutionHours: 120 },
  LOW: { responseHours: 48, resolutionHours: 240 },
};

/** Minimal config accessor so callers don't need the full NestJS ConfigService type. */
export interface SlaConfigSource {
  get(key: string): string | undefined;
}

function normalizePriority(priority?: string): string {
  return (priority ?? 'MEDIUM').toUpperCase();
}

function readHours(
  config: SlaConfigSource | undefined,
  key: string,
  fallback: number,
): number {
  const raw = config?.get(key);
  const parsed = raw === undefined ? NaN : Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

/**
 * Resolves the SLA window for a priority, checking configuration first and
 * falling back to `DEFAULT_SLA_WINDOWS.MEDIUM` for unknown priorities. Pure
 * aside from reading the optional config source, so it is unit-testable
 * without a real ConfigService or database.
 */
export function resolveSlaWindow(
  priority: string | undefined,
  config?: SlaConfigSource,
): SlaWindow {
  const normalized = normalizePriority(priority);
  const defaults = DEFAULT_SLA_WINDOWS[normalized] ?? DEFAULT_SLA_WINDOWS.MEDIUM;

  return {
    responseHours: readHours(
      config,
      `MAINTENANCE_SLA_${normalized}_RESPONSE_HOURS`,
      defaults.responseHours,
    ),
    resolutionHours: readHours(
      config,
      `MAINTENANCE_SLA_${normalized}_RESOLUTION_HOURS`,
      defaults.resolutionHours,
    ),
  };
}

function addHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

/**
 * Computes the response/resolution deadlines for a request created at
 * `createdAt` with the given `priority`. Pure - no I/O.
 */
export function computeSlaDeadlines(
  createdAt: Date,
  priority: string | undefined,
  config?: SlaConfigSource,
): { responseDueAt: Date; resolutionDueAt: Date } {
  const window = resolveSlaWindow(priority, config);
  return {
    responseDueAt: addHours(createdAt, window.responseHours),
    resolutionDueAt: addHours(createdAt, window.resolutionHours),
  };
}
