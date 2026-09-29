/**
 * Retention window configuration for raw KYC documents.
 *
 * `KYC_DOCUMENT_RETENTION_DAYS` lets operators tune the window without a
 * redeploy; falls back to a conservative 90-day default post-decision.
 */

export const DEFAULT_KYC_RETENTION_DAYS = 90;

export interface KycRetentionConfigSource {
  get(key: string): string | undefined;
}

/**
 * Resolves the number of days a raw KYC document may be retained after a
 * verification decision (APPROVED/REJECTED) before it must be purged. Pure
 * aside from the optional config read, so it is unit-testable without a
 * ConfigService or database.
 */
export function resolveKycRetentionDays(
  config?: KycRetentionConfigSource,
): number {
  const raw = config?.get('KYC_DOCUMENT_RETENTION_DAYS');
  const parsed = raw === undefined ? NaN : Number(raw);
  return Number.isFinite(parsed) && parsed > 0
    ? parsed
    : DEFAULT_KYC_RETENTION_DAYS;
}

/**
 * The cutoff timestamp: decisions made at or before this instant are past
 * their retention window and eligible for purge.
 */
export function computeRetentionCutoff(
  now: Date,
  config?: KycRetentionConfigSource,
): Date {
  const days = resolveKycRetentionDays(config);
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
}
