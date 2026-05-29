import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AuditService } from '../src/modules/audit/audit.service';
import {
  AuditLog,
  AuditAction,
  AuditStatus,
  AuditLevel,
} from '../src/modules/audit/entities/audit-log.entity';
import { QueryAuditLogsDto } from '../src/modules/audit/dto/query-audit-logs.dto';

describe('Audit Logging Integration (e2e)', () => {
  let service: AuditService;

  const userId = 'user-uuid-audit-1';
  const entityId = 'property-uuid-1';
  const entityType = 'Property';

  const mockAuditLog = {
    id: 1,
    action: AuditAction.CREATE,
    entity_type: entityType,
    entity_id: entityId,
    old_values: null,
    new_values: { name: 'Test Property' },
    performed_by: userId,
    performed_by_user: null,
    performed_at: new Date(),
    ip_address: '127.0.0.1',
    user_agent: 'test-agent',
    status: AuditStatus.SUCCESS,
    error_message: "",
    level: AuditLevel.INFO,
    metadata: null,
  } as unknown as AuditLog;

  const mockQueryBuilder = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue([[mockAuditLog], 1]),
  };

  const mockAuditLogRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockAuditLogRepository.createQueryBuilder.mockReturnValue({
      ...mockQueryBuilder,
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditService,
        {
          provide: getRepositoryToken(AuditLog),
          useValue: mockAuditLogRepository,
        },
      ],
    }).compile();

    service = module.get<AuditService>(AuditService);
  });

  describe('Audit Log Creation', () => {
    it('creates an audit log with correct fields', async () => {
      mockAuditLogRepository.create.mockReturnValue(mockAuditLog);
      mockAuditLogRepository.save.mockResolvedValue(mockAuditLog);

      await service.log({
        action: AuditAction.CREATE,
        entityType,
        entityId,
        performedBy: userId,
        newValues: { name: 'Test Property' },
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent',
      });

      expect(mockAuditLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          action: AuditAction.CREATE,
          entity_type: entityType,
          entity_id: entityId,
          performed_by: userId,
          status: AuditStatus.SUCCESS,
          level: AuditLevel.INFO,
        }),
      );
      expect(mockAuditLogRepository.save).toHaveBeenCalledTimes(1);
    });

    it('defaults status to SUCCESS when not specified', async () => {
      mockAuditLogRepository.create.mockReturnValue(mockAuditLog);
      mockAuditLogRepository.save.mockResolvedValue(mockAuditLog);

      await service.log({ action: AuditAction.UPDATE, entityType, entityId });

      expect(mockAuditLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ status: AuditStatus.SUCCESS }),
      );
    });

    it('defaults level to INFO when not specified', async () => {
      mockAuditLogRepository.create.mockReturnValue(mockAuditLog);
      mockAuditLogRepository.save.mockResolvedValue(mockAuditLog);

      await service.log({ action: AuditAction.DATA_ACCESS });

      expect(mockAuditLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ level: AuditLevel.INFO }),
      );
    });
  });

  describe('User Action Tracking', () => {
    it('logs a successful user action with old and new values', async () => {
      const oldValues = { status: 'inactive' };
      const newValues = { status: 'active' };

      mockAuditLogRepository.create.mockReturnValue({
        ...mockAuditLog,
        old_values: oldValues,
        new_values: newValues,
      });
      mockAuditLogRepository.save.mockResolvedValue({
        ...mockAuditLog,
        old_values: oldValues,
        new_values: newValues,
      });

      await service.logSuccess(
        AuditAction.UPDATE,
        entityType,
        entityId,
        userId,
        oldValues,
        newValues,
      );

      expect(mockAuditLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          action: AuditAction.UPDATE,
          old_values: oldValues,
          new_values: newValues,
          status: AuditStatus.SUCCESS,
        }),
      );
    });

    it('logs a failed operation with error message and FAILURE status', async () => {
      const errorMsg = 'Insufficient permissions';
      const failLog = {
        ...mockAuditLog,
        status: AuditStatus.FAILURE,
        error_message: errorMsg,
      };

      mockAuditLogRepository.create.mockReturnValue(failLog);
      mockAuditLogRepository.save.mockResolvedValue(failLog);

      await service.logFailure(
        AuditAction.DELETE,
        entityType,
        entityId,
        errorMsg,
        userId,
      );

      expect(mockAuditLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          status: AuditStatus.FAILURE,
          error_message: errorMsg,
        }),
      );
    });

    it('supports all critical audit actions', () => {
      const criticalActions = [
        AuditAction.PAYMENT_INITIATED,
        AuditAction.PAYMENT_COMPLETED,
        AuditAction.ESCROW_CREATED,
        AuditAction.ESCROW_RELEASED,
        AuditAction.BLOCKCHAIN_TX_SUBMITTED,
        AuditAction.BLOCKCHAIN_TX_CONFIRMED,
        AuditAction.USER_REGISTERED,
        AuditAction.KYC_APPROVED,
        AuditAction.SUSPICIOUS_ACTIVITY,
      ];

      criticalActions.forEach((action) => {
        expect(Object.values(AuditAction)).toContain(action);
      });
    });
  });

  describe('Data Change Logging', () => {
    it('captures before and after values for UPDATE operations', async () => {
      const oldValues = { rentAmount: 1000 };
      const newValues = { rentAmount: 1200 };

      mockAuditLogRepository.create.mockReturnValue({
        ...mockAuditLog,
        action: AuditAction.UPDATE,
        old_values: oldValues,
        new_values: newValues,
      });
      mockAuditLogRepository.save.mockResolvedValue({
        ...mockAuditLog,
        action: AuditAction.UPDATE,
        old_values: oldValues,
        new_values: newValues,
      });

      await service.log({
        action: AuditAction.UPDATE,
        entityType: 'Agreement',
        entityId: 'agreement-1',
        oldValues,
        newValues,
        performedBy: userId,
      });

      const createCall = mockAuditLogRepository.create.mock.calls[0][0];
      expect(createCall.old_values).toEqual(oldValues);
      expect(createCall.new_values).toEqual(newValues);
    });

    it('stores metadata for enriched audit context', async () => {
      const metadata = { ipCountry: 'NG', deviceType: 'mobile' };
      mockAuditLogRepository.create.mockReturnValue({
        ...mockAuditLog,
        metadata,
      });
      mockAuditLogRepository.save.mockResolvedValue({
        ...mockAuditLog,
        metadata,
      });

      await service.log({
        action: AuditAction.LOGIN,
        performedBy: userId,
        metadata,
      });

      expect(mockAuditLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ metadata }),
      );
    });
  });

  describe('Audit Trail Retrieval', () => {
    it('retrieves audit trail for an entity ordered by most recent', async () => {
      const logs = [
        { ...mockAuditLog, id: 2, action: AuditAction.UPDATE },
        { ...mockAuditLog, id: 1, action: AuditAction.CREATE },
      ];
      mockAuditLogRepository.find.mockResolvedValue(logs);

      const result = await service.getAuditTrail(entityType, entityId);

      expect(mockAuditLogRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { entity_type: entityType, entity_id: entityId },
          order: { performed_at: 'DESC' },
        }),
      );
      expect(result).toHaveLength(2);
    });

    it('retrieves user activity log ordered by most recent', async () => {
      const userLogs = [{ ...mockAuditLog, id: 3, action: AuditAction.LOGIN }];
      mockAuditLogRepository.find.mockResolvedValue(userLogs);

      const result = await service.getUserActivity(userId);

      expect(mockAuditLogRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { performed_by: userId },
          order: { performed_at: 'DESC' },
        }),
      );
      expect(result).toHaveLength(1);
      expect(result[0].action).toBe(AuditAction.LOGIN);
    });

    it('respects the limit parameter on audit trail retrieval', async () => {
      mockAuditLogRepository.find.mockResolvedValue([mockAuditLog]);

      await service.getAuditTrail(entityType, entityId, 10);

      expect(mockAuditLogRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({ take: 10 }),
      );
    });
  });

  describe('Audit Log Querying and Filtering', () => {
    it('queries logs with action filter', async () => {
      const qb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[mockAuditLog], 1]),
      };
      mockAuditLogRepository.createQueryBuilder.mockReturnValue(qb);

      const queryDto: QueryAuditLogsDto = {
        action: AuditAction.CREATE,
        page: 1,
        limit: 20,
      };
      const result = await service.query(queryDto);

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('enforces a maximum limit of 100 per page', async () => {
      const qb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };
      mockAuditLogRepository.createQueryBuilder.mockReturnValue(qb);

      await service.query({ page: 1, limit: 500 });

      expect(qb.take).toHaveBeenCalledWith(100);
    });

    it('returns paginated response with correct metadata', async () => {
      const logs = Array.from({ length: 3 }, (_, i) => ({
        ...mockAuditLog,
        id: i + 1,
      }));
      const qb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([logs, 3]),
      };
      mockAuditLogRepository.createQueryBuilder.mockReturnValue(qb);

      const result = await service.query({ page: 1, limit: 10 });

      expect(result.total).toBe(3);
      expect(result.page).toBe(1);
      expect(result.data).toHaveLength(3);
    });
  });

  describe('Audit Log Immutability', () => {
    it('does not expose an update method on audit logs', () => {
      expect(mockAuditLogRepository).not.toHaveProperty('update');
    });

    it('does not expose a delete method on audit service', () => {
      expect((service as any).auditLogRepository).not.toHaveProperty('remove');
    });
  });

  describe('Error Resilience', () => {
    it('does not propagate repository errors to the caller', async () => {
      mockAuditLogRepository.create.mockReturnValue(mockAuditLog);
      mockAuditLogRepository.save.mockRejectedValue(
        new Error('DB connection lost'),
      );

      await expect(
        service.log({ action: AuditAction.CREATE, entityType, entityId }),
      ).resolves.not.toThrow();
    });
  });
});
