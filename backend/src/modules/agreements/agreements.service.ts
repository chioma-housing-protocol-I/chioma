import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import {
  RentAgreement,
  AgreementStatus,
} from '../rent/entities/rent-contract.entity';
import { Payment, PaymentStatus } from '../rent/entities/payment.entity';
import { StellarEscrow } from '../stellar/entities/stellar-escrow.entity';
import {
  TerminationReconciliation,
  ReconciliationStepStatus,
} from './entities/termination-reconciliation.entity';
import { CreateAgreementDto } from './dto/create-agreement.dto';
import { UpdateAgreementDto } from './dto/update-agreement.dto';
import { RecordPaymentDto } from './dto/record-payment.dto';
import { TerminateAgreementDto } from './dto/terminate-agreement.dto';
import { QueryAgreementsDto } from './dto/query-agreements.dto';
import { RenewAgreementDto } from './dto/renew-agreement.dto';
import { SignAgreementDto } from './dto/sign-agreement.dto';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/entities/audit-log.entity';
import { ReviewPromptService } from '../reviews/review-prompt.service';
import { ChiomaContractService } from '../stellar/services/chioma-contract.service';
import { AgreementNftService } from './agreement-nft.service';
import { BlockchainSyncService } from './blockchain-sync.service';
import { EscrowIntegrationService } from './escrow-integration.service';
import { TemplateRenderingService } from './template-rendering.service';
import { PDFGenerationService } from './pdf-generation.service';
import { Locked, LockService } from '../../common/lock';
import { Idempotent, IdempotencyService } from '../../common/idempotency';
import { AgreementStateService } from './state-machines/agreement-state-machine.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AgreementStatusChangedEvent } from './events/agreement-status-changed.event';
import { PaginationUtils } from '../../common/utils';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { calculateProratedRent } from './termination-reconciliation.utils';

@Injectable()
export class AgreementsService {
  private readonly logger = new Logger(AgreementsService.name);

  constructor(
    @InjectRepository(RentAgreement)
    private readonly agreementRepository: Repository<RentAgreement>,
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @InjectRepository(StellarEscrow)
    private readonly escrowRepository: Repository<StellarEscrow>,
    @InjectRepository(TerminationReconciliation)
    private readonly terminationReconciliationRepository: Repository<TerminationReconciliation>,
    private readonly dataSource: DataSource,
    private readonly auditService: AuditService,
    private readonly reviewPromptService: ReviewPromptService,
    private readonly chiomaContract: ChiomaContractService,
    private readonly agreementNftService: AgreementNftService,
    private readonly blockchainSync: BlockchainSyncService,
    private readonly escrowIntegration: EscrowIntegrationService,
    private readonly templateService: TemplateRenderingService,
    private readonly pdfService: PDFGenerationService,
    private readonly lockService: LockService,
    private readonly idempotencyService: IdempotencyService,
    private readonly stateService: AgreementStateService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @Locked({
    key: (createAgreementDto: CreateAgreementDto) =>
      `agreement:create:${createAgreementDto.propertyId}:${createAgreementDto.userId}:${createAgreementDto.startDate}`,
    ttlMs: 10000,
  })
  @Idempotent({
    ttlMs: 604_800_000,
    key: (createAgreementDto: CreateAgreementDto) =>
      createAgreementDto.idempotencyKey
        ? `agreement:create:${createAgreementDto.adminId}:${createAgreementDto.idempotencyKey}`
        : null,
    requireKey: false,
  })
  async create(createAgreementDto: CreateAgreementDto) {
    const {
      startDate: startDateStr,
      endDate: endDateStr,
      renewalNoticeDate: renewalNoticeDateStr,
      moveInDate: moveInDateStr,
      moveOutDate: moveOutDateStr,
      ...rest
    } = createAgreementDto;
    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);
    if (endDate <= startDate)
      throw new BadRequestException('End date must be after start date');
    const agreementNumber = await this.generateAgreementNumber();
    const agreement = this.agreementRepository.create({
      ...rest,
      agreementNumber,
      startDate,
      endDate,
      renewalNoticeDate: renewalNoticeDateStr
        ? new Date(renewalNoticeDateStr)
        : null,
      moveInDate: moveInDateStr ? new Date(moveInDateStr) : null,
      moveOutDate: moveOutDateStr ? new Date(moveOutDateStr) : null,
      status: AgreementStatus.DRAFT,
      escrowBalance: 0,
      totalPaid: 0,
    });
    return await this.agreementRepository.save(agreement);
  }

