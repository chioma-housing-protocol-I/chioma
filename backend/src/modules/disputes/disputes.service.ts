import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { Dispute, DisputeStatus, DisputeType } from './entities/dispute.entity';
import { DisputeEvidence } from './entities/dispute-evidence.entity';
import { DisputeComment } from './entities/dispute-comment.entity';
import { RentAgreement, AgreementStatus } from '../rent/entities/rent-contract.entity';
import { CreateDisputeDto } from './dto/create-dispute.dto';
import { UpdateDisputeDto } from './dto/update-dispute.dto';
import { AddEvidenceDto } from './dto/add-evidence.dto';
import { ResolveDisputeDto } from './dto/resolve-dispute.dto';
import { AddCommentDto } from './dto/add-comment.dto';
import { QueryDisputesDto } from './dto/query-disputes.dto';
import { FileService } from './services/file.service';
import { NotificationService } from './services/notification.service';
import { AgreementsService } from '../agreements/agreements.service';

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
    private readonly fileService: FileService,
    private readonly notificationService: NotificationService,
    private readonly agreementsService: AgreementsService,
  ) {}

  /**
   * Create a new dispute
   */
  async createDispute(dto: CreateDisputeDto, userId: string): Promise<Dispute> {
    // Validate agreement exists and is active
    const agreement = await this.agreementRepository.findOne({
      where: { id: dto.agreementId },
    });

    if (!agreement) {
      throw new NotFoundException(`Agreement with ID ${dto.agreementId} not found`);
    }

    if (agreement.status === AgreementStatus.TERMINATED) {
      throw new BadRequestException('Cannot create dispute for a terminated agreement');
    }

    // Verify user has permission to create dispute (must be landlord or tenant)
    if (agreement.landlordId !== userId && agreement.tenantId !== userId) {
      throw new ForbiddenException(
        'You do not have permission to create a dispute for this agreement',
      );
    }

    // Generate unique dispute ID
    const disputeId = randomUUID();

    // Create dispute
    const dispute = this.disputeRepository.create({
      disputeId,
      agreementId: dto.agreementId,
      initiatedById: userId,
      disputeType: dto.disputeType,
      requestedAmount: dto.requestedAmount,
      description: dto.description,
      status: DisputeStatus.OPEN,
      metadata: {},
    });

    const savedDispute = await this.disputeRepository.save(dispute);

    // Update agreement status to DISPUTED if not already
    if (agreement.status !== AgreementStatus.DISPUTED) {
      agreement.status = AgreementStatus.DISPUTED;
      await this.agreementRepository.save(agreement);
    }

    // Notify all parties
    const notifyUserIds = [agreement.landlordId, agreement.tenantId]
      .filter((id): id is string => id !== undefined && id !== userId);
    await this.notificationService.notifyDisputeCreated(savedDispute.id, notifyUserIds);

    return savedDispute;
  }

  /**
   * Find all disputes with filtering, pagination, and sorting
   */
  async findAll(
    query: QueryDisputesDto,
    userId?: string,
  ): Promise<{ data: Dispute[]; total: number; page: number; limit: number }> {
    const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'DESC', ...filters } =
      query;

    const queryBuilder = this.disputeRepository
      .createQueryBuilder('dispute')
      .leftJoinAndSelect('dispute.agreement', 'agreement')
      .leftJoinAndSelect('dispute.initiatedBy', 'initiatedBy')
      .leftJoinAndSelect('dispute.evidence', 'evidence')
      .leftJoinAndSelect('dispute.comments', 'comments');

    // Apply filters
    if (filters.agreementId) {
      queryBuilder.andWhere('dispute.agreementId = :agreementId', {
        agreementId: filters.agreementId,
      });
    }

    if (filters.initiatedBy) {
      queryBuilder.andWhere('dispute.initiatedById = :initiatedBy', {
        initiatedBy: filters.initiatedBy,
      });
    }

    if (filters.status) {
      queryBuilder.andWhere('dispute.status = :status', { status: filters.status });
    }

    if (filters.disputeType) {
      queryBuilder.andWhere('dispute.disputeType = :disputeType', {
        disputeType: filters.disputeType,
      });
    }

    // If userId is provided, filter to show only disputes where user is involved
    if (userId) {
      queryBuilder.andWhere(
        '(dispute.initiatedById = :userId OR agreement.landlordId = :userId OR agreement.tenantId = :userId)',
        { userId },
      );
    }

    // Apply sorting
    const validSortFields = ['createdAt', 'updatedAt', 'status', 'disputeType'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
    queryBuilder.orderBy(`dispute.${sortField}`, sortOrder);

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
   * Find one dispute by ID
   */
  async findOne(id: string, userId?: string): Promise<Dispute> {
    const dispute = await this.disputeRepository.findOne({
      where: { id },
      relations: ['agreement', 'initiatedBy', 'resolvedBy', 'evidence', 'comments'],
    });

    if (!dispute) {
      throw new NotFoundException(`Dispute with ID ${id} not found`);
    }

    // Check if user has permission to view this dispute
    if (userId) {
      const agreement = await this.agreementRepository.findOne({
        where: { id: dispute.agreementId },
      });

      if (
        dispute.initiatedById !== userId &&
        agreement?.landlordId !== userId &&
        agreement?.tenantId !== userId
      ) {
        throw new ForbiddenException('You do not have permission to view this dispute');
      }
    }

    return dispute;
  }

  /**
   * Update a dispute
   */
  async update(id: string, dto: UpdateDisputeDto, userId: string): Promise<Dispute> {
    const dispute = await this.findOne(id, userId);

    // Only allow updates if dispute is OPEN
    if (dispute.status !== DisputeStatus.OPEN) {
      throw new BadRequestException('Can only update disputes with OPEN status');
    }

    // Only the initiator can update
    if (dispute.initiatedById !== userId) {
      throw new ForbiddenException('Only the dispute initiator can update the dispute');
    }

    // Update fields
    if (dto.disputeType !== undefined) dispute.disputeType = dto.disputeType;
    if (dto.requestedAmount !== undefined) dispute.requestedAmount = dto.requestedAmount;
    if (dto.description !== undefined) dispute.description = dto.description;
    if (dto.status !== undefined) dispute.status = dto.status;

    const updatedDispute = await this.disputeRepository.save(dispute);

    // Notify status change if status was updated
    if (dto.status && dto.status !== DisputeStatus.OPEN) {
      const agreement = await this.agreementRepository.findOne({
        where: { id: dispute.agreementId },
      });
      const notifyUserIds = [agreement?.landlordId, agreement?.tenantId]
        .filter((id): id is string => id !== undefined && id !== userId);
      await this.notificationService.notifyDisputeStatusChanged(
        updatedDispute.id,
        notifyUserIds,
        dto.status,
      );
    }

    return updatedDispute;
  }

  /**
   * Add evidence to a dispute
   */
  async addEvidence(
    disputeId: string,
    file: Express.Multer.File,
    userId: string,
    dto: AddEvidenceDto,
  ): Promise<DisputeEvidence> {
    const dispute = await this.findOne(disputeId, userId);

    // Verify user has permission (must be involved in the dispute)
    const agreement = await this.agreementRepository.findOne({
      where: { id: dispute.agreementId },
    });

    if (
      dispute.initiatedById !== userId &&
      agreement?.landlordId !== userId &&
      agreement?.tenantId !== userId
    ) {
      throw new ForbiddenException('You do not have permission to add evidence to this dispute');
    }

    // Save file
    const fileUrl = await this.fileService.saveFile(file, disputeId);

    // Create evidence record
    const evidence = this.evidenceRepository.create({
      disputeId: dispute.id,
      uploadedById: userId,
      fileUrl,
      fileName: dto.fileName,
      fileType: dto.fileType,
      fileSize: dto.fileSize,
      description: dto.description,
    });

    const savedEvidence = await this.evidenceRepository.save(evidence);

    // Notify other parties
    const notifyUserIds = [agreement?.landlordId, agreement?.tenantId]
      .filter((id): id is string => id !== undefined && id !== userId);
    await this.notificationService.notifyEvidenceAdded(dispute.id, notifyUserIds);

    return savedEvidence;
  }

  /**
   * Resolve a dispute
   */
  async resolveDispute(
    disputeId: string,
    dto: ResolveDisputeDto,
    userId: string,
  ): Promise<Dispute> {
    const dispute = await this.findOne(disputeId);

    // Only allow resolution if dispute is OPEN or UNDER_REVIEW
    if (dispute.status !== DisputeStatus.OPEN && dispute.status !== DisputeStatus.UNDER_REVIEW) {
      throw new BadRequestException(
        'Can only resolve disputes with OPEN or UNDER_REVIEW status',
      );
    }

    // Update dispute
    dispute.status = DisputeStatus.RESOLVED;
    dispute.resolution = dto.resolution;
    dispute.resolvedById = userId;
    dispute.resolvedAt = new Date();

    if (dto.refundAmount !== undefined) {
      dispute.metadata = {
        ...dispute.metadata,
        refundAmount: dto.refundAmount,
      };
    }

    const resolvedDispute = await this.disputeRepository.save(dispute);

    // Update agreement status if needed
    const agreement = await this.agreementRepository.findOne({
      where: { id: dispute.agreementId },
    });

    if (agreement && agreement.status === AgreementStatus.DISPUTED) {
      // Check if there are other open disputes
      const openDisputes = await this.disputeRepository.count({
        where: {
          agreementId: agreement.id,
          status: DisputeStatus.OPEN,
        },
      });

      if (openDisputes === 0) {
        // Restore agreement to previous status (or ACTIVE)
        agreement.status = AgreementStatus.ACTIVE;
        await this.agreementRepository.save(agreement);
      }
    }

    // Notify all parties
    const notifyUserIds = [agreement?.landlordId, agreement?.tenantId]
      .filter((id): id is string => id !== undefined && id !== userId);
    await this.notificationService.notifyDisputeResolved(resolvedDispute.id, notifyUserIds);

    return resolvedDispute;
  }

  /**
   * Add a comment to a dispute
   */
  async addComment(
    disputeId: string,
    dto: AddCommentDto,
    userId: string,
  ): Promise<DisputeComment> {
    const dispute = await this.findOne(disputeId, userId);

    // Verify user has permission
    const agreement = await this.agreementRepository.findOne({
      where: { id: dispute.agreementId },
    });

    if (
      dispute.initiatedById !== userId &&
      agreement?.landlordId !== userId &&
      agreement?.tenantId !== userId
    ) {
      throw new ForbiddenException('You do not have permission to comment on this dispute');
    }

    // Create comment
    const comment = this.commentRepository.create({
      disputeId: dispute.id,
      userId,
      content: dto.content,
      isInternal: dto.isInternal || false,
    });

    const savedComment = await this.commentRepository.save(comment);

    // Notify other parties (only if not internal)
    if (!dto.isInternal) {
      const notifyUserIds = [agreement?.landlordId, agreement?.tenantId]
        .filter((id): id is string => id !== undefined && id !== userId);
      await this.notificationService.notifyCommentAdded(dispute.id, notifyUserIds);
    }

    return savedComment;
  }

  /**
   * Get disputes for a specific agreement
   */
  async getDisputesByAgreement(agreementId: string): Promise<Dispute[]> {
    // Verify agreement exists
    await this.agreementsService.findOne(agreementId);

    return await this.disputeRepository.find({
      where: { agreementId },
      relations: ['initiatedBy', 'evidence', 'comments'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Withdraw a dispute
   */
  async withdrawDispute(disputeId: string, userId: string): Promise<Dispute> {
    const dispute = await this.findOne(disputeId, userId);

    // Only initiator can withdraw
    if (dispute.initiatedById !== userId) {
      throw new ForbiddenException('Only the dispute initiator can withdraw the dispute');
    }

    // Only allow withdrawal if dispute is OPEN
    if (dispute.status !== DisputeStatus.OPEN) {
      throw new BadRequestException('Can only withdraw disputes with OPEN status');
    }

    dispute.status = DisputeStatus.WITHDRAWN;
    const updatedDispute = await this.disputeRepository.save(dispute);

    // Update agreement status if needed
    const agreement = await this.agreementRepository.findOne({
      where: { id: dispute.agreementId },
    });

    if (agreement && agreement.status === AgreementStatus.DISPUTED) {
      const openDisputes = await this.disputeRepository.count({
        where: {
          agreementId: agreement.id,
          status: DisputeStatus.OPEN,
        },
      });

      if (openDisputes === 0) {
        agreement.status = AgreementStatus.ACTIVE;
        await this.agreementRepository.save(agreement);
      }
    }

    return updatedDispute;
  }
}
