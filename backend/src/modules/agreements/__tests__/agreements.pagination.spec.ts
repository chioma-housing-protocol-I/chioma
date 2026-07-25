import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AgreementsService } from '../agreements.service';
import {
  RentAgreement,
  AgreementStatus,
} from '../../rent/entities/rent-contract.entity';
import { Payment } from '../../rent/entities/payment.entity';
import { AuditService } from '../../audit/audit.service';
import { ReviewPromptService } from '../../reviews/review-prompt.service';
import { ChiomaContractService } from '../../stellar/services/chioma-contract.service';
import { BlockchainSyncService } from '../blockchain-sync.service';
import { EscrowIntegrationService } from '../escrow-integration.service';
import { TemplateRenderingService } from '../template-rendering.service';
import { PDFGenerationService } from '../pdf-generation.service';
import { LockService } from '../../../common/lock';
import { IdempotencyService } from '../../../common/idempotency';
import { AgreementStateService } from '../state-machines/agreement-state-machine.service';

describe('AgreementsService – Pagination', () => {
  let service: AgreementsService;

  const mockAgreementRepo = {
    create: jest.fn((x) => x),
    save: jest.fn(),
    findOne: jest.fn(),
    findAndCount: jest.fn(),
    count: jest.fn().mockResolvedValue(0),
  };

  const mockPaymentRepo = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AgreementsService,
        {
          provide: getRepositoryToken(RentAgreement),
          useValue: mockAgreementRepo,
        },
        { provide: getRepositoryToken(Payment), useValue: mockPaymentRepo },
        { provide: AuditService, useValue: {} },
        { provide: ReviewPromptService, useValue: {} },
        { provide: ChiomaContractService, useValue: {} },
        { provide: BlockchainSyncService, useValue: {} },
        { provide: EscrowIntegrationService, useValue: {} },
        { provide: TemplateRenderingService, useValue: { render: jest.fn() } },
        {
          provide: PDFGenerationService,
          useValue: { generateAgreement: jest.fn() },
        },
        {
          provide: LockService,
          useValue: {
            withLock: jest.fn(
              async (_k: string, _t: number, fn: () => Promise<unknown>) =>
                fn(),
            ),
          },
        },
        {
          provide: IdempotencyService,
          useValue: { get: jest.fn().mockResolvedValue(null), set: jest.fn() },
        },
        {
          provide: AgreementStateService,
          useValue: {
            validateTransition: jest.fn(),
            getAvailableTransitions: jest.fn().mockReturnValue([]),
            transition: jest.fn(),
          },
        },
        { provide: EventEmitter2, useValue: {} },
      ],
    }).compile();
    service = module.get(AgreementsService);
  });

  describe('offset pagination', () => {
    it('returns data and total on page 1', async () => {
      mockAgreementRepo.findAndCount.mockResolvedValue([
        [{ id: 'a1' }, { id: 'a2' }],
        20,
      ]);

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(20);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });

    it('applies correct skip for page 2', async () => {
      mockAgreementRepo.findAndCount.mockResolvedValue([[], 50]);

      await service.findAll({ page: 2, limit: 10 });

      expect(mockAgreementRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 10 }),
      );
    });

    it('applies correct skip for page 3 with limit 5', async () => {
      mockAgreementRepo.findAndCount.mockResolvedValue([[], 30]);

      await service.findAll({ page: 3, limit: 5 });

      expect(mockAgreementRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 5 }),
      );
    });

    it('defaults to page=1 and limit=10', async () => {
      mockAgreementRepo.findAndCount.mockResolvedValue([[], 0]);

      await service.findAll({});

      expect(mockAgreementRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 10 }),
      );
    });

    it('returns empty data when total is 0', async () => {
      mockAgreementRepo.findAndCount.mockResolvedValue([[], 0]);

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe('filtering', () => {
    it('filters by status', async () => {
      mockAgreementRepo.findAndCount.mockResolvedValue([[], 0]);

      await service.findAll({ status: AgreementStatus.ACTIVE });

      expect(mockAgreementRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: AgreementStatus.ACTIVE }),
        }),
      );
    });

    it('filters by landlordId', async () => {
      mockAgreementRepo.findAndCount.mockResolvedValue([[], 0]);

      await service.findAll({ landlordId: 'landlord-1' });

      expect(mockAgreementRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ landlordId: 'landlord-1' }),
        }),
      );
    });

    it('filters by tenantId', async () => {
      mockAgreementRepo.findAndCount.mockResolvedValue([[], 0]);

      await service.findAll({ tenantId: 'tenant-1' });

      expect(mockAgreementRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ userId: 'tenant-1' }),
        }),
      );
    });

    it('filters by propertyId', async () => {
      mockAgreementRepo.findAndCount.mockResolvedValue([[], 0]);

      await service.findAll({ propertyId: 'prop-1' });

      expect(mockAgreementRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ propertyId: 'prop-1' }),
        }),
      );
    });

    it('combines multiple filters', async () => {
      mockAgreementRepo.findAndCount.mockResolvedValue([[], 0]);

      await service.findAll({
        status: AgreementStatus.ACTIVE,
        landlordId: 'l-1',
        tenantId: 't-1',
      });

      expect(mockAgreementRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: AgreementStatus.ACTIVE,
            landlordId: 'l-1',
            userId: 't-1',
          }),
        }),
      );
    });

    it('omits undefined filters from where clause', async () => {
      mockAgreementRepo.findAndCount.mockResolvedValue([[], 0]);

      await service.findAll({ status: undefined, landlordId: undefined });

      const call = mockAgreementRepo.findAndCount.mock.calls[0][0];
      expect(call.where).not.toHaveProperty('status');
      expect(call.where).not.toHaveProperty('landlordId');
    });
  });

  describe('sorting', () => {
    it('sorts by createdAt DESC by default', async () => {
      mockAgreementRepo.findAndCount.mockResolvedValue([[], 0]);

      await service.findAll({});

      expect(mockAgreementRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ order: { createdAt: 'DESC' } }),
      );
    });

    it('sorts by startDate ASC', async () => {
      mockAgreementRepo.findAndCount.mockResolvedValue([[], 0]);

      await service.findAll({ sortBy: 'startDate', sortOrder: 'ASC' });

      expect(mockAgreementRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ order: { startDate: 'ASC' } }),
      );
    });

    it('sorts by monthlyRent DESC', async () => {
      mockAgreementRepo.findAndCount.mockResolvedValue([[], 0]);

      await service.findAll({ sortBy: 'monthlyRent', sortOrder: 'DESC' });

      expect(mockAgreementRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ order: { monthlyRent: 'DESC' } }),
      );
    });
  });

  describe('performance', () => {
    it('calls findAndCount exactly once per findAll', async () => {
      mockAgreementRepo.findAndCount.mockResolvedValue([[], 0]);

      await service.findAll({ page: 1, limit: 10 });

      expect(mockAgreementRepo.findAndCount).toHaveBeenCalledTimes(1);
    });
  });
});
