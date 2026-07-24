import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AuditService } from '../audit.service';
import {
  AuditLog,
  AuditAction,
  AuditLevel,
  AuditStatus,
} from '../entities/audit-log.entity';

describe('AuditService – Pagination', () => {
  let service: AuditService;
  let mockQb: any;

  function makeQb(data: any[], total: number) {
    return {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([data, total]),
    };
  }

  const mockRepo = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditService,
        { provide: getRepositoryToken(AuditLog), useValue: mockRepo },
      ],
    }).compile();
    service = module.get<AuditService>(AuditService);
  });

  describe('offset pagination', () => {
    it('returns page 1 with correct structure', async () => {
      mockQb = makeQb([{ id: 1 }, { id: 2 }], 50);
      mockRepo.createQueryBuilder.mockReturnValue(mockQb);

      const result = await service.query({ page: 1, limit: 10 });

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(50);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.totalPages).toBe(5);
    });

    it('applies correct skip for page 2', async () => {
      mockQb = makeQb([], 100);
      mockRepo.createQueryBuilder.mockReturnValue(mockQb);

      await service.query({ page: 2, limit: 10 });

      expect(mockQb.skip).toHaveBeenCalledWith(10);
      expect(mockQb.take).toHaveBeenCalledWith(10);
    });

    it('applies correct skip for page 5 with limit 20', async () => {
      mockQb = makeQb([], 200);
      mockRepo.createQueryBuilder.mockReturnValue(mockQb);

      await service.query({ page: 5, limit: 20 });

      expect(mockQb.skip).toHaveBeenCalledWith(80);
      expect(mockQb.take).toHaveBeenCalledWith(20);
    });

    it('caps limit at 100', async () => {
      mockQb = makeQb([], 0);
      mockRepo.createQueryBuilder.mockReturnValue(mockQb);

      await service.query({ page: 1, limit: 200 });

      expect(mockQb.take).toHaveBeenCalledWith(100);
    });

    it('returns empty data with total=0', async () => {
      mockQb = makeQb([], 0);
      mockRepo.createQueryBuilder.mockReturnValue(mockQb);

      const result = await service.query({ page: 1, limit: 10 });

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.totalPages).toBe(0);
    });
  });

  describe('filtering', () => {
    it('filters by action', async () => {
      mockQb = makeQb([], 0);
      mockRepo.createQueryBuilder.mockReturnValue(mockQb);

      await service.query({ action: AuditAction.CREATE });

      expect(mockQb.andWhere).toHaveBeenCalledWith(
        'audit_log.action = :action',
        { action: AuditAction.CREATE },
      );
    });

    it('filters by level', async () => {
      mockQb = makeQb([], 0);
      mockRepo.createQueryBuilder.mockReturnValue(mockQb);

      await service.query({ level: AuditLevel.SECURITY });

      expect(mockQb.andWhere).toHaveBeenCalledWith('audit_log.level = :level', {
        level: AuditLevel.SECURITY,
      });
    });

    it('filters by status', async () => {
      mockQb = makeQb([], 0);
      mockRepo.createQueryBuilder.mockReturnValue(mockQb);

      await service.query({ status: AuditStatus.FAILURE });

      expect(mockQb.andWhere).toHaveBeenCalledWith(
        'audit_log.status = :status',
        { status: AuditStatus.FAILURE },
      );
    });

    it('filters by performedBy', async () => {
      mockQb = makeQb([], 0);
      mockRepo.createQueryBuilder.mockReturnValue(mockQb);

      await service.query({ performedBy: 'user-uuid' });

      expect(mockQb.andWhere).toHaveBeenCalledWith(
        'audit_log.performed_by = :performedBy',
        { performedBy: 'user-uuid' },
      );
    });

    it('filters by entityType and entityId', async () => {
      mockQb = makeQb([], 0);
      mockRepo.createQueryBuilder.mockReturnValue(mockQb);

      await service.query({ entityType: 'Property', entityId: 'prop-1' });

      expect(mockQb.andWhere).toHaveBeenCalledWith(
        'audit_log.entity_type = :entityType',
        { entityType: 'Property' },
      );
      expect(mockQb.andWhere).toHaveBeenCalledWith(
        'audit_log.entity_id = :entityId',
        { entityId: 'prop-1' },
      );
    });

    it('applies full-text search', async () => {
      mockQb = makeQb([], 0);
      mockRepo.createQueryBuilder.mockReturnValue(mockQb);

      await service.query({ search: 'payment' });

      expect(mockQb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('ILIKE'),
        { search: '%payment%' },
      );
    });

    it('filters by date range', async () => {
      mockQb = makeQb([], 0);
      mockRepo.createQueryBuilder.mockReturnValue(mockQb);

      await service.query({ startDate: '2024-01-01', endDate: '2024-12-31' });

      expect(mockQb.andWhere).toHaveBeenCalledWith(
        'audit_log.performed_at >= :startDate',
        expect.any(Object),
      );
      expect(mockQb.andWhere).toHaveBeenCalledWith(
        'audit_log.performed_at <= :endDate',
        expect.any(Object),
      );
    });

    it('combines multiple filters', async () => {
      mockQb = makeQb([], 0);
      mockRepo.createQueryBuilder.mockReturnValue(mockQb);

      await service.query({
        action: AuditAction.LOGIN,
        level: AuditLevel.SECURITY,
        status: AuditStatus.FAILURE,
        performedBy: 'user-1',
      });

      expect(mockQb.andWhere).toHaveBeenCalledTimes(4);
    });
  });

  describe('sorting', () => {
    it('always orders by performed_at DESC', async () => {
      mockQb = makeQb([], 0);
      mockRepo.createQueryBuilder.mockReturnValue(mockQb);

      await service.query({ page: 1, limit: 10 });

      expect(mockQb.orderBy).toHaveBeenCalledWith(
        'audit_log.performed_at',
        'DESC',
      );
    });
  });

  describe('getAuditTrail', () => {
    it('returns audit trail ordered by performed_at DESC', async () => {
      mockRepo.find.mockResolvedValue([{ id: 1 }, { id: 2 }]);

      const result = await service.getAuditTrail('User', 'user-1', 50);

      expect(mockRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          order: { performed_at: 'DESC' },
          take: 50,
        }),
      );
      expect(result).toHaveLength(2);
    });

    it('uses default limit of 100', async () => {
      mockRepo.find.mockResolvedValue([]);

      await service.getAuditTrail('Property', 'prop-1');

      expect(mockRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ take: 100 }),
      );
    });
  });
});
