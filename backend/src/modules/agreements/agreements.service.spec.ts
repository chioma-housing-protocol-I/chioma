import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AgreementsService } from './agreements.service';
import {
  RentAgreement,
  AgreementStatus,
} from '../rent/entities/rent-contract.entity';
import { Payment } from '../rent/entities/payment.entity';
import { AuditService } from '../audit/audit.service';
import { ReviewPromptService } from '../reviews/review-prompt.service';
import { ChiomaContractService } from '../stellar/services/chioma-contract.service';
import { AgreementNftService } from './agreement-nft.service';
import { BlockchainSyncService } from './blockchain-sync.service';
import { EscrowIntegrationService } from './escrow-integration.service';
import { TemplateRenderingService } from './template-rendering.service';
import { PDFGenerationService } from './pdf-generation.service';
import { LockService } from '../../common/lock';
import { IdempotencyService } from '../../common/idempotency';
import { AgreementStateService } from './state-machines/agreement-state-machine.service';

describe('AgreementsService (lease extensions)', () => {
  let service: AgreementsService;
  let mockIdempotencyService: {
    retrieve: jest.Mock;
    store: jest.Mock;
    process: jest.Mock;
  };

  const baseAgreement = {
    id: 'agr-1',
    agreementNumber: 'CHIOMA-2026-0001',
    propertyId: 'p1',
    landlordId: 'l1',
    tenantId: 't1',
    agentId: '',
    landlordStellarPubKey: 'G' + 'A'.repeat(55),
    tenantStellarPubKey: 'G' + 'B'.repeat(55),
    agentStellarPubKey: null,
    escrowAccountPubKey: null,
    monthlyRent: 1000,
    securityDeposit: 2000,
    agentCommissionRate: 10,
    escrowBalance: 0,
    totalPaid: 0,
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-12-31'),
    renewalOption: true,
    renewalNoticeDate: null,
    moveInDate: null,
    moveOutDate: null,
    utilitiesIncluded: null,
    maintenanceResponsibility: null,
    earlyTerminationFee: 500,
    lateFeePercentage: 5,
    gracePeriodDays: 5,
    lastPaymentDate: null,
    termsAndConditions: '',
    status: AgreementStatus.ACTIVE,
    terminationDate: null,
    terminationReason: null,
    blockchainAgreementId: null,
    onChainStatus: null,
    transactionHash: null,
    blockchainSyncedAt: null,
    paymentSplitConfig: null,
    payments: [],
    rentObligationNfts: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  } as unknown as RentAgreement;

  const mockAgreementRepo = {
    create: jest.fn((x) => x),
    save: jest.fn(),
    findOne: jest.fn(),
    findAndCount: jest.fn(),
    count: jest.fn().mockResolvedValue(0),
    remove: jest.fn(),
  };

  const mockPaymentRepo = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
  };

  const mockAgreementNftService = {
    burnNftForAgreement: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockIdempotencyService = {
      retrieve: jest.fn().mockResolvedValue(null),
      store: jest.fn().mockResolvedValue(undefined),
      process: jest.fn(
        async (key: string, ttlMs: number, fn: () => Promise<unknown>) => {
          const existing = await mockIdempotencyService.retrieve(key);
          if (existing !== null) return existing;
          const result = await fn();
          await mockIdempotencyService.store(key, result, ttlMs);
          return result;
        },
      ),
    };
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
        { provide: AgreementNftService, useValue: mockAgreementNftService },
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
              async (
                _key: string,
                _ttlMs: number,
                fn: () => Promise<unknown>,
              ) => fn(),
            ),
          },
        },
        {
          provide: IdempotencyService,
          useFactory: () => mockIdempotencyService,
        },
        {
          provide: AgreementStateService,
          useValue: {
            validateTransition: jest.fn(),
            getAvailableTransitions: jest.fn().mockReturnValue([]),
            transition: jest.fn(),
          },
        },
        { provide: EventEmitter2, useValue: { emit: jest.fn() } },
      ],
    }).compile();

    service = module.get(AgreementsService);
  });

  describe('renew', () => {
    it('extends end date when renewalOption is true', async () => {
      mockAgreementRepo.findOne.mockResolvedValue({ ...baseAgreement });
      mockAgreementRepo.save.mockImplementation((a) => Promise.resolve(a));

      const result = await service.renew('agr-1', { extendMonths: 6 });

      expect(result.endDate).toBeInstanceOf(Date);
      const expected = new Date('2024-12-31');
      expected.setMonth(expected.getMonth() + 6);
      expect((result.endDate as Date).getTime()).toBe(expected.getTime());
    });

    it('throws when renewalOption is false', async () => {
      mockAgreementRepo.findOne.mockResolvedValue({
        ...baseAgreement,
        renewalOption: false,
      });

      await expect(service.renew('agr-1', {})).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws when renewalOption is unset', async () => {
      mockAgreementRepo.findOne.mockResolvedValue({
        ...baseAgreement,
        renewalOption: null,
      });

      await expect(service.renew('agr-1', {})).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getFees', () => {
    it('returns fee configuration', async () => {
      mockAgreementRepo.findOne.mockResolvedValue({ ...baseAgreement });

      const result = await service.getFees('agr-1');

      expect(result.agreementId).toBe('agr-1');
      expect(result.earlyTerminationFee).toBe(500);
      expect(result.lateFeePercentage).toBe(5);
      expect(result.gracePeriodDays).toBe(5);
      expect(result.lateFeeEstimated).toBeNull();
    });

    it('estimates zero late fee inside grace period', async () => {
      mockAgreementRepo.findOne.mockResolvedValue({ ...baseAgreement });

      const result = await service.getFees('agr-1', 3);

      expect(result.lateFeeEstimated).toBe(0);
    });

    it('estimates late fee after grace', async () => {
      mockAgreementRepo.findOne.mockResolvedValue({ ...baseAgreement });

      const result = await service.getFees('agr-1', 10);

      expect(result.lateFeeEstimated).toBe(50);
    });
  });

  describe('findOne', () => {
    it('throws when missing', async () => {
      mockAgreementRepo.findOne.mockResolvedValue(null);
      await expect(service.findOne('x')).rejects.toThrow(NotFoundException);
    });
  });

  describe('sign', () => {
    it('transitions the agreement to SIGNED', async () => {
      mockAgreementRepo.findOne.mockResolvedValue({
        ...baseAgreement,
        status: AgreementStatus.PENDING_DEPOSIT,
      });
      mockAgreementRepo.save.mockImplementation((a) => Promise.resolve(a));

      const result = await service.sign('agr-1', {});

      expect(result.status).toBe(AgreementStatus.SIGNED);
    });

    it('returns the original result for a repeated idempotency key without re-signing', async () => {
      mockAgreementRepo.findOne.mockResolvedValue({
        ...baseAgreement,
        status: AgreementStatus.PENDING_DEPOSIT,
      });
      mockAgreementRepo.save.mockImplementation((a) => Promise.resolve(a));

      const dto = { idempotencyKey: 'retry-key-1' };
      const first = await service.sign('agr-1', dto);

      mockIdempotencyService.retrieve.mockResolvedValue(first);

      const second = await service.sign('agr-1', dto);

      expect(second).toEqual(first);
      expect(mockAgreementRepo.save).toHaveBeenCalledTimes(1);
    });
  });

  describe('terminate', () => {
    it('transitions the agreement to TERMINATED and burns the NFT obligation', async () => {
      mockAgreementRepo.findOne.mockResolvedValue({
        ...baseAgreement,
        status: AgreementStatus.ACTIVE,
      });
      mockAgreementRepo.save.mockImplementation((a) => Promise.resolve(a));

      const result = await service.terminate('agr-1', {
        terminationReason: 'Mutual agreement',
      });

      expect(result.status).toBe(AgreementStatus.TERMINATED);
      expect(mockAgreementNftService.burnNftForAgreement).toHaveBeenCalledWith(
        'agr-1',
        'AgreementTerminated',
      );
    });

    it('still returns the terminated agreement when burning the NFT fails', async () => {
      mockAgreementRepo.findOne.mockResolvedValue({
        ...baseAgreement,
        status: AgreementStatus.ACTIVE,
      });
      mockAgreementRepo.save.mockImplementation((a) => Promise.resolve(a));
      mockAgreementNftService.burnNftForAgreement.mockRejectedValueOnce(
        new Error('NFT not found for agreement agr-1'),
      );

      const result = await service.terminate('agr-1', {
        terminationReason: 'Mutual agreement',
      });

      expect(result.status).toBe(AgreementStatus.TERMINATED);
    });
  });
});