  async findAll(query: QueryAgreementsDto) {
    const {
      status,
      landlordId,
      tenantId,
      agentId,
      propertyId,
      page,
      limit,
      sortBy,
      sortOrder,
    } = query;

    const whereClause: any = {};
    if (status) whereClause.status = status;
    if (landlordId) whereClause.landlordId = landlordId;
    if (tenantId) whereClause.userId = tenantId; // assuming user_id is tenant
    if (agentId) whereClause.agentId = agentId;
    if (propertyId) whereClause.propertyId = propertyId;

    const currentPage = page || 1;
    const pageSize = limit || 20;

    const [data, total] = await this.agreementRepository.findAndCount({
      where: whereClause,
      order: { [sortBy || 'createdAt']: sortOrder || 'DESC' },
      skip: PaginationUtils.calculateOffset(currentPage, pageSize),
      take: pageSize,
    });

    return PaginationUtils.buildPaginationResponse(
      data,
      total,
      currentPage,
      pageSize,
    );
  }

  async findOne(id: string) {
    const agreement = await this.agreementRepository.findOne({
      where: { id },
      relations: ['payments'],
    });
    if (!agreement) throw new NotFoundException(`Agreement ${id} not found`);
    return agreement;
  }

  async update(id: string, dto: UpdateAgreementDto) {
    const agreement = await this.findOne(id);
    const oldStatus = agreement.status;
    const {
      startDate: startDateStr,
      endDate: endDateStr,
      renewalNoticeDate: renewalNoticeDateStr,
      moveInDate: moveInDateStr,
      moveOutDate: moveOutDateStr,
      ...rest
    } = dto;

    // Apply non-status changes first (Object.assign will include status if present)
    if (rest.status) {
      // Validate status transition if status is being changed
      this.stateService.validateTransition(agreement.status, rest.status);
    }

    Object.assign(agreement, rest);

    if (startDateStr !== undefined) {
      agreement.startDate = startDateStr ? new Date(startDateStr) : null;
    }
    if (endDateStr !== undefined) {
      agreement.endDate = endDateStr ? new Date(endDateStr) : null;
    }
    if (renewalNoticeDateStr !== undefined) {
      agreement.renewalNoticeDate = renewalNoticeDateStr
        ? new Date(renewalNoticeDateStr)
        : null;
    }
    if (moveInDateStr !== undefined) {
      agreement.moveInDate = moveInDateStr ? new Date(moveInDateStr) : null;
    }
    if (moveOutDateStr !== undefined) {
      agreement.moveOutDate = moveOutDateStr ? new Date(moveOutDateStr) : null;
    }
    if (agreement.startDate && agreement.endDate) {
      const s = new Date(agreement.startDate);
      const e = new Date(agreement.endDate);
      if (e <= s) {
        throw new BadRequestException('End date must be after start date');
      }
    }

    const newStatus = agreement.status;
    // Emit event if status changed
    if (newStatus !== oldStatus) {
      this.eventEmitter.emit(
        'agreement.status.changed',
        new AgreementStatusChangedEvent(id, oldStatus, newStatus),
      );
    }

    return await this.agreementRepository.save(agreement);
  }

  @Locked({ key: (id: string) => `agreement:renew:${id}`, ttlMs: 5000 })
  async renew(id: string, dto: RenewAgreementDto) {
    const agreement = await this.findOne(id);
    if (agreement.renewalOption !== true) {
      throw new BadRequestException(
        agreement.renewalOption === false
          ? 'This agreement does not allow renewal (renewalOption is false).'
          : 'Set renewalOption to true on the agreement before renewing.',
      );
    }
    // Only allow renewal for ACTIVE agreements; EXPIRED cannot be renewed
    if (agreement.status === AgreementStatus.EXPIRED) {
      throw new BadRequestException('Cannot renew an expired agreement.');
    }
    const months = dto.extendMonths ?? 12;
    const base = agreement.endDate ? new Date(agreement.endDate) : new Date();
    const newEnd = new Date(base.getTime());
    newEnd.setMonth(newEnd.getMonth() + months);
    agreement.endDate = newEnd;

    // Validate status transition to ACTIVE (if not already active, it's a change)
    this.stateService.validateTransition(
      agreement.status,
      AgreementStatus.ACTIVE,
    );
    const oldStatus = agreement.status;
    agreement.status = AgreementStatus.ACTIVE;

    const saved = await this.agreementRepository.save(agreement);

    // Emit event if status changed
    if (agreement.status !== oldStatus) {
      this.eventEmitter.emit(
        'agreement.status.changed',
        new AgreementStatusChangedEvent(
          id,
          oldStatus,
          AgreementStatus.ACTIVE,
          'Lease renewal',
        ),
      );
    }

    return saved;
  }

