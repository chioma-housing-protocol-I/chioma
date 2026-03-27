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
    const startDate = new Date(createAgreementDto.startDate);
    const endDate = new Date(createAgreementDto.endDate);
    if (endDate <= startDate)
      throw new BadRequestException('End date must be after start date');
    const agreementNumber = await this.generateAgreementNumber();
    const agreement = this.agreementRepository.create({
      ...createAgreementDto,
      agreementNumber,
      startDate,
      endDate,
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
    Object.assign(agreement, dto);
    return await this.agreementRepository.save(agreement);
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
