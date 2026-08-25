import { Injectable, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { Dispute, DisputeStatus } from './entities/dispute.entity';
import { DisputeEvidence } from './entities/dispute-evidence.entity';
import { DisputeComment } from './entities/dispute-comment.entity';
import {
  RentAgreement,
  AgreementStatus,
} from '../rent/entities/rent-contract.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { Payment as GeneralPayment } from '../payments/entities/payment.entity';
import { Payment as RentPayment } from '../rent/entities/payment.entity';
import { CreateDisputeDto } from './dto/create-dispute.dto';
import { AddEvidenceDto } from './dto/add-evidence.dto';
import { AddCommentDto } from './dto/add-comment.dto';
import { ResolveDisputeDto } from './dto/resolve-dispute.dto';
import { UpdateDisputeDto } from './dto/update-dispute.dto';
import { QueryDisputesDto } from './dto/query-disputes.dto';
import { AuditService } from '../audit/audit.service';
import { AuditAction, AuditLevel } from '../audit/entities/audit-log.entity';
import { AuditLog } from '../audit/decorators/audit-log.decorator';
import { randomUUID } from 'crypto';
import { Locked, LockService } from '../../common/lock';
import { Idempotent, IdempotencyService } from '../../common/idempotency';
import {
  AgreementNotFoundError,
  UserNotFoundError,
  AuthorizationError,
  BusinessRuleViolationError,
  DisputeNotFoundError,
  ValidationError,
} from '../../common/errors/domain-errors';
import {
  DEFAULT_EVIDENCE_MAX_FILE_SIZE_BYTES,
  validateEvidenceFile,
} from './utils/evidence-file-validation.util';

@Injectable()
export class DisputesService {
  constructor(
    @InjectRepository(Dispute)
    private readonly disputeRepository: Repository<Dispute>,
    @InjectRepository(DisputeEvidence)
    private readonly evidenceRepository: Repository<DisputeEvidence>,
    @InjectRepository(DisputeComment)
    private readonly commentRepository: Repository<DisputeComment>,
    @InjectRepository(RentAgreement)
    private readonly agreementRepository: Repository<RentAgreement>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(GeneralPayment)
    private readonly generalPaymentRepository: Repository<GeneralPayment>,
    @InjectRepository(RentPayment)
    private readonly rentPaymentRepository: Repository<RentPayment>,
    private readonly auditService: AuditService,
    private readonly dataSource: DataSource,
    private readonly lockService: LockService,
    private readonly idempotencyService: IdempotencyService,
    @Optional() private readonly configService?: ConfigService,
  ) {}

  /**
   * Create a new dispute
   */
  @AuditLog({
    action: AuditAction.CREATE,
    entityType: 'Dispute',
    level: AuditLevel.INFO,
    includeNewValues: true,
  })
  @Locked({
    key: (createDisputeDto: CreateDisputeDto) =>
      `dispute:create:${createDisputeDto.agreementId}`,
    ttlMs: 10000,
  })
  @Idempotent({
    ttlMs: 2_592_000_000,
    key: (createDisputeDto: CreateDisputeDto, userId: string) =>
      createDisputeDto.idempotencyKey
        ? `dispute:create:${userId}:${createDisputeDto.idempotencyKey}`
        : null,
    requireKey: false,
  })
  async createDispute(
    createDisputeDto: CreateDisputeDto,
    userId: string,
  ): Promise<Dispute> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Validate agreement exists and user has permission
      const agreement = await queryRunner.manager.findOne(RentAgreement, {
        where: { id: createDisputeDto.agreementId },
        relations: ['landlord', 'tenant'],
      });

      if (!agreement) {
        throw new AgreementNotFoundError(createDisputeDto.agreementId);
      }

      // Check if user is party to the agreement
      const user = await queryRunner.manager.findOne(User, {
        where: { id: userId },
      });

      if (!user) {
        throw new UserNotFoundError(userId);
      }

      const isLandlord = agreement.adminId === user.id;
      const isTenant = agreement.userId === user.id;

      if (!isLandlord && !isTenant && user.role !== UserRole.ADMIN) {
        throw new AuthorizationError(
          'You can only create disputes for agreements you are party to',
        );
      }

      // Check if there's already an active dispute for this agreement
      const existingDispute = await queryRunner.manager.findOne(Dispute, {
        where: {
          agreementId: createDisputeDto.agreementId,
          status: In([DisputeStatus.OPEN, DisputeStatus.UNDER_REVIEW]),
        },
      });

      if (existingDispute) {
        throw new BusinessRuleViolationError(
          'There is already an active dispute for this agreement',
        );
      }

      // Validate payment references if provided and gather payment context
      let paymentContext: {
        paymentId?: string;
        rentPaymentId?: string;
        disputedPaymentAmount?: number;
        paymentReferenceNumber?: string;
        paymentDate?: Date;
      } = {};

      if (createDisputeDto.paymentId) {
        const generalPayment = await queryRunner.manager.findOne(
          GeneralPayment,
          {
            where: { id: createDisputeDto.paymentId },
          },
        );

        if (!generalPayment) {
          throw new ValidationError(
            `Payment with ID ${createDisputeDto.paymentId} not found`,
          );
        }

        // Validate payment belongs to the same agreement
        if (generalPayment.agreementId !== createDisputeDto.agreementId) {
          throw new ValidationError(
            'Payment does not belong to the specified agreement',
          );
        }

        paymentContext = {
          paymentId: generalPayment.id,
          disputedPaymentAmount: Number(generalPayment.amount),
          paymentReferenceNumber: generalPayment.referenceNumber || undefined,
          paymentDate: generalPayment.processedAt || generalPayment.createdAt,
        };
      }

      if (createDisputeDto.rentPaymentId) {
        const rentPayment = await queryRunner.manager.findOne(RentPayment, {
          where: { paymentId: createDisputeDto.rentPaymentId },
        });

        if (!rentPayment) {
          throw new ValidationError(
            `Rent payment with ID ${createDisputeDto.rentPaymentId} not found`,
          );
        }

        // Validate payment belongs to the same agreement
        if (rentPayment.agreementId !== createDisputeDto.agreementId) {
          throw new ValidationError(
            'Rent payment does not belong to the specified agreement',
          );
        }

        paymentContext = {
          ...paymentContext,
          rentPaymentId: rentPayment.paymentId,
          disputedPaymentAmount:
            paymentContext.disputedPaymentAmount || Number(rentPayment.amount),
          paymentReferenceNumber:
            paymentContext.paymentReferenceNumber ||
            rentPayment.referenceNumber ||
            undefined,
          paymentDate: paymentContext.paymentDate || rentPayment.paymentDate,
        };
      }

      if (
        createDisputeDto.paymentReferenceNumber &&
        !paymentContext.paymentId &&
        !paymentContext.rentPaymentId
      ) {
        // Try to find payment by reference number if no direct payment IDs provided
        const generalPayment = await queryRunner.manager.findOne(
          GeneralPayment,
          {
            where: {
              referenceNumber: createDisputeDto.paymentReferenceNumber,
              agreementId: createDisputeDto.agreementId,
            },
          },
        );

        const rentPayment = await queryRunner.manager.findOne(RentPayment, {
          where: {
            referenceNumber: createDisputeDto.paymentReferenceNumber,
            agreementId: createDisputeDto.agreementId,
          },
        });

        if (!generalPayment && !rentPayment) {
          throw new ValidationError(
            `No payment found with reference number ${createDisputeDto.paymentReferenceNumber} for this agreement`,
          );
        }

        if (generalPayment) {
          paymentContext = {
            paymentId: generalPayment.id,
            disputedPaymentAmount: Number(generalPayment.amount),
            paymentReferenceNumber: generalPayment.referenceNumber || undefined,
            paymentDate: generalPayment.processedAt || generalPayment.createdAt,
          };
        }

        if (rentPayment) {
          paymentContext = {
            ...paymentContext,
            rentPaymentId: rentPayment.paymentId,
            disputedPaymentAmount:
              paymentContext.disputedPaymentAmount ||
              Number(rentPayment.amount),
            paymentReferenceNumber:
              paymentContext.paymentReferenceNumber ||
              rentPayment.referenceNumber ||
              undefined,
            paymentDate: paymentContext.paymentDate || rentPayment.paymentDate,
          };
        }
      }

      // Create dispute
      const dispute = queryRunner.manager.create(Dispute, {
        disputeId: randomUUID(),
        agreement: agreement,
        initiatedBy: user.id,
        disputeType: createDisputeDto.disputeType,
        requestedAmount: createDisputeDto.requestedAmount,
        description: createDisputeDto.description,
        status: DisputeStatus.OPEN,
        metadata: createDisputeDto.metadata
          ? JSON.parse(createDisputeDto.metadata)
          : null,
        // Payment correlation fields
        paymentId: paymentContext.paymentId || null,
        rentPaymentId: paymentContext.rentPaymentId || null,
        disputedPaymentAmount: paymentContext.disputedPaymentAmount || null,
        paymentReferenceNumber: paymentContext.paymentReferenceNumber || null,
        paymentDate: paymentContext.paymentDate || null,
      });

      const savedDispute = await queryRunner.manager.save(dispute);

      // Update agreement status to disputed
      await queryRunner.manager.update(RentAgreement, agreement.id, {
        status: AgreementStatus.DISPUTED,
      });

      await queryRunner.commitTransaction();

      // Return dispute with relations
      return this.findOne(savedDispute.id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Get all disputes with filtering and pagination
   */
  async findAll(
    query: QueryDisputesDto,
    _userId?: string,
  ): Promise<{ disputes: Dispute[]; total: number }> {
    const queryBuilder = this.disputeRepository
      .createQueryBuilder('dispute')
      .leftJoinAndSelect('dispute.agreement', 'agreement')
      .leftJoinAndSelect('dispute.initiator', 'initiator')
      .leftJoinAndSelect('dispute.resolver', 'resolver')
      .leftJoinAndSelect('dispute.evidence', 'evidence')
      .leftJoinAndSelect('dispute.comments', 'comments')
      .leftJoinAndSelect('comments.user', 'commentUser');

    // Apply filters
    if (query.status) {
      queryBuilder.andWhere('dispute.status = :status', {
        status: query.status,
      });
    }

    if (query.disputeType) {
      queryBuilder.andWhere('dispute.disputeType = :disputeType', {
        disputeType: query.disputeType,
      });
    }

    if (query.agreementId) {
      queryBuilder.andWhere('dispute.agreementId = :agreementId', {
        agreementId: query.agreementId,
      });
    }

    if (query.initiatedBy) {
      queryBuilder.andWhere('dispute.initiatedBy = :initiatedBy', {
        initiatedBy: query.initiatedBy,
      });
    }

    if (query.disputeIds && query.disputeIds.length > 0) {
      queryBuilder.andWhere('dispute.disputeId IN (:...disputeIds)', {
        disputeIds: query.disputeIds,
      });
    }

    // Payment correlation filters
    if (query.paymentId) {
      queryBuilder.andWhere('dispute.paymentId = :paymentId', {
        paymentId: query.paymentId,
      });
    }

    if (query.rentPaymentId) {
      queryBuilder.andWhere('dispute.rentPaymentId = :rentPaymentId', {
        rentPaymentId: query.rentPaymentId,
      });
    }

    if (query.paymentReferenceNumber) {
      queryBuilder.andWhere(
        'dispute.paymentReferenceNumber = :paymentReferenceNumber',
        {
          paymentReferenceNumber: query.paymentReferenceNumber,
        },
      );
    }

    // Apply sorting
    const sortField =
      query.sortBy === 'createdAt'
        ? 'dispute.createdAt'
        : query.sortBy === 'status'
          ? 'dispute.status'
          : 'dispute.createdAt';
    queryBuilder.orderBy(sortField, query.sortOrder);

    // Apply pagination
    const skip = ((query?.page || 1) - 1) * (query?.limit || 10);
    queryBuilder.skip(skip).take(query?.limit || 10);

    const [disputes, total] = await queryBuilder.getManyAndCount();

    return { disputes, total };
  }

  /**
   * Get a single dispute by ID
   */
  async findOne(id: number): Promise<Dispute> {
    const dispute = await this.disputeRepository.findOne({
      where: { id },
      relations: [
        'agreement',
        'initiator',
        'resolver',
        'evidence',
        'evidence.uploader',
        'comments',
        'comments.user',
      ],
    });

    if (!dispute) {
      throw new DisputeNotFoundError(id.toString());
    }

    return dispute;
  }

  /**
   * Get a dispute by disputeId
   */
  async findByDisputeId(disputeId: string): Promise<Dispute> {
    const dispute = await this.disputeRepository.findOne({
      where: { disputeId },
      relations: [
        'agreement',
        'initiator',
        'resolver',
        'evidence',
        'evidence.uploader',
        'comments',
        'comments.user',
      ],
    });

    if (!dispute) {
      throw new DisputeNotFoundError(disputeId);
    }

    return dispute;
  }

  /**
   * Update a dispute
   */
  @AuditLog({
    action: AuditAction.UPDATE,
    entityType: 'Dispute',
    level: AuditLevel.INFO,
    includeOldValues: true,
    includeNewValues: true,
  })
  async update(
    id: number,
    updateDisputeDto: UpdateDisputeDto,
    userId: string,
  ): Promise<Dispute> {
    const dispute = await this.findOne(id);
    const isAppealReopenRequest =
      dispute.status === DisputeStatus.REJECTED &&
      updateDisputeDto.status === DisputeStatus.OPEN &&
      updateDisputeDto.description === undefined &&
      updateDisputeDto.requestedAmount === undefined;

    // Check permissions
    await this.checkDisputePermission(
      dispute,
      userId,
      isAppealReopenRequest ? 'appeal' : 'update',
    );

    // Validate status transitions
    if (
      updateDisputeDto.status &&
      !this.isValidStatusTransition(dispute.status, updateDisputeDto.status)
    ) {
      throw new BusinessRuleViolationError(
        `Invalid status transition from ${dispute.status} to ${updateDisputeDto.status}`,
      );
    }

    Object.assign(dispute, updateDisputeDto);

    // When a dispute is resolved with a resolution, track who resolved it
    if (
      updateDisputeDto.status === DisputeStatus.RESOLVED &&
      'resolution' in updateDisputeDto &&
      updateDisputeDto.resolution
    ) {
      dispute.resolvedBy = userId;
      dispute.resolvedAt = new Date();
    }

    return this.disputeRepository.save(dispute);
  }

  /**
   * Add evidence to a dispute
   */
  async addEvidence(
    disputeId: string,
    file: any,
    userId: string,
    dto?: AddEvidenceDto,
  ): Promise<DisputeEvidence> {
    const dispute = await this.findByDisputeId(disputeId);

    // Check permissions
    await this.checkDisputePermission(dispute, userId, 'add_evidence');

    // Validate file content (magic bytes), never the declared MIME header
    const detectedType = this.validateFile(file);

    // Create evidence record
    const evidence = this.evidenceRepository.create({
      dispute: dispute,
      uploadedBy: userId,
      fileUrl: file.path, // This would be replaced with actual file storage URL
      fileName: file.originalname,
      // Store the sniffed content type, not the client-declared one.
      fileType: detectedType,
      fileSize: file.size,
      description: dto?.description,
    });

    return this.evidenceRepository.save(evidence);
  }

  /**
   * Add comment to a dispute
   */
  async addComment(
    disputeId: string,
    addCommentDto: AddCommentDto,
    userId: string,
  ): Promise<DisputeComment> {
    const dispute = await this.findByDisputeId(disputeId);

    // Check permissions
    await this.checkDisputePermission(dispute, userId, 'comment');

    // Only admins can add internal comments
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (addCommentDto.isInternal && user?.role !== UserRole.ADMIN) {
      throw new AuthorizationError('Only admins can add internal comments');
    }

    const comment = this.commentRepository.create({
      dispute: dispute,
      userId: userId,
      content: addCommentDto.content,
      isInternal: addCommentDto.isInternal || false,
    });

    return this.commentRepository.save(comment);
  }

  /**
   * Resolve a dispute
   */
  @AuditLog({
    action: AuditAction.UPDATE,
    entityType: 'Dispute',
    level: AuditLevel.INFO,
    includeOldValues: true,
    includeNewValues: true,
  })
  @Locked({
    key: (disputeId: string) => `dispute:resolve:${disputeId}`,
    ttlMs: 10000,
  })
  async resolveDispute(
    disputeId: string,
    resolveDisputeDto: ResolveDisputeDto,
    userId: string,
  ): Promise<Dispute> {
    const dispute = await this.findByDisputeId(disputeId);

    // Only admins can resolve disputes
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (user?.role !== UserRole.ADMIN) {
      throw new AuthorizationError('Only admins can resolve disputes');
    }

    if (dispute.status !== DisputeStatus.UNDER_REVIEW) {
      throw new BusinessRuleViolationError(
        'Only disputes under review can be resolved',
      );
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Update dispute
      await queryRunner.manager.update(Dispute, dispute.id, {
        status: DisputeStatus.RESOLVED,
        resolution: resolveDisputeDto.resolution,
        resolvedBy: userId,
        resolvedAt: new Date(),
      });

      // Update agreement status if needed
      if (dispute.agreement.status === AgreementStatus.DISPUTED) {
        await queryRunner.manager.update(RentAgreement, dispute.agreement.id, {
          status: AgreementStatus.ACTIVE,
        });
      }

      await queryRunner.commitTransaction();

      return this.findByDisputeId(disputeId);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Get disputes for a specific agreement
   */
  async getAgreementDisputes(
    agreementId: string,
    userId?: string,
  ): Promise<Dispute[]> {
    const agreement = await this.agreementRepository.findOne({
      where: { id: agreementId },
      relations: ['landlord', 'tenant'],
    });

    if (!agreement) {
      throw new AgreementNotFoundError(agreementId);
    }

    if (userId) {
      const user = await this.userRepository.findOne({ where: { id: userId } });
      const isLandlord = agreement.adminId === user?.id;
      const isTenant = agreement.userId === user?.id;
      const isAdmin = user?.role === UserRole.ADMIN;

      if (!isLandlord && !isTenant && !isAdmin) {
        throw new AuthorizationError(
          'You can only view disputes for agreements you are party to',
        );
      }
    }

    return this.disputeRepository.find({
      where: { agreementId },
      relations: ['initiator', 'resolver', 'evidence', 'comments'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Check if user has permission to perform action on dispute
   */
  private async checkDisputePermission(
    dispute: Dispute,
    userId: string,
    action: string,
  ): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new UserNotFoundError(userId);
    }

    const isInitiator = dispute.initiatedBy === userId;
    const isLandlord = dispute.agreement.adminId === userId;
    const isTenant = dispute.agreement.userId === userId;
    const isAdmin = user.role === UserRole.ADMIN;

    if (!isAdmin && !isInitiator && !isLandlord && !isTenant) {
      throw new AuthorizationError(
        'You do not have permission to perform this action on this dispute',
      );
    }

    // Additional restrictions based on action
    if (
      action === 'update' &&
      !isAdmin &&
      dispute.status !== DisputeStatus.OPEN
    ) {
      throw new AuthorizationError(
        'Only admins can update disputes that are not open',
      );
    }
  }

  /**
   * Validate status transition
   */
  private isValidStatusTransition(
    currentStatus: DisputeStatus,
    newStatus: DisputeStatus,
  ): boolean {
    const validTransitions = {
      [DisputeStatus.OPEN]: [
        DisputeStatus.UNDER_REVIEW,
        DisputeStatus.WITHDRAWN,
      ],
      [DisputeStatus.UNDER_REVIEW]: [
        DisputeStatus.RESOLVED,
        DisputeStatus.REJECTED,
        DisputeStatus.OPEN,
      ],
      [DisputeStatus.RESOLVED]: [], // Terminal state
      [DisputeStatus.REJECTED]: [DisputeStatus.OPEN], // Can be reopened
      [DisputeStatus.WITHDRAWN]: [], // Terminal state
    };

    return (
      validTransitions[currentStatus as string]?.includes(
        newStatus as string,
      ) || false
    );
  }

  /**
   * Validate uploaded file
   */
  /**
   * Validate an evidence upload by sniffing its content (magic bytes) —
   * the client-declared MIME type is ignored — and by enforcing the
   * configurable size cap (`DISPUTE_EVIDENCE_MAX_FILE_SIZE_BYTES`).
   *
   * Returns the detected content type on success.
   */
  private validateFile(file: any): string {
    const result = validateEvidenceFile(file, this.getEvidenceMaxSizeBytes());
    if (!result.isValid || !result.detectedType) {
      throw new ValidationError(
        result.error ?? 'Evidence file failed validation',
      );
    }
    return result.detectedType;
  }

  private getEvidenceMaxSizeBytes(): number {
    const configured = Number(
      this.configService?.get(
        'DISPUTE_EVIDENCE_MAX_FILE_SIZE_BYTES',
        DEFAULT_EVIDENCE_MAX_FILE_SIZE_BYTES,
      ) ?? DEFAULT_EVIDENCE_MAX_FILE_SIZE_BYTES,
    );
    return Number.isFinite(configured) && configured > 0
      ? configured
      : DEFAULT_EVIDENCE_MAX_FILE_SIZE_BYTES;
  }

  /**
   * Find disputes by payment correlation
   */
  async findDisputesByPayment(paymentId: string): Promise<Dispute[]> {
    return this.disputeRepository.find({
      where: { paymentId },
      relations: ['agreement', 'initiator', 'resolver', 'evidence', 'comments'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Find disputes by rent payment correlation
   */
  async findDisputesByRentPayment(rentPaymentId: string): Promise<Dispute[]> {
    return this.disputeRepository.find({
      where: { rentPaymentId },
      relations: ['agreement', 'initiator', 'resolver', 'evidence', 'comments'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Find disputes by payment reference number
   */
  async findDisputesByPaymentReference(
    referenceNumber: string,
  ): Promise<Dispute[]> {
    return this.disputeRepository.find({
      where: { paymentReferenceNumber: referenceNumber },
      relations: ['agreement', 'initiator', 'resolver', 'evidence', 'comments'],
      order: { createdAt: 'DESC' },
    });
  }
}