  @Locked({ key: (id: string) => `agreement:sign:${id}`, ttlMs: 10000 })
  @Idempotent({
    ttlMs: 604_800_000,
    key: (id: string, dto: SignAgreementDto) =>
      dto?.idempotencyKey ? `agreement:sign:${id}:${dto.idempotencyKey}` : null,
    requireKey: false,
  })
  async sign(id: string, _dto: SignAgreementDto) {
    const agreement = await this.findOne(id);
    const oldStatus = agreement.status;
    this.stateService.validateTransition(
      agreement.status,
      AgreementStatus.SIGNED,
    );
    agreement.status = AgreementStatus.SIGNED;
    const saved = await this.agreementRepository.save(agreement);

    this.eventEmitter.emit(
      'agreement.status.changed',
      new AgreementStatusChangedEvent(
        id,
        oldStatus,
        AgreementStatus.SIGNED,
        'Agreement signed',
      ),
    );

    return saved;
  }

  async getFees(id: string, daysPastDue?: number) {
    const agreement = await this.findOne(id);
    const rent = Number(agreement.monthlyRent);
    const latePct =
      agreement.lateFeePercentage != null
        ? Number(agreement.lateFeePercentage)
        : null;
    const grace = agreement.gracePeriodDays ?? 0;

    let lateFeeEstimated: number | null = null;
    let lateFeeExplanation: string | null = null;

    if (daysPastDue != null && latePct != null) {
      const billableDays = Math.max(0, daysPastDue - grace);
      if (billableDays <= 0) {
        lateFeeEstimated = 0;
        lateFeeExplanation =
          'Within grace period for the given days past due; estimated late fee is 0.';
      } else {
        lateFeeEstimated = Math.round(rent * (latePct / 100) * 100) / 100;
        lateFeeExplanation = `Estimated late fee uses ${latePct}% of one monthly rent (${rent}) after the ${grace}-day grace period (simple single-period model).`;
      }
    }

    return {
      agreementId: agreement.id,
      monthlyRent: rent,
      earlyTerminationFee:
        agreement.earlyTerminationFee != null
          ? Number(agreement.earlyTerminationFee)
          : null,
      lateFeePercentage: latePct,
      gracePeriodDays: agreement.gracePeriodDays ?? null,
      daysPastDue: daysPastDue ?? null,
      lateFeeEstimated,
      lateFeeExplanation,
    };
  }

