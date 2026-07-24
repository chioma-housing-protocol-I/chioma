import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { DisputesService } from '../disputes.service';
import {
  Dispute,
  DisputeStatus,
  DisputeType,
} from '../entities/dispute.entity';
import { DisputeEvidence } from '../entities/dispute-evidence.entity';
import { DisputeComment } from '../entities/dispute-comment.entity';
import { RentAgreement } from '../../rent/entities/rent-contract.entity';
import { User } from '../../users/entities/user.entity';
import { AuditService } from '../../audit/audit.service';
import { LockService } from '../../../common/lock';
import { IdempotencyService } from '../../../common/idempotency';

describe('DisputesService – Pagination', () => {
  let service: DisputesService;

  function makeQb(data: any[], total: number) {
    return {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([data, total]),
    };
  }

  const mockDisputeRepo = { createQueryBuilder: jest.fn() };
  const mockEvidenceRepo = {};
  const mockCommentRepo = {};
  const mockAgreementRepo = {};
  const mockUserRepo = {};
  const mockAuditService = { log: jest.fn(), logSuccess: jest.fn() };
  const mockDataSource = {
    createQueryRunner: jest.fn().mockReturnValue({
      connect: jest.fn(),
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
      manager: { save: jest.fn(), findOne: jest.fn() },
    }),
  };
  const mockLockService = { acquire: jest.fn().mockResolvedValue(jest.fn()) };
  const mockIdempotencyService = {
    check: jest.fn().mockResolvedValue(null),
    store: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DisputesService,
        { provide: getRepositoryToken(Dispute), useValue: mockDisputeRepo },
        {
          provide: getRepositoryToken(DisputeEvidence),
          useValue: mockEvidenceRepo,
        },
        {
          provide: getRepositoryToken(DisputeComment),
          useValue: mockCommentRepo,
        },
        {
          provide: getRepositoryToken(RentAgreement),
          useValue: mockAgreementRepo,
        },
        { provide: getRepositoryToken(User), useValue: mockUserRepo },
        { provide: AuditService, useValue: mockAuditService },
        { provide: DataSource, useValue: mockDataSource },
        { provide: LockService, useValue: mockLockService },
        { provide: IdempotencyService, useValue: mockIdempotencyService },
      ],
    }).compile();
    service = module.get<DisputesService>(DisputesService);
  });

  describe('offset pagination', () => {
    it('returns disputes with total on page 1', async () => {
      const qb = makeQb([{ id: 1 }, { id: 2 }], 15);
      mockDisputeRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findAll({ page: 1, limit: 5 });

      expect(result.disputes).toHaveLength(2);
      expect(result.total).toBe(15);
    });

    it('applies correct skip for page 2', async () => {
      const qb = makeQb([], 30);
      mockDisputeRepo.createQueryBuilder.mockReturnValue(qb);

      await service.findAll({ page: 2, limit: 10 });

      expect(qb.skip).toHaveBeenCalledWith(10);
      expect(qb.take).toHaveBeenCalledWith(10);
    });

    it('applies correct skip for page 4 with limit 5', async () => {
      const qb = makeQb([], 50);
      mockDisputeRepo.createQueryBuilder.mockReturnValue(qb);

      await service.findAll({ page: 4, limit: 5 });

      expect(qb.skip).toHaveBeenCalledWith(15);
      expect(qb.take).toHaveBeenCalledWith(5);
    });

    it('returns empty disputes when none match', async () => {
      const qb = makeQb([], 0);
      mockDisputeRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result.disputes).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('uses default page=1 and limit=10', async () => {
      const qb = makeQb([], 0);
      mockDisputeRepo.createQueryBuilder.mockReturnValue(qb);

      await service.findAll({});

      expect(qb.skip).toHaveBeenCalledWith(0);
      expect(qb.take).toHaveBeenCalledWith(10);
    });
  });

  describe('filtering', () => {
    it('filters by status', async () => {
      const qb = makeQb([], 0);
      mockDisputeRepo.createQueryBuilder.mockReturnValue(qb);

      await service.findAll({ status: DisputeStatus.OPEN });

      expect(qb.andWhere).toHaveBeenCalledWith('dispute.status = :status', {
        status: DisputeStatus.OPEN,
      });
    });

    it('filters by disputeType', async () => {
      const qb = makeQb([], 0);
      mockDisputeRepo.createQueryBuilder.mockReturnValue(qb);

      await service.findAll({ disputeType: DisputeType.SECURITY_DEPOSIT });

      expect(qb.andWhere).toHaveBeenCalledWith(
        'dispute.disputeType = :disputeType',
        { disputeType: DisputeType.SECURITY_DEPOSIT },
      );
    });

    it('filters by agreementId', async () => {
      const qb = makeQb([], 0);
      mockDisputeRepo.createQueryBuilder.mockReturnValue(qb);

      await service.findAll({ agreementId: 'agr-uuid' });

      expect(qb.andWhere).toHaveBeenCalledWith(
        'dispute.agreementId = :agreementId',
        { agreementId: 'agr-uuid' },
      );
    });

    it('filters by initiatedBy', async () => {
      const qb = makeQb([], 0);
      mockDisputeRepo.createQueryBuilder.mockReturnValue(qb);

      await service.findAll({ initiatedBy: 'user-uuid' });

      expect(qb.andWhere).toHaveBeenCalledWith(
        'dispute.initiatedBy = :initiatedBy',
        { initiatedBy: 'user-uuid' },
      );
    });

    it('filters by disputeIds array (IN clause)', async () => {
      const qb = makeQb([], 0);
      mockDisputeRepo.createQueryBuilder.mockReturnValue(qb);

      await service.findAll({ disputeIds: ['uuid-1', 'uuid-2'] });

      expect(qb.andWhere).toHaveBeenCalledWith(
        'dispute.disputeId IN (:...disputeIds)',
        { disputeIds: ['uuid-1', 'uuid-2'] },
      );
    });

    it('combines status + agreementId filters', async () => {
      const qb = makeQb([], 0);
      mockDisputeRepo.createQueryBuilder.mockReturnValue(qb);

      await service.findAll({
        status: DisputeStatus.RESOLVED,
        agreementId: 'agr-1',
      });

      expect(qb.andWhere).toHaveBeenCalledTimes(2);
    });
  });

  describe('sorting', () => {
    it('sorts by createdAt DESC by default', async () => {
      const qb = makeQb([], 0);
      mockDisputeRepo.createQueryBuilder.mockReturnValue(qb);

      await service.findAll({ sortBy: 'createdAt', sortOrder: 'DESC' });

      expect(qb.orderBy).toHaveBeenCalledWith('dispute.createdAt', 'DESC');
    });

    it('sorts by status ASC', async () => {
      const qb = makeQb([], 0);
      mockDisputeRepo.createQueryBuilder.mockReturnValue(qb);

      await service.findAll({ sortBy: 'status', sortOrder: 'ASC' });

      expect(qb.orderBy).toHaveBeenCalledWith('dispute.status', 'ASC');
    });

    it('falls back to createdAt for unknown sort field', async () => {
      const qb = makeQb([], 0);
      mockDisputeRepo.createQueryBuilder.mockReturnValue(qb);

      await service.findAll({ sortBy: 'unknownField', sortOrder: 'DESC' });

      expect(qb.orderBy).toHaveBeenCalledWith('dispute.createdAt', 'DESC');
    });
  });

  describe('edge cases', () => {
    it('does not apply disputeIds filter for empty array', async () => {
      const qb = makeQb([], 0);
      mockDisputeRepo.createQueryBuilder.mockReturnValue(qb);

      await service.findAll({ disputeIds: [] });

      const inCalls = (qb.andWhere.mock.calls as any[][]).filter(([sql]) =>
        String(sql).includes('IN'),
      );
      expect(inCalls).toHaveLength(0);
    });

    it('executes only one DB query per findAll call', async () => {
      const qb = makeQb([], 0);
      mockDisputeRepo.createQueryBuilder.mockReturnValue(qb);

      await service.findAll({ page: 1, limit: 10 });

      expect(qb.getManyAndCount).toHaveBeenCalledTimes(1);
    });
  });
});
