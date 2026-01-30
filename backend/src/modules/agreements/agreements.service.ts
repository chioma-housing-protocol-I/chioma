import {
  Injectable,
  NotFoundException,
  BadRequestException,
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
import {
  AuditAction,
  AuditLevel,
  AuditStatus,
} from '../audit/entities/audit-log.entity';
import { AuditLog } from '../audit/decorators/audit-log.decorator';

@Injectable()
export class AgreementsService {
  constructor(
    @InjectRepository(RentAgreement)
    private readonly agreementRepository: Repository<RentAgreement>,
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Create a new rent agreement
   */
  @AuditLog({
    action: AuditAction.CREATE,
    entityType: 'RentAgreement',
    level: AuditLevel.INFO,
    includeNewValues: true,
  })
  async create(
    createAgreementDto: CreateAgreementDto,
    performedBy?: string,
  ): Promise<RentAgreement> {
    // Validate dates
    const startDate = new Date(createAgreementDto.startDate);
    const endDate = new Date(createAgreementDto.endDate);

    if (endDate <= startDate) {
      throw new BadRequestException('End date must be after start date');
    }

    // Generate agreement number
    const agreementNumber = await this.generateAgreementNumber();

    // Create agreement entity
    const agreement = this.agreementRepository.create({
      ...createAgreementDto,
      agreementNumber,
      startDate,
      endDate,
      status: AgreementStatus.DRAFT,
      escrowBalance: 0,
      totalPaid: 0,
    });

    const savedAgreement = await this.agreementRepository.save(agreement);

    return savedAgreement;
  }

  /**
   * Find all agreements with filtering, pagination, and sorting
   */
  async findAll(query: QueryAgreementsDto): Promise<{
    data: RentAgreement[];
    total: number;
    page: number;
    limit: number;
  }> {
    const {
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
      ...filters
    } = query;

    const queryBuilder =
      this.agreementRepository.createQueryBuilder('agreement');

    // Apply filters
    if (filters.status) {
      queryBuilder.andWhere('agreement.status = :status', {
        status: filters.status,
      });
    }
    if (filters.landlordId) {
      queryBuilder.andWhere('agreement.landlordId = :landlordId', {
        landlordId: filters.landlordId,
      });
    }
    if (filters.tenantId) {
      queryBuilder.andWhere('agreement.tenantId = :tenantId', {
        tenantId: filters.tenantId,
      });
    }
    if (filters.agentId) {
      queryBuilder.andWhere('agreement.agentId = :agentId', {
        agentId: filters.agentId,
      });
    }
    if (filters.propertyId) {
      queryBuilder.andWhere('agreement.propertyId = :propertyId', {
        propertyId: filters.propertyId,
      });
    }

    // Apply sorting
    queryBuilder.orderBy(`agreement.${sortBy}`, sortOrder);

    // Apply pagination
    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    // Execute query
    const [data, total] = await queryBuilder.getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
    };
  }

  /**
   * Find one agreement by ID
   */
  async findOne(id: string): Promise<RentAgreement> {
    const agreement = await this.agreementRepository.findOne({
      where: { id },
      relations: ['payments'],
    });

    if (!agreement) {
      throw new NotFoundException(`Agreement with ID ${id} not found`);
    }

    return agreement;
  }

  /**
   * Update an agreement
   */
  @AuditLog({
    action: AuditAction.UPDATE,
    entityType: 'RentAgreement',
    level: AuditLevel.INFO,
    includeOldValues: true,
    includeNewValues: true,
  })
  async update(
    id: string,
    updateAgreementDto: UpdateAgreementDto,
    performedBy?: string,
  ): Promise<RentAgreement> {
    const agreement = await this.findOne(id);
    const oldValues = {
      status: agreement.status,
      monthlyRent: agreement.monthlyRent,
      securityDeposit: agreement.securityDeposit,
      startDate: agreement.startDate,
      endDate: agreement.endDate,
      termsAndConditions: agreement.termsAndConditions,
    };

    // Validate dates if both are provided
    if (updateAgreementDto.startDate && updateAgreementDto.endDate) {
      const startDate = new Date(updateAgreementDto.startDate);
      const endDate = new Date(updateAgreementDto.endDate);

      if (endDate <= startDate) {
        throw new BadRequestException('End date must be after start date');
      }
    }

    // Update agreement
    Object.assign(agreement, updateAgreementDto);

    // Convert date strings to Date objects if provided
    if ((updateAgreementDto as any).startDate) {
      agreement.startDate = new Date((updateAgreementDto as any).startDate);
    }
    if ((updateAgreementDto as any).endDate) {
      agreement.endDate = new Date((updateAgreementDto as any).endDate);
    }

    const updatedAgreement = await this.agreementRepository.save(agreement);

    return updatedAgreement;
  }

  @AuditLog({
    action: AuditAction.UPDATE,
    entityType: 'RentAgreement',
    level: AuditLevel.WARN,
    includeOldValues: true,
    includeNewValues: true,
  })
  async terminate(
    id: string,
    terminateDto: TerminateAgreementDto,
    performedBy?: string,
  ): Promise<RentAgreement> {
    const agreement = await this.findOne(id);

    if (agreement.status === AgreementStatus.TERMINATED) {
      throw new BadRequestException('Agreement is already terminated');
    }

    const oldStatus = agreement.status;
    agreement.status = AgreementStatus.TERMINATED;
    agreement.terminationDate = new Date();
    agreement.terminationReason = terminateDto.terminationReason;

    const terminatedAgreement = await this.agreementRepository.save(agreement);

    return terminatedAgreement;
  }

  @AuditLog({
    action: AuditAction.CREATE,
    entityType: 'Payment',
    level: AuditLevel.INFO,
    includeNewValues: true,
  })
  async recordPayment(
    agreementId: string,
    recordPaymentDto: RecordPaymentDto,
    performedBy?: string,
  ): Promise<Payment> {
    const agreement = await this.findOne(agreementId);

    if (agreement.status === AgreementStatus.TERMINATED) {
      throw new BadRequestException(
        'Cannot record payment for a terminated agreement',
      );
    }

    const oldTotalPaid = agreement.totalPaid;
    const oldEscrowBalance = agreement.escrowBalance;
    const oldStatus = agreement.status;

    // Create payment
    const payment = this.paymentRepository.create({
      agreementId: agreement.id,
      amount: recordPaymentDto.amount,
      paymentDate: new Date(recordPaymentDto.paymentDate),
      paymentMethod: recordPaymentDto.paymentMethod,
      referenceNumber: recordPaymentDto.referenceNumber,
      notes: recordPaymentDto.notes,
      status: PaymentStatus.COMPLETED,
    });

    const savedPayment = await this.paymentRepository.save(payment);

    // Update agreement balances
    agreement.totalPaid =
      Number(agreement.totalPaid) + Number(recordPaymentDto.amount);
    agreement.escrowBalance =
      Number(agreement.escrowBalance) + Number(recordPaymentDto.amount);
    agreement.lastPaymentDate = new Date(recordPaymentDto.paymentDate);

    // Update status to active if it's the first payment
    if (
      agreement.status === AgreementStatus.DRAFT ||
      agreement.status === AgreementStatus.PENDING_DEPOSIT
    ) {
      agreement.status = AgreementStatus.ACTIVE;
    }

    const updatedAgreement = await this.agreementRepository.save(agreement);

    // Audit log for payment creation
    await this.auditService.log({
      action: AuditAction.CREATE,
      entityType: 'Payment',
      entityId: savedPayment.paymentId,
      performedBy,
      newValues: {
        agreementId: savedPayment.agreementId,
        amount: savedPayment.amount,
        paymentDate: savedPayment.paymentDate,
        paymentMethod: savedPayment.paymentMethod,
        referenceNumber: savedPayment.referenceNumber,
      },
      level: AuditLevel.INFO,
      metadata: {
        agreementNumber: updatedAgreement.agreementNumber,
        paymentReference: recordPaymentDto.referenceNumber,
      },
    });

    // Audit log for agreement update (financial change)
    if (
      oldTotalPaid !== updatedAgreement.totalPaid ||
      oldStatus !== updatedAgreement.status
    ) {
      await this.auditService.log({
        action: AuditAction.UPDATE,
        entityType: 'RentAgreement',
        entityId: agreementId,
        performedBy,
        oldValues: {
          totalPaid: oldTotalPaid,
          escrowBalance: oldEscrowBalance,
          status: oldStatus,
        },
        newValues: {
          totalPaid: updatedAgreement.totalPaid,
          escrowBalance: updatedAgreement.escrowBalance,
          status: updatedAgreement.status,
          lastPaymentDate: updatedAgreement.lastPaymentDate,
        },
        level: AuditLevel.INFO,
        metadata: {
          agreementNumber: updatedAgreement.agreementNumber,
          paymentAmount: recordPaymentDto.amount,
          paymentReference: recordPaymentDto.referenceNumber,
        },
      });
    }

    return savedPayment;
  }

  /**
   * Get all payments for an agreement
   */
  async getPayments(agreementId: string): Promise<Payment[]> {
    // Verify agreement exists
    await this.findOne(agreementId);

    return await this.paymentRepository.find({
      where: { agreementId },
      order: { paymentDate: 'DESC' },
    });
  }

  /**
   * Calculate commission amount
   */
  calculateCommission(amount: number, commissionRate: number): number {
    return (amount * commissionRate) / 100;
  }

  /**
   * Generate a unique agreement number
   */
  private async generateAgreementNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.agreementRepository.count();
    const sequenceNumber = String(count + 1).padStart(4, '0');
    return `CHIOMA-${year}-${sequenceNumber}`;
  }
}