  /**
   * Terminates an agreement and reconciles everything that termination
   * implies as one flow: prorated final rent, security-deposit refund
   * (release of the on-chain escrow — see the design note on
   * {@link runTerminationReconciliation} for why this is the real model in
   * this codebase, not a fiat `Payment` refund), and the system's own
   * multisig approval for escrow release.
   *
   * Status-transition-timing decision: the state-machine transition to
   * TERMINATED happens FIRST, before any reconciliation sub-step is
   * attempted, and is unconditional once the transition is valid. This
   * deliberately does NOT block termination on the reconciliation
   * succeeding. Rationale: the issue's own acceptance criteria describe a
   * partial failure as something that must leave the agreement "clearly
   * recoverable/retryable... not silently terminated" — i.e. the *ambiguity*
   * of silent, unrecorded failure is the defect, not the fact that the
   * agreement ends up TERMINATED. A lease's legal/operational termination
   * (the tenant has vacated, the landlord has ended the tenancy) is a fact
   * that occurred at `terminationDate` regardless of whether a downstream
   * refund or escrow call happened to succeed on the first attempt — a
   * temporarily down payment gateway or blockchain RPC should not leave the
   * agreement stuck in a pre-termination state. Instead, "recoverable" is
   * satisfied by the `TerminationReconciliation` row: every sub-step's
   * outcome is durable and queryable, and a failure is retried via
   * {@link retryTerminationReconciliation} without re-attempting the
   * agreement status transition (which already succeeded) or any sub-step
   * that already succeeded.
   */
  async terminate(id: string, dto: TerminateAgreementDto) {
    const agreement = await this.findOne(id);
    const oldStatus = agreement.status;
    // Validate transition to TERMINATED
    this.stateService.validateTransition(
      agreement.status,
      AgreementStatus.TERMINATED,
    );

    const terminationDate = dto.terminationDate
      ? new Date(dto.terminationDate)
      : new Date();

    const proratedRentOwed = calculateProratedRent(agreement, terminationDate);

    const saved = await this.dataSource.transaction(async (manager) => {
      agreement.status = AgreementStatus.TERMINATED;
      agreement.terminationDate = terminationDate;
      agreement.terminationReason = dto.terminationReason;
      const savedAgreement = await manager.save(RentAgreement, agreement);

      await manager.save(
        TerminationReconciliation,
        manager.create(TerminationReconciliation, {
          agreementId: id,
          terminationDate,
          proratedRentOwed,
          depositRefundStatus: ReconciliationStepStatus.PENDING,
          escrowReleaseStatus: ReconciliationStepStatus.PENDING,
        }),
      );

      return savedAgreement;
    });

    this.eventEmitter.emit(
      'agreement.status.changed',
      new AgreementStatusChangedEvent(
        id,
        oldStatus,
        AgreementStatus.TERMINATED,
        'Agreement terminated',
      ),
    );

    try {
      await this.agreementNftService.burnNftForAgreement(
        id,
        'AgreementTerminated',
      );
    } catch (error) {
      this.logger.error(
        `Failed to burn NFT obligation for terminated agreement ${id}`,
        error,
      );
    }

    try {
      await this.runTerminationReconciliation(id);
    } catch (error) {
      // The reconciliation row already durably records any sub-step
      // failure; an unexpected error escaping the method entirely (e.g. a
      // DB error reading the escrow) must still not unwind the
      // already-committed TERMINATED status change.
      this.logger.error(
        `Termination reconciliation failed unexpectedly for agreement ${id}`,
        error,
      );
    }
    await this.promptLeaseReviewSafely(id);

    return saved;
  }

  /**
   * Retries only the failed sub-step(s) of an agreement's existing
   * termination reconciliation. Matches the scoping precedent set by
   * `ReferralService.retryFailedReward`: a plain callable method (not an
   * automatic cron/queue trigger — `AgreementCronService` currently only
   * handles date-driven status transitions, and wiring a reconciliation
   * retry sweep into it would need its own backoff/attempt-limit policy,
   * which is a larger change than this fix is scoped to), left for an admin
   * action or a future scheduled job to invoke.
   *
   * A sub-step that already succeeded is never re-attempted (no
   * double-refund, no redundant escrow-approval call) — only `pending` or
   * `failed` sub-steps are retried.
   */
  async retryTerminationReconciliation(agreementId: string): Promise<void> {
    const reconciliation =
      await this.terminationReconciliationRepository.findOne({
        where: { agreementId },
      });

    if (!reconciliation) {
      this.logger.warn(
        `No termination reconciliation found for agreement ${agreementId}`,
      );
      return;
    }

    await this.runTerminationReconciliation(agreementId);
  }

