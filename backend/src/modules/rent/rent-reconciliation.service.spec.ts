import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { RentReconciliationService } from './rent-reconciliation.service';
import { RentAgreement } from './entities/rent-contract.entity';
import { Payment, PaymentStatus } from './entities/payment.entity';
import { StellarEscrow } from '../stellar/entities/stellar-escrow.entity';
import { Dispute, DisputeStatus } from '../disputes/entities/dispute.entity';
import { EscrowContractService } from '../stellar/services/escrow-contract.service';

const mockAgreementRepo = {
  findOne: jest.fn(),
};
const mockPaymentRepo = {
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
};
const mockEscrowRepo = {
  findOne: jest.fn(),
};
const mockDisputeRepo = {
  findOne: jest.fn(),
};
const mockEscrowContractService = {
  releaseRent: jest.fn(),
};
const mockConfigService = {
  get: jest.fn((key: string, fallback?: string) => {
    const config: Record<string, string> = {
      STELLAR_NETWORK: 'testnet',
      PROTOCOL_WALLET_ADDRESS: 'GPROTOCOLWALLET',
    };
    return config[key] ?? fallback;
  }),
};

jest.mock('@stellar/stellar-sdk', () => ({
  Horizon: {
    Server: jest.fn().mockImplementation(() => ({
      transactions: jest.fn().mockReturnThis(),
      forAccount: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      cursor: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      call: jest.fn().mockResolvedValue({ records: [] }),
    })),
  },
}));

