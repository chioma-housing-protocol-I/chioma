import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  RentAgreement,
  AgreementStatus,
} from '../rent/entities/rent-contract.entity';
import { Payment, PaymentStatus } from '../rent/entities/payment.entity';
import { CreateAgreementDto } from './dto/create-agreement.dto';
import { UpdateAgreementDto } from './dto/update-agreement.dto';
import { RecordPaymentDto } from './dto/record-payment.dto';
import { TerminateAgreementDto } from './dto/terminate-agreement.dto';
import { QueryAgreementsDto } from './dto/query-agreements.dto';
import { RenewAgreementDto } from './dto/renew-agreement.dto';
import { AuditService } from '../audit/audit.service';
import { ReviewPromptService } from '../reviews/review-prompt.service';
import { ChiomaContractService } from '../stellar/services/chioma-contract.service';
import { BlockchainSyncService } from './blockchain-sync.service';
import { EscrowIntegrationService } from './escrow-integration.service';
import { TemplateRenderingService } from './template-rendering.service';
import { PDFGenerationService } from './pdf-generation.service';
import { Locked, LockService } from '../../common/lock';
import { Idempotent, IdempotencyService } from '../../common/idempotency';
import { AgreementStateService } from './state-machines/agreement-state-machine.service';
import { EventEmitter } from '@nestjs/event-emitter';
import { AgreementStatusChangedEvent } from './events/agreement-status-changed.event';

@Injectable()
export class AgreementsService {
  private readonly logger = new Logger(AgreementsService.name);

  constructor(
    @InjectRepository(RentAgreement)
    private readonly agreementRepository: Repository<RentAgreement>,
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    private readonly auditService: AuditService,
    private readonly reviewPromptService: ReviewPromptService,
    private readonly chiomaContract: ChiomaContractService,
    private readonly blockchainSync: BlockchainSyncService,
    private readonly escrowIntegration: EscrowIntegrationService,
    private readonly templateService: TemplateRenderingService,
    private readonly pdfService: PDFGenerationService,
    private readonly lockService: LockService,
    private readonly idempotencyService: IdempotencyService,
    private readonly stateService: AgreementStateService,
    private readonly eventEmitter: EventEmitter,
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

    const [data, total] = await this.agreementRepository.findAndCount({
      where: whereClause,
      order: { [sortBy || 'createdAt']: sortOrder || 'DESC' },
      skip: (page ? page - 1 : 0) * (limit || 10),
      take: limit || 10,
    });

    return { data, total, page: page || 1, limit: limit || 10 };
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

  async terminate(id: string, _dto: TerminateAgreementDto) {
    const agreement = await this.findOne(id);
    const oldStatus = agreement.status;
    // Validate transition to TERMINATED
    this.stateService.validateTransition(
      agreement.status,
      AgreementStatus.TERMINATED,
    );
    agreement.status = AgreementStatus.TERMINATED;
    const saved = await this.agreementRepository.save(agreement);
    this.eventEmitter.emit(
      'agreement.status.changed',
      new AgreementStatusChangedEvent(
        id,
        oldStatus,
        AgreementStatus.TERMINATED,
        'Agreement terminated',
      ),
    );
    return saved;
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

  async getPayments(id: string) {
    return await this.paymentRepository.find({ where: { agreementId: id } });
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
  ): Promise<RentAgreement> {
    const agreement = await this.findOne(id);
    const oldStatus = agreement.status;
    this.stateService.validateTransition(oldStatus, newStatus);
    agreement.status = newStatus;
    const saved = await this.agreementRepository.save(agreement);
    this.eventEmitter.emit(
      'agreement.status.changed',
      new AgreementStatusChangedEvent(id, oldStatus, newStatus, reason),
    );
    return saved;
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
