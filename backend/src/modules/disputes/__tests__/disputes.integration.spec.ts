// User (and related) column types are chosen at decoration time from DB_TYPE.
process.env.DB_TYPE = 'sqlite';

import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { DataSource, getMetadataArgsStorage } from 'typeorm';
import { DisputesService } from '../disputes.service';
import { DisputeBlockchainService } from '../dispute-blockchain.service';
import {
  Dispute,
  DisputeStatus,
  DisputeType,
} from '../entities/dispute.entity';
import { DisputeEvidence } from '../entities/dispute-evidence.entity';
import { DisputeComment } from '../entities/dispute-comment.entity';
import { Arbiter } from '../entities/arbiter.entity';
import { DisputeVote } from '../entities/dispute-vote.entity';
import {
  RentAgreement,
  AgreementStatus,
} from '../../rent/entities/rent-contract.entity';
import { User, UserRole } from '../../users/entities/user.entity';
import { Payment as GeneralPayment } from '../../payments/entities/payment.entity';
import { Payment as RentPayment } from '../../rent/entities/payment.entity';
import { RentObligationNft } from '../../agreements/entities/rent-obligation-nft.entity';
import { NFTTransfer } from '../../agreements/entities/nft-transfer.entity';
import { CreateDisputeDto } from '../dto/create-dispute.dto';
import { AddCommentDto } from '../dto/add-comment.dto';
import { ResolveDisputeDto } from '../dto/resolve-dispute.dto';
import { QueryDisputesDto } from '../dto/query-disputes.dto';
import { UpdateDisputeDto } from '../dto/update-dispute.dto';
import {
  AgreementNotFoundError,
  AuthorizationError,
  BusinessRuleViolationError,
  DisputeNotFoundError,
  ValidationError,
} from '../../../common/errors/domain-errors';
import { AuditService } from '../../audit/audit.service';
import { LockService } from '../../../common/lock';
import { REDIS_CLIENT } from '../../../common/lock/redis-client.token';
import { IdempotencyService } from '../../../common/idempotency';
import { MalwareScanService } from '../../storage/malware-scan.service';
import { QueueManagementService } from '../../queues/services/queue-management.service';
import {
  DisputeContractService,
  DisputeOutcome,
} from '../../stellar/services/dispute-contract.service';

const PDF_BUFFER = Buffer.from('%PDF-1.4 dispute evidence');
const JPEG_BUFFER = Buffer.from([0xff, 0xd8, 0xff, 0x00, 0x11]);
const INVALID_BUFFER = Buffer.from([0x00, 0x01, 0x02, 0x4d, 0x5a]);

/**
 * SQLite's TypeORM driver rejects Postgres-only column types. Rewrite them
 * for this in-memory suite only; postgres keeps the original metadata.
 */
const sqliteColumnTypes: Record<string, string> = {
  timestamp: 'datetime',
  jsonb: 'json',
  enum: 'simple-enum',
  bytea: 'blob',
};
const rewrittenColumns: { options: { type?: string }; type: string }[] = [];
for (const column of getMetadataArgsStorage().columns) {
  const options = column.options as { type?: string };
  const current = options.type;
  if (typeof current === 'string' && sqliteColumnTypes[current]) {
    rewrittenColumns.push({ options, type: current });
    options.type = sqliteColumnTypes[current];
  }
}

jest.mock('fs/promises', () => {
  const actual = jest.requireActual('fs/promises');
  return {
    ...actual,
    readFile: jest.fn().mockResolvedValue(Buffer.from('mock file contents')),
  };
});

/**
 * Integration Tests for Dispute Module
 *
 * These tests verify the complete integration flow including:
 * - Database operations and transactions
 * - Service layer interactions
 * - Business logic validation
 * - Error handling and edge cases
 * - Data consistency and integrity
 */
