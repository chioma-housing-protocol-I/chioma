import { Injectable, ConflictException, Logger } from '@nestjs/common';
import { AgreementStatus } from '../../rent/entities/rent-contract.entity';

/**
 * State transition error for invalid agreement status changes.
 */
export class StateTransitionError extends ConflictException {
  constructor(
    currentStatus: AgreementStatus,
    attemptedStatus: AgreementStatus,
    allowedStatuses: AgreementStatus[],
  ) {
    super(
      `Cannot transition agreement from status '${currentStatus}' to '${attemptedStatus}'. Allowed: ${allowedStatuses.map((s) => `'${s}'`).join(', ') || 'none'}`,
    );
    this.name = 'StateTransitionError';
  }
}

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
  private readonly logger = new Logger(AgreementStateService.name);

  /**
   * Validates that the state transition is allowed.
   * Throws StateTransitionError if transition is not permitted.
   *
   * @param currentStatus Current agreement status
   * @param newStatus Desired new status
   * @param context Optional context for logging (userId, agreementId, etc.)
   */
  validateTransition(
    currentStatus: AgreementStatus,
    newStatus: AgreementStatus,
    context?: Record<string, string>,
  ): void {
    const allowed = AGREEMENT_STATE_TRANSITIONS[currentStatus] || [];
    if (!allowed.includes(newStatus)) {
      this.logger.warn(
        `Invalid state transition attempted: ${currentStatus} → ${newStatus}${context ? ` (${JSON.stringify(context)})` : ''}`,
      );
      throw new StateTransitionError(currentStatus, newStatus, allowed);
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
   *
   * @param agreement Agreement object with status field
   * @param newStatus Desired new status
   * @param context Optional context for logging (userId, agreementId, reason, etc.)
   * @returns Boolean indicating whether status was changed
   */
  transition(
    agreement: { status: AgreementStatus },
    newStatus: AgreementStatus,
    context?: Record<string, string>,
  ): boolean {
    const oldStatus = agreement.status;
    this.validateTransition(oldStatus, newStatus, context);

    if (oldStatus !== newStatus) {
      this.logger.log(
        `Agreement status transition: ${oldStatus} → ${newStatus}${context ? ` (${JSON.stringify(context)})` : ''}`,
      );
      agreement.status = newStatus;
      return true;
    }

    return false;
  }
}
