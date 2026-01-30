import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { Dispute, DisputeStatus, DisputeType } from './entities/dispute.entity';
import { DisputeEvidence } from './entities/dispute-evidence.entity';
import { DisputeComment } from './entities/dispute-comment.entity';
import {
  RentAgreement,
  AgreementStatus,
} from '../rent/entities/rent-contract.entity';
import { User, UserRole } from '../users/entities/user.entity';
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
    private readonly auditService: AuditService,
    private readonly dataSource: DataSource,
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
        throw new NotFoundException('Rent agreement not found');
      }

      // Check if user is party to the agreement
      const user = await queryRunner.manager.findOne(User, {
        where: { id: userId },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      const isLandlord = agreement.landlordId === user.id;
      const isTenant = agreement.tenantId === user.id;

      if (!isLandlord && !isTenant && user.role !== UserRole.ADMIN) {
        throw new ForbiddenException(
          'You can only create disputes for agreements you are party to',
        );
      }

      // Check if there's already an active dispute for this agreement
      const existingDispute = await queryRunner.manager.findOne(Dispute, {
        where: {
          agreementId: parseInt(createDisputeDto.agreementId),
          status: In([DisputeStatus.OPEN, DisputeStatus.UNDER_REVIEW]),
        },
      });

      if (existingDispute) {
        throw new BadRequestException(
          'There is already an active dispute for this agreement',
        );
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
      } as any);

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
    userId?: string,
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
        'agreement.landlord',
        'agreement.tenant',
        'initiator',
        'resolver',
        'evidence',
        'evidence.uploader',
        'comments',
        'comments.user',
      ],
    });

    if (!dispute) {
      throw new NotFoundException('Dispute not found');
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
        'agreement.landlord',
        'agreement.tenant',
        'initiator',
        'resolver',
        'evidence',
        'evidence.uploader',
        'comments',
        'comments.user',
      ],
    });

    if (!dispute) {
      throw new NotFoundException('Dispute not found');
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

    // Check permissions
    await this.checkDisputePermission(dispute, userId, 'update');

    // Validate status transitions
    if (
      updateDisputeDto.status &&
      !this.isValidStatusTransition(dispute.status, updateDisputeDto.status)
    ) {
      throw new BadRequestException(
        `Invalid status transition from ${dispute.status} to ${updateDisputeDto.status}`,
      );
    }

    Object.assign(dispute, updateDisputeDto);
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

    // Validate file
    this.validateFile(file);

    // Create evidence record
    const evidence = this.evidenceRepository.create({
      dispute: dispute,
      uploadedBy: parseInt(userId),
      fileUrl: file.path, // This would be replaced with actual file storage URL
      fileName: file.originalname,
      fileType: file.mimetype,
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
      throw new ForbiddenException('Only admins can add internal comments');
    }

    const comment = this.commentRepository.create({
      dispute: dispute,
      userId: parseInt(userId),
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
  async resolveDispute(
    disputeId: string,
    resolveDisputeDto: ResolveDisputeDto,
    userId: string,
  ): Promise<Dispute> {
    const dispute = await this.findByDisputeId(disputeId);

    // Only admins can resolve disputes
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (user?.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only admins can resolve disputes');
    }

    if (dispute.status !== DisputeStatus.UNDER_REVIEW) {
      throw new BadRequestException(
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
        resolvedBy: parseInt(userId),
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
      throw new NotFoundException('Rent agreement not found');
    }

    if (userId) {
      const user = await this.userRepository.findOne({ where: { id: userId } });
      const isLandlord = agreement.landlordId === user?.id;
      const isTenant = agreement.tenantId === user?.id;
      const isAdmin = user?.role === UserRole.ADMIN;

      if (!isLandlord && !isTenant && !isAdmin) {
        throw new ForbiddenException(
          'You can only view disputes for agreements you are party to',
        );
      }
    }

    return this.disputeRepository.find({
      where: { agreementId: parseInt(agreementId) },
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
      throw new NotFoundException('User not found');
    }

    const isInitiator = dispute.initiatedBy.toString() === userId;
    const isLandlord = dispute.agreement.landlordId?.toString() === userId;
    const isTenant = dispute.agreement.tenantId?.toString() === userId;
    const isAdmin = user.role === UserRole.ADMIN;

    if (!isAdmin && !isInitiator && !isLandlord && !isTenant) {
      throw new ForbiddenException(
        'You do not have permission to perform this action on this dispute',
      );
    }

    // Additional restrictions based on action
    if (
      action === 'update' &&
      !isAdmin &&
      dispute.status !== DisputeStatus.OPEN
    ) {
      throw new ForbiddenException(
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
  private validateFile(file: any): void {
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/pdf',
      'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];

    const maxSize = 10 * 1024 * 1024; // 10MB

    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        'Invalid file type. Only images, PDFs, and documents are allowed',
      );
    }

    if (file.size > maxSize) {
      throw new BadRequestException(
        'File size too large. Maximum size is 10MB',
      );
    }
  }
}
