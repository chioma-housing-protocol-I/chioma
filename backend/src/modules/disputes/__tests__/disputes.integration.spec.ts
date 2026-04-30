import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { DisputesService } from '../disputes.service';
import { DisputesModule } from '../disputes.module';
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
import { CreateDisputeDto } from '../dto/create-dispute.dto';
import { AddCommentDto } from '../dto/add-comment.dto';
import { ResolveDisputeDto } from '../dto/resolve-dispute.dto';
import { QueryDisputesDto } from '../dto/query-disputes.dto';
import { UpdateDisputeDto } from '../dto/update-dispute.dto';
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { AuditModule } from '../../audit/audit.module';
import { AuditLog } from '../../audit/entities/audit-log.entity';
import { LockService } from '../../../common/lock';
import { IdempotencyService } from '../../../common/idempotency';
import { CacheModule } from '@nestjs/cache-manager';

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
  let dataSource: DataSource;
  let landlordUser: User;
  let tenantUser: User;
  let adminUser: User;
  let testAgreement: RentAgreement;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          entities: [
            Dispute,
            DisputeEvidence,
            DisputeComment,
            RentAgreement,
            User,
            AuditLog,
          ],
          synchronize: true,
          dropSchema: true,
        }),
        TypeOrmModule.forFeature([
          Dispute,
          DisputeEvidence,
          DisputeComment,
          RentAgreement,
          User,
        ]),
        CacheModule.register(),
        AuditModule,
      ],
      providers: [
        DisputesService,
        {
          provide: LockService,
          useValue: {
            acquire: jest.fn().mockResolvedValue(true),
            release: jest.fn().mockResolvedValue(true),
          },
        },
        {
          provide: IdempotencyService,
          useValue: {
            check: jest.fn().mockResolvedValue(null),
            store: jest.fn().mockResolvedValue(true),
          },
        },
      ],
    }).compile();

    service = module.get<DisputesService>(DisputesService);
    dataSource = module.get<DataSource>(DataSource);

    // Setup test data
    await setupTestData();
  });

  afterAll(async () => {
    if (dataSource && dataSource.isInitialized) {
      await dataSource.destroy();
    }
    if (module) {
      await module.close();
    }
  });

  afterEach(async () => {
    // Clean up disputes after each test
    if (dataSource && dataSource.isInitialized) {
      await dataSource.getRepository(DisputeComment).delete({});
      await dataSource.getRepository(DisputeEvidence).delete({});
      await dataSource.getRepository(Dispute).delete({});
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
      expect(dispute.requestedAmount).toBe(500);
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
      ).rejects.toThrow(BadRequestException);
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
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject dispute for non-existent agreement', async () => {
      const createDto: CreateDisputeDto = {
        agreementId: '99999',
        disputeType: DisputeType.RENT_PAYMENT,
        description: 'Dispute for non-existent agreement',
      };

      await expect(
        service.createDispute(createDto, tenantUser.id),
      ).rejects.toThrow(NotFoundException);
    });

    it('should handle transaction rollback on error', async () => {
      const createDto: CreateDisputeDto = {
        agreementId: testAgreement.id,
        disputeType: DisputeType.RENT_PAYMENT,
        description: 'Test transaction rollback',
      };

      // Mock a database error during save
      const disputeRepo = dataSource.getRepository(Dispute);
      const originalSave = disputeRepo.save;
      jest
        .spyOn(disputeRepo, 'save')
        .mockRejectedValueOnce(new Error('Database error'));

      await expect(
        service.createDispute(createDto, tenantUser.id),
      ).rejects.toThrow();

      // Verify agreement status was not changed
      const agreement = await dataSource
        .getRepository(RentAgreement)
        .findOne({ where: { id: testAgreement.id } });
      expect(agreement?.status).toBe(AgreementStatus.ACTIVE);

      // Restore original method
      disputeRepo.save = originalSave;
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

      expect(result.disputes).toBeDefined();
      expect(result.total).toBeGreaterThan(0);
      expect(result.disputes.length).toBeLessThanOrEqual(10);
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

      expect(
        result.disputes.every((d) => d.status === DisputeStatus.OPEN),
      ).toBe(true);
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
        result.disputes.every(
          (d) => d.disputeType === DisputeType.RENT_PAYMENT,
        ),
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
        result.disputes.every(
          (d) => d.agreementId.toString() === testAgreement.id,
        ),
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

      expect(result.disputes[0].agreement).toBeDefined();
      expect(result.disputes[0].initiator).toBeDefined();
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
        size: 1024 * 500, // 500KB
        path: '/uploads/evidence.pdf',
      };

      const evidence = await service.addEvidence(
        testDispute.disputeId,
        mockFile,
        tenantUser.id,
        { fileName: 'evidence.pdf', fileType: 'application/pdf', description: 'Photo evidence of damage' },
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
        size: 1024,
        path: '/uploads/malicious.exe',
      };

      await expect(
        service.addEvidence(testDispute.disputeId, mockFile, tenantUser.id),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject files exceeding size limit', async () => {
      const mockFile = {
        originalname: 'large.pdf',
        mimetype: 'application/pdf',
        size: 11 * 1024 * 1024, // 11MB
        path: '/uploads/large.pdf',
      };

      await expect(
        service.addEvidence(testDispute.disputeId, mockFile, tenantUser.id),
      ).rejects.toThrow(BadRequestException);
    });

    it('should allow multiple evidence uploads', async () => {
      const mockFile1 = {
        originalname: 'evidence1.jpg',
        mimetype: 'image/jpeg',
        size: 1024 * 100,
        path: '/uploads/evidence1.jpg',
      };

      const mockFile2 = {
        originalname: 'evidence2.pdf',
        mimetype: 'application/pdf',
        size: 1024 * 200,
        path: '/uploads/evidence2.pdf',
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
      ).rejects.toThrow(ForbiddenException);
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
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject resolution of dispute not under review', async () => {
      // Create new dispute in OPEN status
      const openDispute = await service.createDispute(
        {
          agreementId: testAgreement.id,
          disputeType: DisputeType.OTHER,
          description: 'Open dispute',
        },
        tenantUser.id,
      );

      // Reset agreement status
      await dataSource
        .getRepository(RentAgreement)
        .update(testAgreement.id, { status: AgreementStatus.DISPUTED });

      const resolveDto: ResolveDisputeDto = {
        resolution: 'Trying to resolve open dispute',
      };

      await expect(
        service.resolveDispute(openDispute.disputeId, resolveDto, adminUser.id),
      ).rejects.toThrow(BadRequestException);
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
      ).rejects.toThrow(BadRequestException);
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
      await service.createDispute(
        {
          agreementId: testAgreement.id,
          disputeType: DisputeType.RENT_PAYMENT,
          description: 'First dispute',
        },
        tenantUser.id,
      );

      // Reset for second dispute
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
      const disputes = await service.getAgreementDisputes(
        testAgreement.id,
        tenantUser.id,
      );

      expect(disputes.length).toBeGreaterThanOrEqual(2);
      expect(
        disputes.every((d) => d.agreementId.toString() === testAgreement.id),
      ).toBe(true);
    });

    it('should order disputes by creation date descending', async () => {
      const disputes = await service.getAgreementDisputes(
        testAgreement.id,
        tenantUser.id,
      );

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
      ).rejects.toThrow(ForbiddenException);
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
      await expect(service.findOne(99999)).rejects.toThrow(NotFoundException);
    });

    it('should handle finding by non-existent disputeId', async () => {
      await expect(
        service.findByDisputeId('non-existent-uuid'),
      ).rejects.toThrow(NotFoundException);
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

      expect(result.disputes).toEqual([]);
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
      } catch (error) {
        // Expected to fail
      }

      const finalCount = await dataSource.getRepository(Dispute).count();
      expect(finalCount).toBe(initialCount);
    });
  });
});
