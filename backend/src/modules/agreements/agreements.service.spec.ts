import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DataSource } from 'typeorm';
import { AgreementsService } from './agreements.service';
import {
  RentAgreement,
  AgreementStatus,
} from '../rent/entities/rent-contract.entity';
import { Payment } from '../rent/entities/payment.entity';
import {
  StellarEscrow,
  EscrowStatus,
} from '../stellar/entities/stellar-escrow.entity';
import {
  TerminationReconciliation,
  ReconciliationStepStatus,
} from './entities/termination-reconciliation.entity';
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

  const mockEscrowRepo = {
    findOne: jest.fn(),
  };

  const mockTerminationReconciliationRepo = {
    create: jest.fn((x) => ({ ...x })),
    save: jest.fn((x) => Promise.resolve(x)),
    findOne: jest.fn(),
  };

  const mockEscrowIntegrationService = {
    approveEscrowRelease: jest.fn().mockResolvedValue(undefined),
  };

  const mockAuditService = {
    log: jest.fn().mockResolvedValue(undefined),
    logSuccess: jest.fn().mockResolvedValue(undefined),
    logFailure: jest.fn().mockResolvedValue(undefined),
  };

  let mockManager: {
    save: jest.Mock;
    create: jest.Mock;
  };
  const mockDataSource = {
    transaction: jest.fn(async (fn: (manager: unknown) => Promise<unknown>) =>
      fn(mockManager),
    ),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockManager = {
      save: jest.fn((_entity, value) => Promise.resolve(value)),
      create: jest.fn((_entity, value) => value),
    };
    mockEscrowRepo.findOne.mockReset();
    mockTerminationReconciliationRepo.findOne.mockReset();
    mockTerminationReconciliationRepo.save.mockImplementation((x) =>
      Promise.resolve(x),
    );
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
        {
          provide: getRepositoryToken(StellarEscrow),
          useValue: mockEscrowRepo,
        },
        {
          provide: getRepositoryToken(TerminationReconciliation),
          useValue: mockTerminationReconciliationRepo,
        },
        { provide: DataSource, useValue: mockDataSource },
        { provide: AuditService, useValue: mockAuditService },
        { provide: ReviewPromptService, useValue: {} },
        { provide: ChiomaContractService, useValue: {} },
        { provide: AgreementNftService, useValue: mockAgreementNftService },
        { provide: BlockchainSyncService, useValue: {} },
        {
          provide: EscrowIntegrationService,
          useValue: mockEscrowIntegrationService,
        },
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
      mockEscrowRepo.findOne.mockResolvedValue(null);
      mockTerminationReconciliationRepo.findOne.mockResolvedValue({
        agreementId: 'agr-1',
        proratedRentOwed: 0,
        depositRefundStatus: ReconciliationStepStatus.PENDING,
        escrowReleaseStatus: ReconciliationStepStatus.PENDING,
      });

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
      mockEscrowRepo.findOne.mockResolvedValue(null);
      mockTerminationReconciliationRepo.findOne.mockResolvedValue({
        agreementId: 'agr-1',
        proratedRentOwed: 0,
        depositRefundStatus: ReconciliationStepStatus.PENDING,
        escrowReleaseStatus: ReconciliationStepStatus.PENDING,
      });

      const result = await service.terminate('agr-1', {
        terminationReason: 'Mutual agreement',
      });

      expect(result.status).toBe(AgreementStatus.TERMINATED);
    });

    it('creates a reconciliation row via the same transaction as the status save', async () => {
      mockAgreementRepo.findOne.mockResolvedValue({
        ...baseAgreement,
        status: AgreementStatus.ACTIVE,
        monthlyRent: 1000,
        lastPaymentDate: new Date('2026-09-01T00:00:00.000Z'),
      });
      mockEscrowRepo.findOne.mockResolvedValue(null);
      mockTerminationReconciliationRepo.findOne.mockResolvedValue({
        agreementId: 'agr-1',
        proratedRentOwed: 500,
        depositRefundStatus: ReconciliationStepStatus.PENDING,
        escrowReleaseStatus: ReconciliationStepStatus.PENDING,
      });

      await service.terminate('agr-1', {
        terminationReason: 'Mutual agreement',
        terminationDate: '2026-09-16T00:00:00.000Z',
      });

      expect(mockDataSource.transaction).toHaveBeenCalledTimes(1);
      expect(mockManager.save).toHaveBeenCalledWith(
        RentAgreement,
        expect.objectContaining({ status: AgreementStatus.TERMINATED }),
      );
      expect(mockManager.save).toHaveBeenCalledWith(
        TerminationReconciliation,
        expect.objectContaining({
          agreementId: 'agr-1',
          proratedRentOwed: 500,
        }),
      );
    });

    describe('prorated rent calculation', () => {
      it('prorates to exactly half rent at the midpoint of a 30-day period', async () => {
        mockAgreementRepo.findOne.mockResolvedValue({
          ...baseAgreement,
          status: AgreementStatus.ACTIVE,
          monthlyRent: 1000,
          lastPaymentDate: new Date('2026-09-01T00:00:00.000Z'),
        });
        mockEscrowRepo.findOne.mockResolvedValue(null);
        mockTerminationReconciliationRepo.findOne.mockResolvedValue({
          agreementId: 'agr-1',
          proratedRentOwed: 500,
          depositRefundStatus: ReconciliationStepStatus.PENDING,
          escrowReleaseStatus: ReconciliationStepStatus.PENDING,
        });

        await service.terminate('agr-1', {
          terminationReason: 'Mutual agreement',
          // 15 days after Sep 1 = midpoint of a 30-day period
          terminationDate: '2026-09-16T00:00:00.000Z',
        });

        const reconciliationArg = mockManager.save.mock.calls.find(
          (call) => call[0] === TerminationReconciliation,
        )?.[1];
        expect(reconciliationArg.proratedRentOwed).toBe(500);
      });

      it('prorates to near-zero when terminated on day 1 of the period', async () => {
        mockAgreementRepo.findOne.mockResolvedValue({
          ...baseAgreement,
          status: AgreementStatus.ACTIVE,
          monthlyRent: 1000,
          lastPaymentDate: new Date('2026-09-01T00:00:00.000Z'),
        });
        mockEscrowRepo.findOne.mockResolvedValue(null);
        mockTerminationReconciliationRepo.findOne.mockResolvedValue({
          agreementId: 'agr-1',
          proratedRentOwed: 33.33,
          depositRefundStatus: ReconciliationStepStatus.PENDING,
          escrowReleaseStatus: ReconciliationStepStatus.PENDING,
        });

        await service.terminate('agr-1', {
          terminationReason: 'Mutual agreement',
          // 1 day after period start
          terminationDate: '2026-09-02T00:00:00.000Z',
        });

        const reconciliationArg = mockManager.save.mock.calls.find(
          (call) => call[0] === TerminationReconciliation,
        )?.[1];
        expect(reconciliationArg.proratedRentOwed).toBe(33.33);
      });

      it('prorates to near-full rent when terminated on the last day of the period', async () => {
        mockAgreementRepo.findOne.mockResolvedValue({
          ...baseAgreement,
          status: AgreementStatus.ACTIVE,
          monthlyRent: 1000,
          lastPaymentDate: new Date('2026-09-01T00:00:00.000Z'),
        });
        mockEscrowRepo.findOne.mockResolvedValue(null);
        mockTerminationReconciliationRepo.findOne.mockResolvedValue({
          agreementId: 'agr-1',
          proratedRentOwed: 966.67,
          depositRefundStatus: ReconciliationStepStatus.PENDING,
          escrowReleaseStatus: ReconciliationStepStatus.PENDING,
        });

        await service.terminate('agr-1', {
          terminationReason: 'Mutual agreement',
          // 29 days after period start (day 29 of 30)
          terminationDate: '2026-09-30T00:00:00.000Z',
        });

        const reconciliationArg = mockManager.save.mock.calls.find(
          (call) => call[0] === TerminationReconciliation,
        )?.[1];
        expect(reconciliationArg.proratedRentOwed).toBe(966.67);
      });

      it('caps proration at one full month when terminated past a full period', async () => {
        mockAgreementRepo.findOne.mockResolvedValue({
          ...baseAgreement,
          status: AgreementStatus.ACTIVE,
          monthlyRent: 1000,
          lastPaymentDate: new Date('2026-08-01T00:00:00.000Z'),
        });
        mockEscrowRepo.findOne.mockResolvedValue(null);
        mockTerminationReconciliationRepo.findOne.mockResolvedValue({
          agreementId: 'agr-1',
          proratedRentOwed: 1000,
          depositRefundStatus: ReconciliationStepStatus.PENDING,
          escrowReleaseStatus: ReconciliationStepStatus.PENDING,
        });

        await service.terminate('agr-1', {
          terminationReason: 'Mutual agreement',
          // 45 days after period start — past a full 30-day period
          terminationDate: '2026-09-15T00:00:00.000Z',
        });

        const reconciliationArg = mockManager.save.mock.calls.find(
          (call) => call[0] === TerminationReconciliation,
        )?.[1];
        expect(reconciliationArg.proratedRentOwed).toBe(1000);
      });
    });

    describe('reconciliation: no escrow ever created', () => {
      it('marks both sub-steps not_applicable and reports overall success', async () => {
        mockAgreementRepo.findOne.mockResolvedValue({
          ...baseAgreement,
          status: AgreementStatus.ACTIVE,
        });
        mockEscrowRepo.findOne.mockResolvedValue(null);
        const reconciliationRow = {
          agreementId: 'agr-1',
          proratedRentOwed: 0,
          depositRefundStatus: ReconciliationStepStatus.PENDING,
          escrowReleaseStatus: ReconciliationStepStatus.PENDING,
        };
        mockTerminationReconciliationRepo.findOne.mockResolvedValue(
          reconciliationRow,
        );

        await service.terminate('agr-1', {
          terminationReason: 'Mutual agreement',
        });

        expect(mockTerminationReconciliationRepo.save).toHaveBeenCalledWith(
          expect.objectContaining({
            depositRefundStatus: ReconciliationStepStatus.NOT_APPLICABLE,
            escrowReleaseStatus: ReconciliationStepStatus.NOT_APPLICABLE,
          }),
        );
        expect(
          mockEscrowIntegrationService.approveEscrowRelease,
        ).not.toHaveBeenCalled();
        expect(mockAuditService.logSuccess).toHaveBeenCalled();
        expect(mockAuditService.logFailure).not.toHaveBeenCalled();
      });
    });

    describe('reconciliation: full success path', () => {
      it('releases escrow, records the deposit refund as succeeded, and logs success', async () => {
        mockAgreementRepo.findOne.mockResolvedValue({
          ...baseAgreement,
          status: AgreementStatus.ACTIVE,
          userStellarPubKey: 'G' + 'T'.repeat(55),
        });
        mockEscrowRepo.findOne.mockResolvedValue({
          id: 42,
          rentAgreementId: 'agr-1',
          status: EscrowStatus.FUNDED,
          approvalCount: 1,
        });
        const reconciliationRow = {
          agreementId: 'agr-1',
          proratedRentOwed: 0,
          depositRefundStatus: ReconciliationStepStatus.PENDING,
          escrowReleaseStatus: ReconciliationStepStatus.PENDING,
        };
        mockTerminationReconciliationRepo.findOne.mockResolvedValue(
          reconciliationRow,
        );

        const result = await service.terminate('agr-1', {
          terminationReason: 'Mutual agreement',
        });

        expect(result.status).toBe(AgreementStatus.TERMINATED);
        expect(
          mockEscrowIntegrationService.approveEscrowRelease,
        ).toHaveBeenCalledWith(42, expect.any(String));
        expect(mockTerminationReconciliationRepo.save).toHaveBeenCalledWith(
          expect.objectContaining({
            escrowReleaseStatus: ReconciliationStepStatus.SUCCEEDED,
            depositRefundStatus: ReconciliationStepStatus.SUCCEEDED,
          }),
        );
        expect(mockAuditService.logSuccess).toHaveBeenCalled();
        expect(mockAuditService.logFailure).not.toHaveBeenCalled();
      });
    });

    describe('reconciliation: partial failure', () => {
      it('records escrow release failure while agreement is still TERMINATED, and logs failure', async () => {
        mockAgreementRepo.findOne.mockResolvedValue({
          ...baseAgreement,
          status: AgreementStatus.ACTIVE,
          userStellarPubKey: 'G' + 'T'.repeat(55),
        });
        mockEscrowRepo.findOne.mockResolvedValue({
          id: 42,
          rentAgreementId: 'agr-1',
          status: EscrowStatus.FUNDED,
          approvalCount: 1,
        });
        mockEscrowIntegrationService.approveEscrowRelease.mockRejectedValueOnce(
          new Error('Escrow not found or not on-chain'),
        );
        const reconciliationRow = {
          agreementId: 'agr-1',
          proratedRentOwed: 0,
          depositRefundStatus: ReconciliationStepStatus.PENDING,
          escrowReleaseStatus: ReconciliationStepStatus.PENDING,
        };
        mockTerminationReconciliationRepo.findOne.mockResolvedValue(
          reconciliationRow,
        );

        const result = await service.terminate('agr-1', {
          terminationReason: 'Mutual agreement',
        });

        // Status transition is not blocked by reconciliation failure.
        expect(result.status).toBe(AgreementStatus.TERMINATED);
        expect(mockTerminationReconciliationRepo.save).toHaveBeenCalledWith(
          expect.objectContaining({
            escrowReleaseStatus: ReconciliationStepStatus.FAILED,
            escrowReleaseError: 'Escrow not found or not on-chain',
            depositRefundStatus: ReconciliationStepStatus.FAILED,
          }),
        );
        expect(mockAuditService.logFailure).toHaveBeenCalledWith(
          expect.anything(),
          'TerminationReconciliation',
          'agr-1',
          expect.stringContaining('partial failure'),
          undefined,
          expect.objectContaining({
            escrowReleaseStatus: ReconciliationStepStatus.FAILED,
          }),
        );
        expect(mockAuditService.logSuccess).not.toHaveBeenCalled();
      });
    });
  });

  describe('retryTerminationReconciliation', () => {
    it('re-attempts only the failed sub-step and does not redundantly re-release an already-succeeded one', async () => {
      mockAgreementRepo.findOne.mockResolvedValue({
        ...baseAgreement,
        status: AgreementStatus.TERMINATED,
        userStellarPubKey: 'G' + 'T'.repeat(55),
      });
      mockEscrowRepo.findOne.mockResolvedValue({
        id: 42,
        rentAgreementId: 'agr-1',
        status: EscrowStatus.FUNDED,
        approvalCount: 1,
      });
      // Escrow release already succeeded on a prior attempt; deposit refund
      // previously failed and is now being retried.
      const existingRow = {
        agreementId: 'agr-1',
        proratedRentOwed: 500,
        depositRefundStatus: ReconciliationStepStatus.FAILED,
        depositRefundError: 'previous failure',
        escrowReleaseStatus: ReconciliationStepStatus.SUCCEEDED,
        escrowReleaseError: null,
      };
      mockTerminationReconciliationRepo.findOne.mockResolvedValue(existingRow);

      await service.retryTerminationReconciliation('agr-1');

      // Already-succeeded escrow release must not be re-attempted.
      expect(
        mockEscrowIntegrationService.approveEscrowRelease,
      ).not.toHaveBeenCalled();
      expect(mockTerminationReconciliationRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          escrowReleaseStatus: ReconciliationStepStatus.SUCCEEDED,
          depositRefundStatus: ReconciliationStepStatus.SUCCEEDED,
        }),
      );
    });

    it('does nothing when no reconciliation record exists for the agreement', async () => {
      mockTerminationReconciliationRepo.findOne.mockResolvedValue(null);

      await service.retryTerminationReconciliation('agr-missing');

      expect(
        mockEscrowIntegrationService.approveEscrowRelease,
      ).not.toHaveBeenCalled();
      expect(mockTerminationReconciliationRepo.save).not.toHaveBeenCalled();
    });
  });
});