  /**
   * Runs (or re-runs, on retry) the deposit-refund and escrow-release
   * sub-steps of an agreement's termination reconciliation, and writes an
   * audit log entry recording the outcome.
   *
   * Deposit-refund model — determined by reading the code, not assumed:
   * security deposits in this codebase are tracked purely as on-chain
   * escrow, never as a fiat `Payment` row. Evidence:
   *   - `EscrowIntegrationService.createEscrowForAgreement` creates a
   *     `StellarEscrow` sized to `agreement.securityDeposit` and syncs it
   *     on-chain; there is no corresponding code path anywhere that inserts
   *     a `Payment` row (of either `rent/entities/payment.entity.ts`'s
   *     bare-bones `rent_payments` shape or `payments/entities/
   *     payment.entity.ts`'s full gateway-charge shape) tagged as a
   *     security-deposit charge.
   *   - `AgreementCronService.handleDailyTransitions` gates the
   *     SIGNED -> ACTIVE transition on `escrowBalance >= securityDeposit`,
   *     confirming `escrowBalance` (backed by the `StellarEscrow` row) is
   *     the deposit's real ledger, not a `Payment`.
   *   - `RefundService.processRefund` requires a `Payment` row with
   *     `status === COMPLETED` and a `metadata.chargeId` from a real
   *     Paystack/Flutterwave charge — no such row is ever created for a
   *     deposit, so calling it here would either throw `NotFoundException`
   *     or (worse) silently target the wrong `Payment` if agreement/user
   *     IDs ever collided. Therefore "deposit refund" for termination is
   *     modeled as escrow release, not a `RefundService` call.
   *
   * Escrow-release model: `EscrowIntegrationService.approveEscrowRelease`
   * is a multisig approval counter (`approvalCount`), not an atomic
   * release — it only flips the escrow to RELEASED once a second approval
   * (from the counterparty/arbiter, via whatever flow calls this method
   * outside of termination) has also been recorded. This reconciliation
   * therefore only ever claims `escrowReleaseStatus: succeeded` to mean
   * "the system recorded its own approval for release", never "the escrow
   * is confirmed released" — the escrow's actual `status` field (queryable
   * on the `StellarEscrow` row itself) is the source of truth for whether
   * release has fully completed.
   */
  private async runTerminationReconciliation(
    agreementId: string,
  ): Promise<void> {
    const reconciliation =
      await this.terminationReconciliationRepository.findOne({
        where: { agreementId },
      });

    if (!reconciliation) {
      this.logger.error(
        `runTerminationReconciliation called with no reconciliation row for agreement ${agreementId}`,
      );
      return;
    }

    const escrow = await this.escrowRepository.findOne({
      where: { rentAgreementId: agreementId },
    });

    if (!escrow) {
      // No escrow was ever created for this agreement (e.g. terminated
      // before the deposit escrow was set up) — deposit refund and escrow
      // release both legitimately do not apply, not a failure.
      reconciliation.depositRefundStatus =
        ReconciliationStepStatus.NOT_APPLICABLE;
      reconciliation.escrowReleaseStatus =
        ReconciliationStepStatus.NOT_APPLICABLE;
    } else {
      // Escrow release: record the system's own multisig approval. Skip if
      // this sub-step already succeeded on a prior attempt (idempotent
      // retry — don't record a duplicate approval).
      if (
        reconciliation.escrowReleaseStatus !==
        ReconciliationStepStatus.SUCCEEDED
      ) {
        try {
          // Release to the tenant's Stellar account — the deposit's
          // depositor/beneficiary on refund, per how `createEscrowForAgreement`
          // wires up the escrow (`depositor: agreement.userStellarPubKey`).
          const agreementForEscrow = await this.agreementRepository.findOne({
            where: { id: agreementId },
          });
          await this.escrowIntegration.approveEscrowRelease(
            escrow.id,
            agreementForEscrow?.userStellarPubKey ?? '',
          );
          reconciliation.escrowReleaseStatus =
            ReconciliationStepStatus.SUCCEEDED;
          reconciliation.escrowReleaseError = null;
        } catch (error) {
          reconciliation.escrowReleaseStatus = ReconciliationStepStatus.FAILED;
          reconciliation.escrowReleaseError =
            error instanceof Error ? error.message : String(error);
          this.logger.error(
            `Escrow release approval failed for agreement ${agreementId}`,
            error,
          );
        }
      }

      // Deposit refund: for a fully on-chain-escrowed deposit with no
      // separate fiat charge, the refund IS the escrow release recorded
      // above — there is no separate gateway call to make. Mirror the
      // escrow-release outcome so the reconciliation row still gives a
      // direct answer to "was the deposit refunded", without re-running
      // the release call twice.
      if (
        reconciliation.depositRefundStatus !==
        ReconciliationStepStatus.SUCCEEDED
      ) {
        reconciliation.depositRefundStatus = reconciliation.escrowReleaseStatus;
        reconciliation.depositRefundError = reconciliation.escrowReleaseError;
      }
    }

    await this.terminationReconciliationRepository.save(reconciliation);

    const bothOk = [
      reconciliation.depositRefundStatus,
      reconciliation.escrowReleaseStatus,
    ].every(
      (s) =>
        s === ReconciliationStepStatus.SUCCEEDED ||
        s === ReconciliationStepStatus.NOT_APPLICABLE,
    );

    const auditMetadata = {
      agreementId,
      proratedRentOwed: reconciliation.proratedRentOwed,
      depositRefundStatus: reconciliation.depositRefundStatus,
      depositRefundError: reconciliation.depositRefundError,
      escrowReleaseStatus: reconciliation.escrowReleaseStatus,
      escrowReleaseError: reconciliation.escrowReleaseError,
    };

    if (bothOk) {
      await this.auditService.logSuccess(
        AuditAction.ESCROW_RELEASED,
        'TerminationReconciliation',
        agreementId,
        undefined,
        undefined,
        undefined,
        auditMetadata,
      );
    } else {
      await this.auditService.logFailure(
        AuditAction.ESCROW_RELEASED,
        'TerminationReconciliation',
        agreementId,
        `Termination reconciliation partial failure: deposit=${reconciliation.depositRefundStatus}, escrow=${reconciliation.escrowReleaseStatus}`,
        undefined,
        auditMetadata,
      );
    }
  }