describe('RentReconciliationService', () => {
  let service: RentReconciliationService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RentReconciliationService,
        { provide: ConfigService, useValue: mockConfigService },
        {
          provide: getRepositoryToken(RentAgreement),
          useValue: mockAgreementRepo,
        },
        { provide: getRepositoryToken(Payment), useValue: mockPaymentRepo },
        {
          provide: getRepositoryToken(StellarEscrow),
          useValue: mockEscrowRepo,
        },
        { provide: getRepositoryToken(Dispute), useValue: mockDisputeRepo },
        { provide: EscrowContractService, useValue: mockEscrowContractService },
      ],
    }).compile();

    service = module.get<RentReconciliationService>(RentReconciliationService);
  });

  describe('reconcile', () => {
    it('returns zero counts when no transactions are found', async () => {
      mockHorizonPage(service, []);

      const result = await service.reconcile();

      expect(result.processed).toBe(0);
      expect(result.verified).toBe(0);
    });

    it('skips transactions with no text memo', async () => {
      const tx = buildTx({ memo_type: 'none', memo: undefined });
      mockHorizonPage(service, [tx]);
      mockPaymentRepo.findOne.mockResolvedValue(null);

      const result = await service.reconcile();

      expect(result.processed).toBe(0);
    });

    it('skips already-processed transactions', async () => {
      const tx = buildTx({ memo_type: 'text', memo: 'agreement-123' });
      mockHorizonPage(service, [tx]);
      mockPaymentRepo.findOne.mockResolvedValue({ id: 'existing-payment' });

      const result = await service.reconcile();

      expect(result.processed).toBe(0);
      expect(mockAgreementRepo.findOne).not.toHaveBeenCalled();
    });
  });

  describe('processTransaction — orphan', () => {
    it('records FAILED payment for unknown agreement IDs', async () => {
      const tx = buildTx({
        memo_type: 'text',
        memo: 'nonexistent-agreement',
        amount: '100',
      });
      mockHorizonPage(service, [tx]);
      mockPaymentRepo.findOne.mockResolvedValue(null);
      mockAgreementRepo.findOne.mockResolvedValue(null);

      mockPaymentRepo.create.mockReturnValue({});
      mockPaymentRepo.save.mockResolvedValue({ id: 'orphan-payment' });

      const result = await service.reconcile();

      expect(result.processed).toBe(1);
      expect(result.orphans).toBe(1);
      expect(result.verified).toBe(0);
      expect(mockPaymentRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ status: PaymentStatus.FAILED }),
      );
    });
  });

  describe('processTransaction — under-payment', () => {
    it('records FAILED payment when amount is below monthly rent', async () => {
      const tx = buildTx({
        memo_type: 'text',
        memo: 'agreement-abc',
        amount: '50', // less than monthlyRent=100
      });
      mockHorizonPage(service, [tx]);
      mockPaymentRepo.findOne.mockResolvedValue(null);
      mockAgreementRepo.findOne.mockResolvedValue(
        buildAgreement({ id: 'agreement-abc', monthlyRent: 100 }),
      );
      mockPaymentRepo.create.mockReturnValue({});
      mockPaymentRepo.save.mockResolvedValue({ id: 'underpay-payment' });

      const result = await service.reconcile();

      expect(result.processed).toBe(1);
      expect(result.underpayments).toBe(1);
      expect(mockPaymentRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ status: PaymentStatus.FAILED }),
      );
    });
  });

  describe('processTransaction — verified', () => {
    it('records VERIFIED payment and releases escrow when no dispute', async () => {
      const tx = buildTx({
        memo_type: 'text',
        memo: 'agreement-abc',
        amount: '100',
      });
      mockHorizonPage(service, [tx]);
      mockPaymentRepo.findOne.mockResolvedValue(null);
      mockAgreementRepo.findOne.mockResolvedValue(
        buildAgreement({ id: 'agreement-abc', monthlyRent: 100 }),
      );
      mockDisputeRepo.findOne.mockResolvedValue(null);
      mockEscrowRepo.findOne.mockResolvedValue({
        blockchainEscrowId: 'abc123',
        rentAgreementId: 'agreement-abc',
      });
      mockEscrowContractService.releaseRent.mockResolvedValue(
        'tx-hash-release',
      );
      mockPaymentRepo.create.mockReturnValue({});
      mockPaymentRepo.save.mockResolvedValue({ id: 'verified-payment' });

      const result = await service.reconcile();

      expect(result.processed).toBe(1);
      expect(result.verified).toBe(1);
      expect(mockPaymentRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ status: PaymentStatus.VERIFIED }),
      );
      expect(mockEscrowContractService.releaseRent).toHaveBeenCalledWith(
        'abc123',
      );
    });

    it('skips escrow release when an active dispute exists', async () => {
      const tx = buildTx({
        memo_type: 'text',
        memo: 'agreement-abc',
        amount: '100',
      });
      mockHorizonPage(service, [tx]);
      mockPaymentRepo.findOne.mockResolvedValue(null);
      mockAgreementRepo.findOne.mockResolvedValue(
        buildAgreement({ id: 'agreement-abc', monthlyRent: 100 }),
      );
      mockDisputeRepo.findOne.mockResolvedValue({
        id: 'dispute-1',
        status: DisputeStatus.OPEN,
      });
      mockPaymentRepo.create.mockReturnValue({});
      mockPaymentRepo.save.mockResolvedValue({ id: 'verified-payment' });

      const result = await service.reconcile();

      expect(result.verified).toBe(1);
      expect(mockEscrowContractService.releaseRent).not.toHaveBeenCalled();
    });

    it('skips escrow release when no on-chain escrow found', async () => {
      const tx = buildTx({
        memo_type: 'text',
        memo: 'agreement-abc',
        amount: '100',
      });
      mockHorizonPage(service, [tx]);
      mockPaymentRepo.findOne.mockResolvedValue(null);
      mockAgreementRepo.findOne.mockResolvedValue(
        buildAgreement({ id: 'agreement-abc', monthlyRent: 100 }),
      );
      mockDisputeRepo.findOne.mockResolvedValue(null);
      mockEscrowRepo.findOne.mockResolvedValue(null);
      mockPaymentRepo.create.mockReturnValue({});
      mockPaymentRepo.save.mockResolvedValue({ id: 'verified-payment' });

      const result = await service.reconcile();

      expect(result.verified).toBe(1);
      expect(mockEscrowContractService.releaseRent).not.toHaveBeenCalled();
    });

    it('still marks payment VERIFIED even if escrow release fails', async () => {
      const tx = buildTx({
        memo_type: 'text',
        memo: 'agreement-abc',
        amount: '100',
      });
      mockHorizonPage(service, [tx]);
      mockPaymentRepo.findOne.mockResolvedValue(null);
      mockAgreementRepo.findOne.mockResolvedValue(
        buildAgreement({ id: 'agreement-abc', monthlyRent: 100 }),
      );
      mockDisputeRepo.findOne.mockResolvedValue(null);
      mockEscrowRepo.findOne.mockResolvedValue({
        blockchainEscrowId: 'abc123',
        rentAgreementId: 'agreement-abc',
      });
      mockEscrowContractService.releaseRent.mockRejectedValue(
        new Error('Contract unavailable'),
      );
      mockPaymentRepo.create.mockReturnValue({});
      mockPaymentRepo.save.mockResolvedValue({ id: 'verified-payment' });

      const result = await service.reconcile();

      expect(result.verified).toBe(1);
      expect(result.errors).toBe(0);
    });
  });

  describe('runReconciliation', () => {
    it('skips when PROTOCOL_WALLET_ADDRESS is not set', async () => {
      mockConfigService.get.mockImplementation((key: string) =>
        key === 'PROTOCOL_WALLET_ADDRESS' ? '' : 'testnet',
      );

      const freshModule = await Test.createTestingModule({
        providers: [
          RentReconciliationService,
          { provide: ConfigService, useValue: mockConfigService },
          {
            provide: getRepositoryToken(RentAgreement),
            useValue: mockAgreementRepo,
          },
          { provide: getRepositoryToken(Payment), useValue: mockPaymentRepo },
          {
            provide: getRepositoryToken(StellarEscrow),
            useValue: mockEscrowRepo,
          },
          { provide: getRepositoryToken(Dispute), useValue: mockDisputeRepo },
          {
            provide: EscrowContractService,
            useValue: mockEscrowContractService,
          },
        ],
      }).compile();

      const freshService = freshModule.get<RentReconciliationService>(
        RentReconciliationService,
      );

      const result = await freshService.runReconciliation();

      expect(result.processed).toBe(0);
    });
  });
});

// ── Helpers ────────────────────────────────────────────────────────────────

function buildTx(overrides: {
  memo_type?: string;
  memo?: string;
  amount?: string;
  hash?: string;
}) {
  const hash =
    overrides.hash ?? 'tx-hash-' + Math.random().toString(36).slice(2);
  return {
    hash,
    paging_token: 'paging-' + hash,
    memo_type: overrides.memo_type ?? 'text',
    memo: overrides.memo,
    operations: jest.fn().mockResolvedValue({
      records: overrides.amount
        ? [
            {
              type: 'payment',
              to: 'GPROTOCOLWALLET',
              asset_type: 'native',
              amount: overrides.amount,
            },
          ]
        : [],
    }),
  };
}

function buildAgreement(overrides: {
  id: string;
  monthlyRent: number;
  agentCommissionRate?: number;
}) {
  return {
    id: overrides.id,
    monthlyRent: overrides.monthlyRent,
    agentCommissionRate: overrides.agentCommissionRate ?? 10,
  };
}

function mockHorizonPage(svc: RentReconciliationService, records: unknown[]) {
  // The module mock returns `this` for every chained method, so the full chain
  // collapses to a single object. Spying on `call` is sufficient.

  jest.spyOn((svc as any).horizonServer, 'call').mockResolvedValue({ records });
}
