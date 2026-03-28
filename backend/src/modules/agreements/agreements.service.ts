import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
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
import { AuditAction, AuditLevel } from '../audit/entities/audit-log.entity';
import { AuditLog } from '../audit/decorators/audit-log.decorator';
import { ReviewPromptService } from '../reviews/review-prompt.service';
import { ChiomaContractService } from '../stellar/services/chioma-contract.service';
import { BlockchainSyncService } from './blockchain-sync.service';
import { EscrowIntegrationService } from './escrow-integration.service';
import { TemplateRenderingService } from './template-rendering.service';
import { PDFGenerationService } from './pdf-generation.service';

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
  ) {}

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
    const [data, total] = await this.agreementRepository.findAndCount();
    return { data, total, page: query.page || 1, limit: query.limit || 10 };
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
    const {
      startDate: startDateStr,
      endDate: endDateStr,
      renewalNoticeDate: renewalNoticeDateStr,
      moveInDate: moveInDateStr,
      moveOutDate: moveOutDateStr,
      ...rest
    } = dto;
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
    return await this.agreementRepository.save(agreement);
  }

  async renew(id: string, dto: RenewAgreementDto) {
    const agreement = await this.findOne(id);
    if (agreement.renewalOption !== true) {
      throw new BadRequestException(
        agreement.renewalOption === false
          ? 'This agreement does not allow renewal (renewalOption is false).'
          : 'Set renewalOption to true on the agreement before renewing.',
      );
    }
    const months = dto.extendMonths ?? 12;
    const base = agreement.endDate
      ? new Date(agreement.endDate)
      : new Date();
    const newEnd = new Date(base.getTime());
    newEnd.setMonth(newEnd.getMonth() + months);
    agreement.endDate = newEnd;
    if (
      agreement.status === AgreementStatus.EXPIRED ||
      agreement.status === AgreementStatus.ACTIVE
    ) {
      agreement.status = AgreementStatus.ACTIVE;
    }
    return await this.agreementRepository.save(agreement);
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

  async terminate(id: string, dto: TerminateAgreementDto) {
    const agreement = await this.findOne(id);
    agreement.status = AgreementStatus.TERMINATED;
    return await this.agreementRepository.save(agreement);
  }

  async recordPayment(id: string, dto: RecordPaymentDto) {
    const agreement = await this.findOne(id);
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
