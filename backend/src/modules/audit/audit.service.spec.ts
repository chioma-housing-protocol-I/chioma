import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditService } from './audit.service';
import { AuditLog, AuditAction, AuditLevel } from './entities/audit-log.entity';

describe('AuditService', () => {
  let service: AuditService;
  let auditLogRepository: Repository<AuditLog>;

  const mockAuditLogRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    createQueryBuilder: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn(),
  };

  beforeEach(async () => {
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
    auditLogRepository = module.get<Repository<AuditLog>>(
      getRepositoryToken(AuditLog),
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('log', () => {
    it('should create and save an audit log', async () => {
      const auditData = {
        action: AuditAction.CREATE,
        entityType: 'User',
        entityId: 'user-123',
        performedBy: 'admin-456',
        level: AuditLevel.INFO,
      };

      const mockAuditLog = { id: 1, ...auditData };
      mockAuditLogRepository.create.mockReturnValue(mockAuditLog);
      mockAuditLogRepository.save.mockResolvedValue(mockAuditLog);

      await service.log(auditData);

      expect(mockAuditLogRepository.create).toHaveBeenCalledWith({
        action: auditData.action,
        entity_type: auditData.entityType,
        entity_id: auditData.entityId,
        performed_by: auditData.performedBy,
        level: auditData.level,
        status: 'SUCCESS',
        old_values: undefined,
        new_values: undefined,
        error_message: undefined,
        ip_address: undefined,
        user_agent: undefined,
        metadata: undefined,
      });
      expect(mockAuditLogRepository.save).toHaveBeenCalledWith(mockAuditLog);
    });
  });

  describe('logSuccess', () => {
    it('should log a successful operation with old/new values', async () => {
      const mockAuditLog = { id: 1 };
      mockAuditLogRepository.create.mockReturnValue(mockAuditLog);
      mockAuditLogRepository.save.mockResolvedValue(mockAuditLog);

      await service.logSuccess(
        AuditAction.UPDATE,
        'User',
        'user-123',
        'admin-456',
        { name: 'Old Name' },
        { name: 'New Name' },
      );

      expect(mockAuditLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          action: AuditAction.UPDATE,
          entity_type: 'User',
          entity_id: 'user-123',
          performed_by: 'admin-456',
          old_values: { name: 'Old Name' },
          new_values: { name: 'New Name' },
          status: 'SUCCESS',
          level: 'INFO',
        }),
      );
    });
  });

  describe('query', () => {
    it('should return paginated audit logs', async () => {
      const mockLogs = [
        { id: 1, action: AuditAction.CREATE },
        { id: 2, action: AuditAction.UPDATE },
      ];
      const mockCount = 2;

      mockAuditLogRepository.getManyAndCount.mockResolvedValue([
        mockLogs,
        mockCount,
      ]);

      const result = await service.query({ page: 1, limit: 10 });

      expect(result).toEqual({
        data: mockLogs,
        total: mockCount,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
    });

    it('should apply filters correctly', async () => {
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };

      mockAuditLogRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder,
      );

      await service.query({
        action: AuditAction.CREATE,
        level: AuditLevel.SECURITY,
        performedBy: 'user-123',
      });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'audit_log.action = :action',
        { action: AuditAction.CREATE },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'audit_log.level = :level',
        { level: AuditLevel.SECURITY },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'audit_log.performed_by = :performedBy',
        { performedBy: 'user-123' },
      );
    });
  });

  describe('getAuditTrail', () => {
    it('should return audit trail for an entity', async () => {
      const mockLogs = [
        { id: 1, action: AuditAction.CREATE },
        { id: 2, action: AuditAction.UPDATE },
      ];

      mockAuditLogRepository.find.mockResolvedValue(mockLogs);

      const result = await service.getAuditTrail('User', 'user-123', 50);

      expect(mockAuditLogRepository.find).toHaveBeenCalledWith({
        where: { entity_type: 'User', entity_id: 'user-123' },
        relations: ['performed_by_user'],
        order: { performed_at: 'DESC' },
        take: 50,
      });
      expect(result).toEqual(mockLogs);
    });
  });
});
