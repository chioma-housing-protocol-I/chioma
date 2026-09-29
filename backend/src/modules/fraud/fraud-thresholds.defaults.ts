/**
 * Safe default fraud scoring thresholds, used to seed the database on first
 * boot and as a fallback if the configured row is ever missing or invalid.
 * These are the same values that used to be hardcoded in FraudModelService.
 */
export const DEFAULT_FRAUD_THRESHOLDS = Object.freeze({
  thresholdReview: 45,
  thresholdBlock: 75,
});

export const FRAUD_THRESHOLDS_DEFAULT_KEY = 'default';

/**
 * Validates a review/block threshold pair. Pure - no I/O - so it is
 * unit-testable in isolation and reusable by both the service and its
 * DTO-level validation.
 */
export function isValidThresholdPair(
  thresholdReview: number,
  thresholdBlock: number,
): boolean {
  return (
    Number.isFinite(thresholdReview) &&
    Number.isFinite(thresholdBlock) &&
    thresholdReview >= 0 &&
    thresholdReview <= 100 &&
    thresholdBlock >= 0 &&
    thresholdBlock <= 100 &&
    thresholdReview < thresholdBlock
  );
}