describe('DisputesService - Integration Tests', () => {
  let module: TestingModule;
  let service: DisputesService;
  let blockchainService: DisputeBlockchainService;
  let disputeContract: {
    raiseDispute: jest.Mock;
    getDispute: jest.Mock;
    resolveDispute: jest.Mock;
    voteOnDispute: jest.Mock;
    addArbiter: jest.Mock;
  };
  let dataSource: DataSource;
  let landlordUser: User;
  let tenantUser: User;
  let adminUser: User;
  let testAgreement: RentAgreement;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: false,
          ignoreEnvFile: true,
        }),
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          entities: [
            Dispute,
            DisputeEvidence,
            DisputeComment,
            Arbiter,
            DisputeVote,
            RentAgreement,
            RentPayment,
            RentObligationNft,
            NFTTransfer,
            User,
          ],
          synchronize: true,
          dropSchema: true,
          retryAttempts: 0,
        }),
        TypeOrmModule.forFeature([
          Dispute,
          DisputeEvidence,
          DisputeComment,
          Arbiter,
          DisputeVote,
          RentAgreement,
          User,
        ]),
      ],
      providers: [
        DisputesService,
        DisputeBlockchainService,
        LockService,
        { provide: REDIS_CLIENT, useValue: null },
        {
          provide: IdempotencyService,
          useValue: {
            process: jest.fn((_key, _ttl, fn) => fn()),
          },
        },
        {
          provide: MalwareScanService,
          useValue: { scan: jest.fn().mockResolvedValue({ clean: true }) },
        },
        {
          provide: QueueManagementService,
          useValue: { addVideoProcessingJob: jest.fn() },
        },
        {
          provide: AuditService,
          useValue: { log: jest.fn().mockResolvedValue(undefined) },
        },
        {
          provide: getRepositoryToken(GeneralPayment),
          useValue: { findOne: jest.fn() },
        },
        {
          provide: getRepositoryToken(RentPayment),
          useValue: { findOne: jest.fn() },
        },
        {
          provide: DisputeContractService,
          useValue: {
            raiseDispute: jest.fn().mockResolvedValue('chain-tx-hash'),
            getDispute: jest.fn(),
            resolveDispute: jest.fn(),
            voteOnDispute: jest.fn().mockResolvedValue('vote-tx-hash'),
            addArbiter: jest.fn().mockResolvedValue('arbiter-tx-hash'),
          },
        },
      ],
    }).compile();

    service = module.get<DisputesService>(DisputesService);
    blockchainService = module.get(DisputeBlockchainService);
    disputeContract = module.get(DisputeContractService);
    dataSource = module.get<DataSource>(DataSource);

    // Setup test data
    await setupTestData();
  }, 30000);

  afterAll(async () => {
    for (const column of rewrittenColumns) {
      column.options.type = column.type;
    }
    if (dataSource && dataSource.isInitialized) {
      await dataSource.destroy();
    }
    if (module) {
      await module.close();
    }
  });

  afterEach(async () => {
    if (dataSource && dataSource.isInitialized) {
      await dataSource
        .getRepository(DisputeComment)
        .createQueryBuilder()
        .delete()
        .execute();
      await dataSource
        .getRepository(DisputeEvidence)
        .createQueryBuilder()
        .delete()
        .execute();
      await dataSource
        .getRepository(DisputeVote)
        .createQueryBuilder()
        .delete()
        .execute();
      await dataSource
        .getRepository(Dispute)
        .createQueryBuilder()
        .delete()
        .execute();
      if (testAgreement?.id) {
        await dataSource
          .getRepository(RentAgreement)
          .update(testAgreement.id, { status: AgreementStatus.ACTIVE });
      }
    }
  });

  async function setupTestData() {
    const userRepo = dataSource.getRepository(User);
    const agreementRepo = dataSource.getRepository(RentAgreement);

    // Create test users
    landlordUser = await userRepo.save({
      email: 'landlord@test.com',
      firstName: 'Land',
      lastName: 'Lord',
      role: UserRole.ADMIN,
      isActive: true,
      password: 'hashed_password',
    } as User);

    tenantUser = await userRepo.save({
      email: 'tenant@test.com',
      firstName: 'Ten',
      lastName: 'Ant',
      role: UserRole.USER,
      isActive: true,
      password: 'hashed_password',
    } as User);

    adminUser = await userRepo.save({
      email: 'admin@test.com',
      firstName: 'Admin',
      lastName: 'User',
      role: UserRole.ADMIN,
      isActive: true,
      password: 'hashed_password',
    } as User);

    // Create test agreement
    testAgreement = await agreementRepo.save({
      agreementNumber: 'AGR-TEST-001',
      adminId: landlordUser.id,
      userId: tenantUser.id,
      monthlyRent: 1500,
      securityDeposit: 3000,
      status: AgreementStatus.ACTIVE,
      startDate: new Date(),
      endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    } as RentAgreement);
  }

  describe('Integration: Create Dispute', () => {
    it('should successfully create a dispute with all required fields', async () => {
      const createDto: CreateDisputeDto = {
        agreementId: testAgreement.id,
        disputeType: DisputeType.RENT_PAYMENT,
        requestedAmount: 500,
        description: 'Tenant has not paid rent for the last month',
      };

      const dispute = await service.createDispute(createDto, tenantUser.id);

      expect(dispute).toBeDefined();
      expect(dispute.disputeId).toBeDefined();
      expect(dispute.disputeType).toBe(DisputeType.RENT_PAYMENT);
      expect(Number(dispute.requestedAmount)).toBe(500);
      expect(dispute.status).toBe(DisputeStatus.OPEN);
      expect(dispute.initiatedBy).toBe(tenantUser.id);

      // Verify agreement status was updated
      const updatedAgreement = await dataSource
        .getRepository(RentAgreement)
        .findOne({ where: { id: testAgreement.id } });
      expect(updatedAgreement?.status).toBe(AgreementStatus.DISPUTED);
    });

    it('should create dispute with metadata', async () => {
      const metadata = { priority: 'high', category: 'urgent' };
      const createDto: CreateDisputeDto = {
        agreementId: testAgreement.id,
        disputeType: DisputeType.PROPERTY_DAMAGE,
        description: 'Property damage in living room',
        metadata: JSON.stringify(metadata),
      };

      const dispute = await service.createDispute(createDto, landlordUser.id);

      expect(dispute.metadata).toEqual(metadata);
    });

    it('should prevent duplicate active disputes for same agreement', async () => {
      const createDto: CreateDisputeDto = {
        agreementId: testAgreement.id,
        disputeType: DisputeType.MAINTENANCE,
        description: 'First dispute',
      };

      await service.createDispute(createDto, tenantUser.id);

      // Try to create another dispute
      const secondDto: CreateDisputeDto = {
        agreementId: testAgreement.id,
        disputeType: DisputeType.SECURITY_DEPOSIT,
        description: 'Second dispute',
      };

      await expect(
        service.createDispute(secondDto, tenantUser.id),
      ).rejects.toThrow(BusinessRuleViolationError);
    });

    it('should reject dispute creation by unauthorized user', async () => {
      const unauthorizedUser = await dataSource.getRepository(User).save({
        email: 'unauthorized@test.com',
        firstName: 'Unauth',
        lastName: 'User',
        role: UserRole.USER,
        isActive: true,
        password: 'hashed_password',
      } as User);

      const createDto: CreateDisputeDto = {
        agreementId: testAgreement.id,
        disputeType: DisputeType.RENT_PAYMENT,
        description: 'Unauthorized dispute',
      };

      await expect(
        service.createDispute(createDto, unauthorizedUser.id),
      ).rejects.toThrow(AuthorizationError);
    });

    it('should reject dispute for non-existent agreement', async () => {
      const createDto: CreateDisputeDto = {
        agreementId: '99999',
        disputeType: DisputeType.RENT_PAYMENT,
        description: 'Dispute for non-existent agreement',
      };

      await expect(
        service.createDispute(createDto, tenantUser.id),
      ).rejects.toThrow(AgreementNotFoundError);
    });

    it('should handle transaction rollback on error', async () => {
      const createDto: CreateDisputeDto = {
        agreementId: testAgreement.id,
        disputeType: DisputeType.RENT_PAYMENT,
        description: 'Test transaction rollback',
      };

      const original = dataSource.createQueryRunner.bind(dataSource);
      const spy = jest
        .spyOn(dataSource, 'createQueryRunner')
        .mockImplementationOnce(() => {
          const queryRunner = original();
          jest
            .spyOn(queryRunner.manager, 'save')
            .mockRejectedValueOnce(new Error('Database error'));
          return queryRunner;
        });

      await expect(
        service.createDispute(createDto, tenantUser.id),
      ).rejects.toThrow('Database error');

      const agreement = await dataSource
        .getRepository(RentAgreement)
        .findOne({ where: { id: testAgreement.id } });
      expect(agreement?.status).toBe(AgreementStatus.ACTIVE);
      expect(await dataSource.getRepository(Dispute).count()).toBe(0);

      spy.mockRestore();
    });
  });

  describe('Integration: Query Disputes', () => {
    beforeEach(async () => {
      // Create multiple disputes for testing
      await service.createDispute(
        {
          agreementId: testAgreement.id,
          disputeType: DisputeType.RENT_PAYMENT,
          description: 'Dispute 1',
        },
        tenantUser.id,
      );

      // Reset agreement status for next dispute
      await dataSource
        .getRepository(RentAgreement)
        .update(testAgreement.id, { status: AgreementStatus.ACTIVE });
    });

    it('should retrieve all disputes with pagination', async () => {
      const query: QueryDisputesDto = {
        page: 1,
        limit: 10,
        sortBy: 'createdAt',
        sortOrder: 'DESC',
      };

      const result = await service.findAll(query);

      expect(result.data).toBeDefined();
      expect(result.total).toBeGreaterThan(0);
      expect(result.data.length).toBeLessThanOrEqual(10);
    });

    it('should filter disputes by status', async () => {
      const query: QueryDisputesDto = {
        status: DisputeStatus.OPEN,
        page: 1,
        limit: 10,
        sortBy: 'createdAt',
        sortOrder: 'DESC',
      };

      const result = await service.findAll(query);

      expect(result.data.every((d) => d.status === DisputeStatus.OPEN)).toBe(
        true,
      );
    });

    it('should filter disputes by type', async () => {
      const query: QueryDisputesDto = {
        disputeType: DisputeType.RENT_PAYMENT,
        page: 1,
        limit: 10,
        sortBy: 'createdAt',
        sortOrder: 'DESC',
      };

      const result = await service.findAll(query);

      expect(
        result.data.every((d) => d.disputeType === DisputeType.RENT_PAYMENT),
      ).toBe(true);
    });

    it('should filter disputes by agreement ID', async () => {
      const query: QueryDisputesDto = {
        agreementId: testAgreement.id,
        page: 1,
        limit: 10,
        sortBy: 'createdAt',
        sortOrder: 'DESC',
      };

      const result = await service.findAll(query);

      expect(
        result.data.every((d) => d.agreementId.toString() === testAgreement.id),
      ).toBe(true);
    });

    it('should include related entities in query results', async () => {
      const query: QueryDisputesDto = {
        page: 1,
        limit: 10,
        sortBy: 'createdAt',
        sortOrder: 'DESC',
      };

      const result = await service.findAll(query);

      expect(result.data[0].agreement).toBeDefined();
      expect(result.data[0].initiator).toBeDefined();
    });
  });

  describe('Integration: Add Evidence', () => {
    let testDispute: Dispute;

    beforeEach(async () => {
      testDispute = await service.createDispute(
        {
          agreementId: testAgreement.id,
          disputeType: DisputeType.PROPERTY_DAMAGE,
          description: 'Test dispute for evidence',
        },
        tenantUser.id,
      );
    });

    it('should successfully add evidence to dispute', async () => {
      const mockFile = {
        originalname: 'evidence.pdf',
        mimetype: 'application/pdf',
        size: PDF_BUFFER.length,
        path: '/uploads/evidence.pdf',
        buffer: PDF_BUFFER,
      };

      const evidence = await service.addEvidence(
        testDispute.disputeId,
        mockFile,
        tenantUser.id,
        {
          fileName: 'evidence.pdf',
          fileType: 'application/pdf',
          description: 'Photo evidence of damage',
        },
      );

      expect(evidence).toBeDefined();
      expect(evidence.fileName).toBe('evidence.pdf');
      expect(evidence.fileType).toBe('application/pdf');
      expect(evidence.uploadedBy).toBe(tenantUser.id);
    });

    it('should reject invalid file types', async () => {
      const mockFile = {
        originalname: 'malicious.exe',
        mimetype: 'application/x-msdownload',
        size: INVALID_BUFFER.length,
        path: '/uploads/malicious.exe',
        buffer: INVALID_BUFFER,
      };

      await expect(
        service.addEvidence(testDispute.disputeId, mockFile, tenantUser.id),
      ).rejects.toThrow(ValidationError);
    });

    it('should reject files exceeding size limit', async () => {
      const mockFile = {
        originalname: 'large.pdf',
        mimetype: 'application/pdf',
        size: 11 * 1024 * 1024, // 11MB
        path: '/uploads/large.pdf',
        buffer: PDF_BUFFER,
      };

      await expect(
        service.addEvidence(testDispute.disputeId, mockFile, tenantUser.id),
      ).rejects.toThrow(ValidationError);
    });

    it('should allow multiple evidence uploads', async () => {
      const mockFile1 = {
        originalname: 'evidence1.jpg',
        mimetype: 'image/jpeg',
        size: JPEG_BUFFER.length,
        path: '/uploads/evidence1.jpg',
        buffer: JPEG_BUFFER,
      };

      const mockFile2 = {
        originalname: 'evidence2.pdf',
        mimetype: 'application/pdf',
        size: PDF_BUFFER.length,
        path: '/uploads/evidence2.pdf',
        buffer: PDF_BUFFER,
      };

      const evidence1 = await service.addEvidence(
        testDispute.disputeId,
        mockFile1,
        tenantUser.id,
      );
      const evidence2 = await service.addEvidence(
        testDispute.disputeId,
        mockFile2,
        landlordUser.id,
      );

      expect(evidence1).toBeDefined();
      expect(evidence2).toBeDefined();

      const dispute = await service.findByDisputeId(testDispute.disputeId);
      expect(dispute.evidence.length).toBe(2);
    });
  });

  describe('Integration: Add Comments', () => {
    let testDispute: Dispute;

    beforeEach(async () => {
      testDispute = await service.createDispute(
        {
          agreementId: testAgreement.id,
          disputeType: DisputeType.MAINTENANCE,
          description: 'Test dispute for comments',
        },
        tenantUser.id,
      );
    });

    it('should successfully add comment to dispute', async () => {
      const commentDto: AddCommentDto = {
        content: 'This is a test comment',
        isInternal: false,
      };

      const comment = await service.addComment(
        testDispute.disputeId,
        commentDto,
        tenantUser.id,
      );

      expect(comment).toBeDefined();
      expect(comment.content).toBe('This is a test comment');
      expect(comment.userId).toBe(tenantUser.id);
      expect(comment.isInternal).toBe(false);
    });

    it('should allow admin to add internal comments', async () => {
      const commentDto: AddCommentDto = {
        content: 'Internal admin note',
        isInternal: true,
      };

      const comment = await service.addComment(
        testDispute.disputeId,
        commentDto,
        adminUser.id,
      );

      expect(comment.isInternal).toBe(true);
    });

    it('should reject internal comments from non-admin users', async () => {
      const commentDto: AddCommentDto = {
        content: 'Trying to add internal comment',
        isInternal: true,
      };

      await expect(
        service.addComment(testDispute.disputeId, commentDto, tenantUser.id),
      ).rejects.toThrow(AuthorizationError);
    });

    it('should maintain comment order by creation time', async () => {
      await service.addComment(
        testDispute.disputeId,
        { content: 'First comment', isInternal: false },
        tenantUser.id,
      );

      await service.addComment(
        testDispute.disputeId,
        { content: 'Second comment', isInternal: false },
        landlordUser.id,
      );

      const dispute = await service.findByDisputeId(testDispute.disputeId);
      expect(dispute.comments.length).toBe(2);
      expect(dispute.comments[0].createdAt.getTime()).toBeLessThanOrEqual(
        dispute.comments[1].createdAt.getTime(),
      );
    });
  });

  describe('Integration: Resolve Dispute', () => {
    let testDispute: Dispute;

    beforeEach(async () => {
      testDispute = await service.createDispute(
        {
          agreementId: testAgreement.id,
          disputeType: DisputeType.SECURITY_DEPOSIT,
          description: 'Test dispute for resolution',
        },
        tenantUser.id,
      );

      // Move dispute to UNDER_REVIEW status
      await service.update(
        testDispute.id,
        { status: DisputeStatus.UNDER_REVIEW },
        adminUser.id,
      );
    });

    it('should successfully resolve dispute by admin', async () => {
      const resolveDto: ResolveDisputeDto = {
        resolution: 'Dispute resolved in favor of tenant',
      };

      const resolved = await service.resolveDispute(
        testDispute.disputeId,
        resolveDto,
        adminUser.id,
      );

      expect(resolved.status).toBe(DisputeStatus.RESOLVED);
      expect(resolved.resolution).toBe('Dispute resolved in favor of tenant');
      expect(resolved.resolvedBy).toBe(adminUser.id);
      expect(resolved.resolvedAt).toBeDefined();
    });

    it('should update agreement status when dispute is resolved', async () => {
      const resolveDto: ResolveDisputeDto = {
        resolution: 'Resolved',
      };

      await service.resolveDispute(
        testDispute.disputeId,
        resolveDto,
        adminUser.id,
      );

      const agreement = await dataSource
        .getRepository(RentAgreement)
        .findOne({ where: { id: testAgreement.id } });
      expect(agreement?.status).toBe(AgreementStatus.ACTIVE);
    });

    it('should reject resolution by non-admin user', async () => {
      const resolveDto: ResolveDisputeDto = {
        resolution: 'Trying to resolve',
      };

      await expect(
        service.resolveDispute(
          testDispute.disputeId,
          resolveDto,
          tenantUser.id,
        ),
      ).rejects.toThrow(AuthorizationError);
    });

    it('should reject resolution of dispute not under review', async () => {
      await service.update(
        testDispute.id,
        { status: DisputeStatus.REJECTED },
        adminUser.id,
      );
      await dataSource
        .getRepository(RentAgreement)
        .update(testAgreement.id, { status: AgreementStatus.ACTIVE });

      const openDispute = await service.createDispute(
        {
          agreementId: testAgreement.id,
          disputeType: DisputeType.OTHER,
          description: 'Open dispute',
        },
        tenantUser.id,
      );

      const resolveDto: ResolveDisputeDto = {
        resolution: 'Trying to resolve open dispute',
      };

      await expect(
        service.resolveDispute(openDispute.disputeId, resolveDto, adminUser.id),
      ).rejects.toThrow(BusinessRuleViolationError);
    });
  });

  describe('Integration: Update Dispute', () => {
    let testDispute: Dispute;

    beforeEach(async () => {
      testDispute = await service.createDispute(
        {
          agreementId: testAgreement.id,
          disputeType: DisputeType.TERMINATION,
          description: 'Test dispute for updates',
        },
        tenantUser.id,
      );
    });

    it('should successfully update dispute status', async () => {
      const updateDto: UpdateDisputeDto = {
        status: DisputeStatus.UNDER_REVIEW,
      };

      const updated = await service.update(
        testDispute.id,
        updateDto,
        adminUser.id,
      );

      expect(updated.status).toBe(DisputeStatus.UNDER_REVIEW);
    });

    it('should validate status transitions', async () => {
      // Try invalid transition: OPEN -> RESOLVED (should go through UNDER_REVIEW)
      const updateDto: UpdateDisputeDto = {
        status: DisputeStatus.RESOLVED,
      };

      await expect(
        service.update(testDispute.id, updateDto, adminUser.id),
      ).rejects.toThrow(BusinessRuleViolationError);
    });

    it('should allow valid status transitions', async () => {
      // OPEN -> UNDER_REVIEW
      await service.update(
        testDispute.id,
        { status: DisputeStatus.UNDER_REVIEW },
        adminUser.id,
      );

      // UNDER_REVIEW -> REJECTED
      const updated = await service.update(
        testDispute.id,
        { status: DisputeStatus.REJECTED },
        adminUser.id,
      );

      expect(updated.status).toBe(DisputeStatus.REJECTED);

      // REJECTED -> OPEN (can be reopened)
      const reopened = await service.update(
        testDispute.id,
        { status: DisputeStatus.OPEN },
        adminUser.id,
      );

      expect(reopened.status).toBe(DisputeStatus.OPEN);
    });
  });

  describe('Integration: Get Agreement Disputes', () => {
    beforeEach(async () => {
      const first = await service.createDispute(
        {
          agreementId: testAgreement.id,
          disputeType: DisputeType.RENT_PAYMENT,
          description: 'First dispute',
        },
        tenantUser.id,
      );
      await service.update(
        first.id,
        { status: DisputeStatus.WITHDRAWN },
        tenantUser.id,
      );

      await dataSource
        .getRepository(RentAgreement)
        .update(testAgreement.id, { status: AgreementStatus.ACTIVE });

      await service.createDispute(
        {
          agreementId: testAgreement.id,
          disputeType: DisputeType.MAINTENANCE,
          description: 'Second dispute',
        },
        landlordUser.id,
      );
    });

    it('should retrieve all disputes for an agreement', async () => {
      const result = await service.getAgreementDisputes(
        testAgreement.id,
        tenantUser.id,
      );
      const disputes = result.data;

      expect(disputes.length).toBeGreaterThanOrEqual(2);
      expect(
        disputes.every((d) => d.agreementId.toString() === testAgreement.id),
      ).toBe(true);
    });

    it('should order disputes by creation date descending', async () => {
      const result = await service.getAgreementDisputes(
        testAgreement.id,
        tenantUser.id,
      );
      const disputes = result.data;

      for (let i = 0; i < disputes.length - 1; i++) {
        expect(disputes[i].createdAt.getTime()).toBeGreaterThanOrEqual(
          disputes[i + 1].createdAt.getTime(),
        );
      }
    });

    it('should reject access by unauthorized user', async () => {
      const unauthorizedUser = await dataSource.getRepository(User).save({
        email: 'unauth2@test.com',
        firstName: 'Unauth',
        lastName: 'User2',
        role: UserRole.USER,
        isActive: true,
        password: 'hashed_password',
      } as User);

      await expect(
        service.getAgreementDisputes(testAgreement.id, unauthorizedUser.id),
      ).rejects.toThrow(AuthorizationError);
    });
  });

  describe('Integration: Edge Cases and Error Scenarios', () => {
    it('should handle concurrent dispute creation attempts', async () => {
      const createDto: CreateDisputeDto = {
        agreementId: testAgreement.id,
        disputeType: DisputeType.RENT_PAYMENT,
        description: 'Concurrent dispute',
      };

      // Attempt to create two disputes simultaneously
      const promises = [
        service.createDispute(createDto, tenantUser.id),
        service.createDispute(createDto, tenantUser.id),
      ];

      const results = await Promise.allSettled(promises);

      // One should succeed, one should fail
      const succeeded = results.filter((r) => r.status === 'fulfilled').length;
      const failed = results.filter((r) => r.status === 'rejected').length;

      expect(succeeded).toBe(1);
      expect(failed).toBe(1);
    });

    it('should handle finding non-existent dispute', async () => {
      await expect(service.findOne(99999)).rejects.toThrow(
        DisputeNotFoundError,
      );
    });

    it('should handle finding by non-existent disputeId', async () => {
      await expect(
        service.findByDisputeId('non-existent-uuid'),
      ).rejects.toThrow(DisputeNotFoundError);
    });

    it('should handle empty query results gracefully', async () => {
      const query: QueryDisputesDto = {
        status: DisputeStatus.RESOLVED,
        page: 1,
        limit: 10,
        sortBy: 'createdAt',
        sortOrder: 'DESC',
      };

      const result = await service.findAll(query);

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('should maintain data integrity during failed operations', async () => {
      const initialCount = await dataSource.getRepository(Dispute).count();

      try {
        await service.createDispute(
          {
            agreementId: '99999', // Non-existent
            disputeType: DisputeType.RENT_PAYMENT,
            description: 'Should fail',
          },
          tenantUser.id,
        );
      } catch (_error) {
        // Expected to fail
      }

      const finalCount = await dataSource.getRepository(Dispute).count();
      expect(finalCount).toBe(initialCount);
    });
  });

  describe('Integration: Multi-user dispute scenarios', () => {
    it('lets the tenant open a dispute, the landlord comment, and an admin resolve it', async () => {
      const dispute = await service.createDispute(
        {
          agreementId: testAgreement.id,
          disputeType: DisputeType.RENT_PAYMENT,
          description: 'Tenant reports a missed rent credit',
        },
        tenantUser.id,
      );

      const landlordComment = await service.addComment(
        dispute.disputeId,
        { content: 'Landlord acknowledges the report', isInternal: false },
        landlordUser.id,
      );
      expect(landlordComment.userId).toBe(landlordUser.id);

      await service.update(
        dispute.id,
        { status: DisputeStatus.UNDER_REVIEW },
        adminUser.id,
      );

      const resolved = await service.resolveDispute(
        dispute.disputeId,
        { resolution: 'Credit applied; dispute closed' },
        adminUser.id,
      );

      expect(resolved.status).toBe(DisputeStatus.RESOLVED);
      expect(resolved.initiatedBy).toBe(tenantUser.id);
      expect(resolved.resolvedBy).toBe(adminUser.id);

      const stored = await dataSource.getRepository(Dispute).findOne({
        where: { id: dispute.id },
        relations: ['comments'],
      });
      expect(stored?.status).toBe(DisputeStatus.RESOLVED);
      expect(stored?.comments).toHaveLength(1);
      expect(stored?.comments[0].userId).toBe(landlordUser.id);
    });

    it('rejects a user who is not a party to the agreement', async () => {
      const outsider = await dataSource.getRepository(User).save({
        email: 'outsider@test.com',
        firstName: 'Out',
        lastName: 'Sider',
        role: UserRole.USER,
        isActive: true,
        password: 'hashed_password',
      } as User);

      await expect(
        service.createDispute(
          {
            agreementId: testAgreement.id,
            disputeType: DisputeType.MAINTENANCE,
            description: 'Outsider attempt',
          },
          outsider.id,
        ),
      ).rejects.toThrow(AuthorizationError);
    });
  });

  describe('Integration: Blockchain state alignment', () => {
    it('persists on-chain identifiers when a dispute is raised', async () => {
      const dispute = await service.createDispute(
        {
          agreementId: testAgreement.id,
          disputeType: DisputeType.SECURITY_DEPOSIT,
          description: 'Deposit withheld',
        },
        tenantUser.id,
      );

      await blockchainService.raiseDisputeOnChain(dispute, 'GRAISER');

      const stored = await dataSource.getRepository(Dispute).findOne({
        where: { id: dispute.id },
      });

      expect(disputeContract.raiseDispute).toHaveBeenCalled();
      expect(stored?.transactionHash).toBe('chain-tx-hash');
      expect(stored?.detailsHash).toEqual(expect.any(String));
      expect(stored?.blockchainAgreementId).toBe(testAgreement.id);
      expect(stored?.blockchainSyncedAt).toBeInstanceOf(Date);
    });

    it('aligns local status and vote counts with the chain snapshot', async () => {
      const dispute = await service.createDispute(
        {
          agreementId: testAgreement.id,
          disputeType: DisputeType.PROPERTY_DAMAGE,
          description: 'Damage claim',
        },
        landlordUser.id,
      );

      await blockchainService.raiseDisputeOnChain(dispute, 'GRAISER');

      disputeContract.getDispute.mockResolvedValue({
        agreementId: testAgreement.id,
        detailsHash: 'abc',
        raisedAt: 1,
        resolved: true,
        resolvedAt: 1_700_000_000,
        votesFavorLandlord: 2,
        votesFavorTenant: 1,
        outcome: DisputeOutcome.FAVOR_TENANT,
      });

      await blockchainService.syncDisputeFromChain(dispute.id);

      const stored = await dataSource.getRepository(Dispute).findOne({
        where: { id: dispute.id },
      });

      expect(stored?.status).toBe(DisputeStatus.RESOLVED);
      expect(stored?.votesFavorLandlord).toBe(2);
      expect(stored?.votesFavorTenant).toBe(1);
      expect(stored?.blockchainOutcome).toBe('FavorTenant');
      expect(stored?.resolvedAt).toBeInstanceOf(Date);
      expect(stored?.blockchainSyncedAt).toBeInstanceOf(Date);
    });
  });

  describe('Integration: Dispute state transitions', () => {
    it('walks OPEN to UNDER_REVIEW to RESOLVED and refuses a further change', async () => {
      const dispute = await service.createDispute(
        {
          agreementId: testAgreement.id,
          disputeType: DisputeType.TERMINATION,
          description: 'Early termination',
        },
        tenantUser.id,
      );

      const underReview = await service.update(
        dispute.id,
        { status: DisputeStatus.UNDER_REVIEW },
        adminUser.id,
      );
      expect(underReview.status).toBe(DisputeStatus.UNDER_REVIEW);

      const resolved = await service.resolveDispute(
        dispute.disputeId,
        { resolution: 'Lease ended by agreement' },
        adminUser.id,
      );
      expect(resolved.status).toBe(DisputeStatus.RESOLVED);

      await expect(
        service.update(
          dispute.id,
          { status: DisputeStatus.OPEN },
          adminUser.id,
        ),
      ).rejects.toThrow(BusinessRuleViolationError);

      const stored = await dataSource.getRepository(Dispute).findOne({
        where: { id: dispute.id },
      });
      expect(stored?.status).toBe(DisputeStatus.RESOLVED);
    });
  });
});
