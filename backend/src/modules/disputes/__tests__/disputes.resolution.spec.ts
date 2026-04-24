import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { DisputesService } from '../disputes.service';
import {
  Dispute,
  DisputeStatus,
  DisputeType,
} from '../entities/dispute.entity';
import { DisputeEvidence } from '../entities/dispute-evidence.entity';
import { DisputeComment } from '../entities/dispute-comment.entity';
import {
  RentAgreement,
  AgreementStatus,
} from '../../rent/entities/rent-contract.entity';
import { User, UserRole } from '../../users/entities/user.entity';
import { AuditService } from '../../audit/audit.service';
import { LockService } from '../../../common/lock';
import { IdempotencyService } from '../../../common/idempotency';
import { ResolveDisputeDto } from '../dto/resolve-dispute.dto';
import { AddCommentDto } from '../dto/add-comment.dto';

describe('DisputesService — resolution, evidence, comments, agreements', () => {
  let service: DisputesService;

  const adminUser: User = {
    id: 'admin-1',
    email: 'admin@example.com',
    firstName: 'Admin',
    lastName: 'User',
    role: UserRole.ADMIN,
    isActive: true,
  } as User;

  const regularUser: User = {
    id: 'user-1',
    email: 'user@example.com',
    firstName: 'John',
    lastName: 'Doe',
    role: UserRole.USER,
    isActive: true,
  } as User;

  const mockAgreement: any = {
    id: '1',
    agreementNumber: 'AGR-001',
    adminId: 'landlord-1',
    userId: 'user-1',
    status: AgreementStatus.DISPUTED,
  };

  const openDispute: Dispute = {
    id: 1,
    disputeId: 'dispute-uuid-1',
    agreementId: 1,
    initiatedBy: 1,
    disputeType: DisputeType.RENT_PAYMENT,
    requestedAmount: 500,
    description: 'Test dispute',
    status: DisputeStatus.OPEN,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Dispute;

  const underReviewDispute: Dispute = {
    ...openDispute,
    status: DisputeStatus.UNDER_REVIEW,
    agreement: mockAgreement,
  } as Dispute;

  const resolvedDispute: Dispute = {
    ...openDispute,
    status: DisputeStatus.RESOLVED,
  } as Dispute;

  const mockDisputeRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    createQueryBuilder: jest.fn(),
    update: jest.fn(),
  };

  const mockEvidenceRepository = {
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockCommentRepository = {
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockAgreementRepository = {
    findOne: jest.fn(),
    update: jest.fn(),
  };

  const mockUserRepository = {
    findOne: jest.fn(),
  };

  const mockQueryRunner = {
    connect: jest.fn(),
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(),
    release: jest.fn(),
    manager: {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockDataSource = {
    createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DisputesService,
        { provide: getRepositoryToken(Dispute), useValue: mockDisputeRepository },
        { provide: getRepositoryToken(DisputeEvidence), useValue: mockEvidenceRepository },
        { provide: getRepositoryToken(DisputeComment), useValue: mockCommentRepository },
        { provide: getRepositoryToken(RentAgreement), useValue: mockAgreementRepository },
        { provide: getRepositoryToken(User), useValue: mockUserRepository },
        { provide: DataSource, useValue: mockDataSource },
        { provide: AuditService, useValue: { log: jest.fn() } },
        {
          provide: LockService,
          useValue: {
            withLock: jest.fn(async (_k: string, _t: number, fn: () => Promise<unknown>) => fn()),
          },
        },
        {
          provide: IdempotencyService,
          useValue: {
            process: jest.fn(async (_k: string, _t: number, fn: () => Promise<unknown>) => fn()),
          },
        },
      ],
    }).compile();

    service = module.get<DisputesService>(DisputesService);
    jest.clearAllMocks();
    // Reset shared query runner mocks
    mockQueryRunner.manager.findOne.mockReset();
    mockQueryRunner.manager.create.mockReset();
    mockQueryRunner.manager.save.mockReset();
    mockQueryRunner.manager.update.mockReset();
    mockQueryRunner.connect.mockReset();
    mockQueryRunner.startTransaction.mockReset();
    mockQueryRunner.commitTransaction.mockReset();
    mockQueryRunner.rollbackTransaction.mockReset();
    mockQueryRunner.release.mockReset();
  });

  // ── resolveDispute ──────────────────────────────────────────────────────────

  describe('resolveDispute', () => {
    const resolveDto: ResolveDisputeDto = { resolution: 'Dispute resolved in favour of tenant' };

    it('throws ForbiddenException when a non-admin tries to resolve', async () => {
      jest.spyOn(service, 'findByDisputeId').mockResolvedValue(underReviewDispute);
      mockUserRepository.findOne.mockResolvedValue(regularUser);

      await expect(
        service.resolveDispute('dispute-uuid-1', resolveDto, 'user-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws BadRequestException when dispute is OPEN (not UNDER_REVIEW)', async () => {
      jest.spyOn(service, 'findByDisputeId').mockResolvedValue(openDispute);
      mockUserRepository.findOne.mockResolvedValue(adminUser);

      await expect(
        service.resolveDispute('dispute-uuid-1', resolveDto, 'admin-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when dispute is already RESOLVED', async () => {
      jest.spyOn(service, 'findByDisputeId').mockResolvedValue(resolvedDispute);
      mockUserRepository.findOne.mockResolvedValue(adminUser);

      await expect(
        service.resolveDispute('dispute-uuid-1', resolveDto, 'admin-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('resolves an UNDER_REVIEW dispute and returns updated record', async () => {
      jest
        .spyOn(service, 'findByDisputeId')
        .mockResolvedValueOnce(underReviewDispute)
        .mockResolvedValueOnce({ ...underReviewDispute, status: DisputeStatus.RESOLVED });

      mockUserRepository.findOne.mockResolvedValue(adminUser);
      mockQueryRunner.manager.update.mockResolvedValue(undefined);
      mockQueryRunner.manager.findOne.mockResolvedValue(mockAgreement);

      const result = await service.resolveDispute('dispute-uuid-1', resolveDto, 'admin-1');

      expect(result.status).toBe(DisputeStatus.RESOLVED);
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    it('rolls back the transaction on unexpected error during resolution', async () => {
      jest.spyOn(service, 'findByDisputeId').mockResolvedValue(underReviewDispute);
      mockUserRepository.findOne.mockResolvedValue(adminUser);
      mockQueryRunner.manager.update.mockRejectedValue(new Error('DB failure'));

      await expect(
        service.resolveDispute('dispute-uuid-1', resolveDto, 'admin-1'),
      ).rejects.toThrow('DB failure');

      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    it('includes a refundAmount when provided in the DTO', async () => {
      const dtoWithRefund: ResolveDisputeDto = { resolution: 'Partial refund granted', refundAmount: 250 };
      jest
        .spyOn(service, 'findByDisputeId')
        .mockResolvedValueOnce(underReviewDispute)
        .mockResolvedValueOnce({ ...underReviewDispute, status: DisputeStatus.RESOLVED });

      mockUserRepository.findOne.mockResolvedValue(adminUser);
      mockQueryRunner.manager.update.mockResolvedValue(undefined);

      const result = await service.resolveDispute('dispute-uuid-1', dtoWithRefund, 'admin-1');
      expect(result.status).toBe(DisputeStatus.RESOLVED);
    });
  });

  // ── addEvidence ─────────────────────────────────────────────────────────────

  describe('addEvidence', () => {
    const mockFile = {
      path: '/tmp/evidence.pdf',
      originalname: 'evidence.pdf',
      mimetype: 'application/pdf',
      size: 102400,
    };

    const mockEvidence = {
      id: 10,
      fileUrl: '/tmp/evidence.pdf',
      fileName: 'evidence.pdf',
    };

    it('adds evidence to an open dispute', async () => {
      jest.spyOn(service, 'findByDisputeId').mockResolvedValue(openDispute);
      jest
        .spyOn(service as any, 'checkDisputePermission')
        .mockResolvedValue(undefined);
      jest.spyOn(service as any, 'validateFile').mockReturnValue(undefined);

      mockEvidenceRepository.create.mockReturnValue(mockEvidence);
      mockEvidenceRepository.save.mockResolvedValue(mockEvidence);

      const result = await service.addEvidence('dispute-uuid-1', mockFile, 'user-1');

      expect(result).toEqual(mockEvidence);
      expect(mockEvidenceRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          fileName: 'evidence.pdf',
          fileType: 'application/pdf',
        }),
      );
      expect(mockEvidenceRepository.save).toHaveBeenCalled();
    });

    it('includes the optional description when provided', async () => {
      jest.spyOn(service, 'findByDisputeId').mockResolvedValue(openDispute);
      jest.spyOn(service as any, 'checkDisputePermission').mockResolvedValue(undefined);
      jest.spyOn(service as any, 'validateFile').mockReturnValue(undefined);

      mockEvidenceRepository.create.mockReturnValue({ ...mockEvidence, description: 'Invoice copy' });
      mockEvidenceRepository.save.mockResolvedValue({ ...mockEvidence, description: 'Invoice copy' });

      const result = await service.addEvidence('dispute-uuid-1', mockFile, 'user-1', {
        fileName: 'evidence.pdf',
        fileType: 'application/pdf',
        description: 'Invoice copy',
      });

      expect(result.description).toBe('Invoice copy');
    });
  });

  // ── addComment ──────────────────────────────────────────────────────────────

  describe('addComment', () => {
    const publicCommentDto: AddCommentDto = { content: 'I have a question', isInternal: false };
    const internalCommentDto: AddCommentDto = { content: 'Internal note', isInternal: true };

    const mockComment = { id: 5, content: 'I have a question', isInternal: false };

    it('allows any party to add a public comment', async () => {
      jest.spyOn(service, 'findByDisputeId').mockResolvedValue(openDispute);
      jest.spyOn(service as any, 'checkDisputePermission').mockResolvedValue(undefined);
      mockUserRepository.findOne.mockResolvedValue(regularUser);
      mockCommentRepository.create.mockReturnValue(mockComment);
      mockCommentRepository.save.mockResolvedValue(mockComment);

      const result = await service.addComment('dispute-uuid-1', publicCommentDto, 'user-1');

      expect(result).toEqual(mockComment);
      expect(mockCommentRepository.save).toHaveBeenCalled();
    });

    it('allows admins to add internal comments', async () => {
      const internalComment = { id: 6, content: 'Internal note', isInternal: true };
      jest.spyOn(service, 'findByDisputeId').mockResolvedValue(openDispute);
      jest.spyOn(service as any, 'checkDisputePermission').mockResolvedValue(undefined);
      mockUserRepository.findOne.mockResolvedValue(adminUser);
      mockCommentRepository.create.mockReturnValue(internalComment);
      mockCommentRepository.save.mockResolvedValue(internalComment);

      const result = await service.addComment('dispute-uuid-1', internalCommentDto, 'admin-1');

      expect(result.isInternal).toBe(true);
    });

    it('throws ForbiddenException when a non-admin tries to add an internal comment', async () => {
      jest.spyOn(service, 'findByDisputeId').mockResolvedValue(openDispute);
      jest.spyOn(service as any, 'checkDisputePermission').mockResolvedValue(undefined);
      mockUserRepository.findOne.mockResolvedValue(regularUser);

      await expect(
        service.addComment('dispute-uuid-1', internalCommentDto, 'user-1'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ── getAgreementDisputes ────────────────────────────────────────────────────

  describe('getAgreementDisputes', () => {
    it('returns disputes for a valid agreement without userId', async () => {
      mockAgreementRepository.findOne.mockResolvedValue(mockAgreement);
      mockDisputeRepository.find.mockResolvedValue([openDispute]);

      const result = await service.getAgreementDisputes('1');

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe(DisputeStatus.OPEN);
    });

    it('throws NotFoundException when agreement does not exist', async () => {
      mockAgreementRepository.findOne.mockResolvedValue(null);

      await expect(service.getAgreementDisputes('999')).rejects.toThrow(NotFoundException);
    });

    it('allows the landlord (adminId) to view disputes', async () => {
      mockAgreementRepository.findOne.mockResolvedValue(mockAgreement);
      mockUserRepository.findOne.mockResolvedValue({ ...regularUser, id: 'landlord-1' });
      mockDisputeRepository.find.mockResolvedValue([openDispute]);

      const result = await service.getAgreementDisputes('1', 'landlord-1');
      expect(result).toHaveLength(1);
    });

    it('allows the tenant (userId) to view disputes', async () => {
      mockAgreementRepository.findOne.mockResolvedValue(mockAgreement);
      mockUserRepository.findOne.mockResolvedValue(regularUser); // id = 'user-1'
      mockDisputeRepository.find.mockResolvedValue([openDispute]);

      const result = await service.getAgreementDisputes('1', 'user-1');
      expect(result).toHaveLength(1);
    });

    it('throws ForbiddenException when user is not a party to the agreement', async () => {
      mockAgreementRepository.findOne.mockResolvedValue(mockAgreement);
      mockUserRepository.findOne.mockResolvedValue({ ...regularUser, id: 'stranger', role: UserRole.USER });

      await expect(service.getAgreementDisputes('1', 'stranger')).rejects.toThrow(ForbiddenException);
    });

    it('allows admin to view any agreement disputes', async () => {
      mockAgreementRepository.findOne.mockResolvedValue(mockAgreement);
      mockUserRepository.findOne.mockResolvedValue(adminUser);
      mockDisputeRepository.find.mockResolvedValue([openDispute, underReviewDispute]);

      const result = await service.getAgreementDisputes('1', 'admin-1');
      expect(result).toHaveLength(2);
    });

    it('returns empty array when agreement has no disputes', async () => {
      mockAgreementRepository.findOne.mockResolvedValue(mockAgreement);
      mockDisputeRepository.find.mockResolvedValue([]);

      const result = await service.getAgreementDisputes('1');
      expect(result).toHaveLength(0);
    });
  });

  // ── findOne edge cases ──────────────────────────────────────────────────────

  describe('findOne — additional edge cases', () => {
    it('throws NotFoundException for a non-existent numeric ID', async () => {
      mockDisputeRepository.findOne.mockResolvedValue(null);
      await expect(service.findOne(9999)).rejects.toThrow(NotFoundException);
    });
  });

  // ── findByDisputeId edge cases ──────────────────────────────────────────────

  describe('findByDisputeId — additional edge cases', () => {
    it('throws NotFoundException for a non-existent UUID', async () => {
      mockDisputeRepository.findOne.mockResolvedValue(null);
      await expect(service.findByDisputeId('no-such-uuid')).rejects.toThrow(NotFoundException);
    });
  });
});
