import { RentAgreement } from '../rent/entities/rent-contract.entity';

/** Simple single-period model, matching `AgreementsService.getFees`'s
 * `lateFeeEstimated` convention of treating one monthly rent as the billable
 * unit rather than modeling variable-length calendar months. */
export const BILLING_PERIOD_DAYS = 30;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Computes the prorated rent owed for the partial billing period ending at
 * `terminationDate`.
 *
 * Billing-period convention (reused from the existing `getFees`/
 * `lateFeeEstimated` single-period model for consistency, rather than
 * inventing a new one): the current period starts at the agreement's most
 * recent payment (`lastPaymentDate`), or its `startDate` if no payment has
 * been recorded yet, and runs for a flat `BILLING_PERIOD_DAYS` (30) days —
 * this codebase has no explicit calendar-billing-cycle field, so a 30-day
 * period is the same flat convention `getFees` already uses for "one
 * monthly rent" as the billable unit.
 *
 * Formula: `monthlyRent * (daysElapsedInPeriod / BILLING_PERIOD_DAYS)`,
 * where `daysElapsedInPeriod` is clamped to `[0, BILLING_PERIOD_DAYS]` so a
 * termination date before the period start (clock skew, backdated
 * termination) never produces a negative amount, and a termination date
 * past a full period never exceeds one full month's rent.
 *
 * Rounded to 2 decimal places (currency precision, matching the entity's
 * `numeric(12,2)` columns).
 */
export function calculateProratedRent(
  agreement: Pick<
    RentAgreement,
    'monthlyRent' | 'lastPaymentDate' | 'startDate'
  >,
  terminationDate: Date,
): number {
  const monthlyRent = Number(agreement.monthlyRent);
  const periodStart = agreement.lastPaymentDate ?? agreement.startDate;

  // No known period anchor (e.g. a draft agreement with neither a payment
  // nor a start date) — nothing owed, nothing to prorate.
  if (!periodStart) {
    return 0;
  }

  const rawDaysElapsed =
    (terminationDate.getTime() - new Date(periodStart).getTime()) / MS_PER_DAY;
  const daysElapsed = Math.min(
    Math.max(rawDaysElapsed, 0),
    BILLING_PERIOD_DAYS,
  );

  const prorated = monthlyRent * (daysElapsed / BILLING_PERIOD_DAYS);
  return Math.round(prorated * 100) / 100;
}
