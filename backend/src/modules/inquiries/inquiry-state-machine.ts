import { BadRequestException } from '@nestjs/common';
import { PropertyInquiryStatus } from './entities/property-inquiry.entity';

/**
 * Domain error for lifecycle violations. Carries a stable `code` so API
 * consumers can distinguish it from generic validation failures.
 */
export class InvalidInquiryTransitionError extends BadRequestException {
  constructor(
    readonly from: PropertyInquiryStatus,
    readonly to: PropertyInquiryStatus,
  ) {
    super({
      message: `Invalid inquiry status transition: ${from} -> ${to}`,
      code: 'INQUIRY_INVALID_TRANSITION',
    });
  }
}

/**
 * The explicit inquiry lifecycle. Every legal transition is listed here;
 * anything not in the table is rejected. Terminal states have an empty list.
 *
 *   PENDING ──▶ VIEWED ──▶ RESPONDED ──▶ CLOSED
 *      │           └───────────┬────────────▲
 *      └──────────────────────────────────────
 *
 * RESPONDED is reached when the recipient replies via in-app messaging. A
 * repeat reply keeps the inquiry in RESPONDED (callers short-circuit before
 * asserting), so RESPONDED -> RESPONDED is intentionally absent.
 */
export const INQUIRY_STATUS_TRANSITIONS: Record<
  PropertyInquiryStatus,
  readonly PropertyInquiryStatus[]
> = {
  [PropertyInquiryStatus.PENDING]: [
    PropertyInquiryStatus.VIEWED,
    PropertyInquiryStatus.RESPONDED,
    PropertyInquiryStatus.CLOSED,
  ],
  [PropertyInquiryStatus.VIEWED]: [
    PropertyInquiryStatus.RESPONDED,
    PropertyInquiryStatus.CLOSED,
  ],
  [PropertyInquiryStatus.RESPONDED]: [PropertyInquiryStatus.CLOSED],
  [PropertyInquiryStatus.CLOSED]: [],
};

export function canTransitionInquiry(
  from: PropertyInquiryStatus,
  to: PropertyInquiryStatus,
): boolean {
  return (INQUIRY_STATUS_TRANSITIONS[from] ?? []).includes(to);
}

/**
 * Assert a lifecycle transition is legal, throwing the domain error when not.
 * Same-state "transitions" are also rejected: callers wanting idempotent
 * behavior should short-circuit before asserting.
 */
export function assertInquiryTransition(
  from: PropertyInquiryStatus,
  to: PropertyInquiryStatus,
): void {
  if (!canTransitionInquiry(from, to)) {
    throw new InvalidInquiryTransitionError(from, to);
  }
}
