import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RentAgreement, AgreementStatus } from '../entities/rent-contract.entity';
import { AgreementNotFoundError } from '../../../common/errors/domain-errors';
import { InvalidStateTransitionError } from '../../../common/errors/domain-errors';

/**
 * Valid state transitions for rent agreements.
 * Key = current state, Value = allowed next states.
 */
export const AGREEMENT_STATE_TRANSITIONS: Readonly<
  Record<AgreementStatus, ReadonlyArray<AgreementStatus>>
> = {
  [AgreementStatus.DRAFT]: [AgreementStatus.PENDING_DEPOSIT],
  [AgreementStatus.PENDING_DEPOSIT]: [AgreementStatus.SIGNED, AgreementStatus.TERMINATED],
  [AgreementStatus.SIGNED]: [AgreementStatus.ACTIVE, AgreementStatus.TERMINATED],
  [AgreementStatus.ACTIVE]: [
    AgreementStatus.EXPIRED,
    AgreementStatus.TERMINATED,
    AgreementStatus.DISPUTED,
  ],
  [AgreementStatus.DISPUTED]: [AgreementStatus.ACTIVE, AgreementStatus.TERMINATED],
  [AgreementStatus.EXPIRED]: [],
  [AgreementStatus.TERMINATED]: [],
};

export interface TransitionOptions {
  /** ID of the user performing the transition */
  performedBy: string;
  /** Optional human-readable reason for the transition */
  reason?: string;
  /** Optional termination reason stored on the entity */
  terminationReason?: string;
}

@Injectable()
export class RentAgreementService {
  private readonly logger = new Logger(RentAgreementService.name);

  constructor(
    @InjectRepository(RentAgreement)
    private readonly agreementRepository: Repository<RentAgreement>,
  ) {}

  /**
   * Validates that transitioning from `from` to `to` is permitted.
   * Throws InvalidStateTransitionError if the transition is not in the matrix.
   */
  validateTransition(from: AgreementStatus, to: AgreementStatus): void {
    const allowed = AGREEMENT_STATE_TRANSITIONS[from];
    if (!allowed.includes(to)) {
      throw new InvalidStateTransitionError(
        `Cannot transition rent agreement from '${from}' to '${to}'`,
        { from, to, allowedTransitions: allowed },
      );
    }
  }

  /**
   * Applies a validated state transition to an agreement, persists it, and logs the change.
   */
  async transitionStatus(
    agreementId: string,
    to: AgreementStatus,
    options: TransitionOptions,
  ): Promise<RentAgreement> {
    const agreement = await this.agreementRepository.findOne({
      where: { id: agreementId },
    });

    if (!agreement) {
      throw new AgreementNotFoundError(agreementId);
    }

    const from = agreement.status;
    this.validateTransition(from, to);

    agreement.status = to;

    if (to === AgreementStatus.TERMINATED) {
      agreement.terminationDate = new Date();
      if (options.terminationReason) {
        agreement.terminationReason = options.terminationReason;
      }
    }

    const updated = await this.agreementRepository.save(agreement);

    this.logger.log(
      `Agreement ${agreementId} transitioned from '${from}' to '${to}' ` +
        `by user ${options.performedBy}` +
        (options.reason ? ` — reason: ${options.reason}` : ''),
    );

    return updated;
  }

  /** DRAFT → PENDING_DEPOSIT */
  async submitForDeposit(
    agreementId: string,
    options: TransitionOptions,
  ): Promise<RentAgreement> {
    return this.transitionStatus(agreementId, AgreementStatus.PENDING_DEPOSIT, options);
  }

  /** PENDING_DEPOSIT → SIGNED */
  async markAsSigned(
    agreementId: string,
    options: TransitionOptions,
  ): Promise<RentAgreement> {
    return this.transitionStatus(agreementId, AgreementStatus.SIGNED, options);
  }

  /** SIGNED → ACTIVE */
  async activate(
    agreementId: string,
    options: TransitionOptions,
  ): Promise<RentAgreement> {
    return this.transitionStatus(agreementId, AgreementStatus.ACTIVE, options);
  }

  /** ACTIVE → EXPIRED */
  async expire(
    agreementId: string,
    options: TransitionOptions,
  ): Promise<RentAgreement> {
    return this.transitionStatus(agreementId, AgreementStatus.EXPIRED, options);
  }

  /** ACTIVE | DISPUTED → TERMINATED  or  PENDING_DEPOSIT | SIGNED → TERMINATED */
  async terminate(
    agreementId: string,
    options: TransitionOptions,
  ): Promise<RentAgreement> {
    return this.transitionStatus(agreementId, AgreementStatus.TERMINATED, options);
  }

  /** ACTIVE → DISPUTED */
  async openDispute(
    agreementId: string,
    options: TransitionOptions,
  ): Promise<RentAgreement> {
    return this.transitionStatus(agreementId, AgreementStatus.DISPUTED, options);
  }

  /** DISPUTED → ACTIVE */
  async resolveDispute(
    agreementId: string,
    options: TransitionOptions,
  ): Promise<RentAgreement> {
    return this.transitionStatus(agreementId, AgreementStatus.ACTIVE, options);
  }
}
