export enum KycStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  NEEDS_INFO = 'NEEDS_INFO',
  /** Provider timed out; the user is queued for a human decision. */
  MANUAL_REVIEW = 'MANUAL_REVIEW',
}
