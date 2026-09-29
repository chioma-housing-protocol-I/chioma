import { AlertSeverity } from './alert.types';

/**
 * Pure rule-evaluation helpers for alerts.
 *
 * These functions take only a metric/alert snapshot and return a decision -
 * no collectors, no delivery channels, no NestJS providers. Keeping the
 * rules here (rather than inline in AlertService/ErrorNotificationService)
 * lets them be unit-tested in isolation and reused by every consumer instead
 * of being re-implemented per call site.
 */

const ACTIONABLE_SEVERITIES: ReadonlySet<AlertSeverity> = new Set([
  AlertSeverity.CRITICAL,
  AlertSeverity.HIGH,
  AlertSeverity.WARNING,
]);

/**
 * Normalizes a raw severity string (e.g. from Alertmanager labels) into a
 * known `AlertSeverity`, defaulting to `INFO` for missing/unrecognized
 * values.
 */
export function resolveAlertSeverity(raw?: string): AlertSeverity {
  const normalized = (raw ?? AlertSeverity.INFO).toLowerCase();
  if (Object.values(AlertSeverity).includes(normalized as AlertSeverity)) {
    return normalized as AlertSeverity;
  }
  return AlertSeverity.INFO;
}

/**
 * Whether an alert at this severity should trigger delivery (email/Slack/
 * escalation) at all. `info`/`medium` alerts are logged but not delivered.
 */
export function isActionableSeverity(severity: AlertSeverity): boolean {
  return ACTIONABLE_SEVERITIES.has(severity);
}