  async recordPayment(id: string, dto: RecordPaymentDto) {
    await this.findOne(id);
    const payment = this.paymentRepository.create({
      agreementId: id,
      amount: dto.amount,
      status: PaymentStatus.COMPLETED,
    });
    return await this.paymentRepository.save(payment);
  }

  async getPayments(
    id: string,
    query: PaginationQueryDto,
  ): Promise<PaginatedResponseDto<Payment>> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    PaginationUtils.validatePagination(page, limit);

    const [data, total] = await this.paymentRepository.findAndCount({
      where: { agreementId: id },
      relations: ['user', 'paymentMethodRelation'],
      order: { createdAt: 'DESC' },
      skip: PaginationUtils.calculateOffset(page, limit),
      take: limit,
    });

    return PaginationUtils.buildPaginationResponse(data, total, page, limit);
  }

  /**
   * Finds agreements by status without pagination (for internal/cron use).
   */
  async findByStatus(status: AgreementStatus): Promise<RentAgreement[]> {
    return this.agreementRepository.find({ where: { status } });
  }

  /**
   * Helper to update agreement status with state machine validation.
   * Used by cron and other internal processes.
   */
  async updateStatusWithGuard(
    id: string,
    newStatus: AgreementStatus,
    reason?: string,
    userId?: string,
  ): Promise<RentAgreement> {
    const agreement = await this.findOne(id);
    const oldStatus = agreement.status;

    // Validate and transition with logging context
    this.stateService.validateTransition(oldStatus, newStatus, {
      agreementId: id,
      userId: userId || agreement.userId,
      reason: reason || 'No reason provided',
    });

    agreement.status = newStatus;
    const saved = await this.agreementRepository.save(agreement);
    this.eventEmitter.emit(
      'agreement.status.changed',
      new AgreementStatusChangedEvent(id, oldStatus, newStatus, reason),
    );

    if (newStatus === AgreementStatus.EXPIRED) {
      await this.promptLeaseReviewSafely(id);
    }

    return saved;
  }

  /**
   * Sends the lease-end review prompt without letting a notification
   * failure block the status transition that triggered it.
   */
  private async promptLeaseReviewSafely(agreementId: string): Promise<void> {
    try {
      await this.reviewPromptService.promptForLeaseReview(agreementId);
    } catch (error) {
      this.logger.error(
        `Failed to send lease review prompt for agreement ${agreementId}`,
        error,
      );
    }
  }

  async generateAgreementPdf(id: string): Promise<Buffer> {
    const agreement = await this.findOne(id);
    const content = this.templateService.render(
      agreement.termsAndConditions || 'Standard Terms',
      {
        tenant_name: 'Tenant',
        amount: agreement.monthlyRent,
      },
    );
    return this.pdfService.generateAgreement(
      content,
      agreement.agreementNumber,
    );
  }

  private async generateAgreementNumber(): Promise<string> {
    const count = await this.agreementRepository.count();
    return `CHIOMA-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;
  }
}
