import { Injectable, ConflictException } from '@nestjs/common';
import { AgreementStatus } from '../../rent/entities/rent-contract.entity';

export const AGREEMENT_STATE_TRANSITIONS: Record<
  AgreementStatus,
  AgreementStatus[]
> = {
  [AgreementStatus.DRAFT]: [AgreementStatus.PENDING_DEPOSIT],
  [AgreementStatus.PENDING_DEPOSIT]: [AgreementStatus.SIGNED],
  [AgreementStatus.SIGNED]: [AgreementStatus.ACTIVE],
  [AgreementStatus.ACTIVE]: [
    AgreementStatus.EXPIRED,
    AgreementStatus.TERMINATED,
    AgreementStatus.DISPUTED,
  ],
  [AgreementStatus.EXPIRED]: [],
  [AgreementStatus.TERMINATED]: [],
  [AgreementStatus.DISPUTED]: [
    AgreementStatus.ACTIVE,
    AgreementStatus.TERMINATED,
  ],
};

@Injectable()
export class AgreementStateService {
  /**
   * Validates that the state transition is allowed.
   * Throws ConflictException if transition is not permitted.
   */
  validateTransition(
    currentStatus: AgreementStatus,
    newStatus: AgreementStatus,
  ): void {
    const allowed = AGREEMENT_STATE_TRANSITIONS[currentStatus] || [];
    if (!allowed.includes(newStatus)) {
      throw new ConflictException(
        `Cannot transition agreement from status '${currentStatus}' to '${newStatus}'. Allowed: ${allowed.map((s) => `'${s}'`).join(', ') || 'none'}`,
      );
    }
  }

  /**
   * Returns the list of allowed next statuses for a given current status.
   */
  getAvailableTransitions(currentStatus: AgreementStatus): AgreementStatus[] {
    return AGREEMENT_STATE_TRANSITIONS[currentStatus] || [];
  }

  /**
   * Performs a state transition if valid, and returns whether a change occurred.
   * The caller should persist the entity.
   */
  transition(
    agreement: { status: AgreementStatus },
    newStatus: AgreementStatus,
  ): boolean {
    this.validateTransition(agreement.status, newStatus);
    if (agreement.status !== newStatus) {
      agreement.status = newStatus;
      return true;
    }
    return false;
  }
}
