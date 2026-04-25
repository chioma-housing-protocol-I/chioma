import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { NotFoundException } from '@nestjs/common';
import { StellarService } from '../services/stellar.service';
import { EncryptionService } from '../services/encryption.service';
import {
  StellarAccount,
  StellarAccountType,
} from '../entities/stellar-account.entity';
import {
  StellarTransaction,
  TransactionStatus,
} from '../entities/stellar-transaction.entity';
import { StellarEscrow, EscrowStatus } from '../entities/stellar-escrow.entity';

// ── Stellar SDK mock ──────────────────────────────────────────────────────────

jest.mock('@stellar/stellar-sdk', () => ({
  Keypair: {
    random: jest.fn(() => ({
      publicKey: () =>
        'GABCDEFGHIJKLMNOPQRSTUVWXYZ234567ABCDEFGHIJKLMNOPQRSTUV',
      secret: () => 'SABCDEFGHIJKLMNOPQRSTUVWXYZ234567ABCDEFGHIJKLMNOPQRSTUV',
    })),
    fromSecret: jest.fn(() => ({
      publicKey: () =>
        'GABCDEFGHIJKLMNOPQRSTUVWXYZ234567ABCDEFGHIJKLMNOPQRSTUV',
      sign: jest.fn(),
    })),
  },
  Horizon: {
    Server: jest.fn().mockImplementation(() => ({
      loadAccount: jest.fn().mockResolvedValue({
        accountId: () =>
          'GABCDEFGHIJKLMNOPQRSTUVWXYZ234567ABCDEFGHIJKLMNOPQRSTUV',
        sequenceNumber: () => '123456789',
        balances: [{ asset_type: 'native', balance: '100.0000000' }],
        subentry_count: 0,
        thresholds: {},
        signers: [],
        flags: {},
      }),
      submitTransaction: jest
        .fn()
        .mockResolvedValue({ hash: 'txhash123', ledger: 12345 }),
    })),
  },
  Asset: { native: jest.fn(() => ({ code: 'XLM', issuer: null })) },
  Networks: {
    TESTNET: 'Test SDF Network ; September 2015',
    PUBLIC: 'Public Global Stellar Network ; September 2015',
  },
  TransactionBuilder: jest.fn().mockImplementation(() => ({
    addOperation: jest.fn().mockReturnThis(),
    addMemo: jest.fn().mockReturnThis(),
    setTimeout: jest.fn().mockReturnThis(),
    build: jest.fn().mockReturnValue({
      sign: jest.fn(),
      hash: () => Buffer.from('transaction-hash'),
      toEnvelope: jest
        .fn()
        .mockReturnValue({ toXDR: jest.fn().mockReturnValue('xdr') }),
    }),
  })),
  Operation: {
    payment: jest.fn(() => ({})),
    createAccount: jest.fn(() => ({})),
    accountMerge: jest.fn(() => ({})),
    setOptions: jest.fn(() => ({})),
    changeTrust: jest.fn(() => ({})),
  },
  Memo: {
    text: jest.fn((t) => ({ type: 'text', value: t })),
    id: jest.fn((i) => ({ type: 'id', value: i })),
    hash: jest.fn((h) => ({ type: 'hash', value: h })),
    return: jest.fn((r) => ({ type: 'return', value: r })),
  },
}));

describe('StellarService — comprehensive coverage', () => {
  let service: StellarService;

  const PUBLIC_KEY = 'GABCDEFGHIJKLMNOPQRSTUVWXYZ234567ABCDEFGHIJKLMNOPQRSTUV';

  const mockAccount: StellarAccount = {
    id: 1,
    userId: 'user-1',
    publicKey: PUBLIC_KEY,
    encryptedSecret: 'encrypted-secret',
    accountType: StellarAccountType.USER,
    isActive: true,
    xlmBalance: '100.0000000',
    createdAt: new Date(),
    updatedAt: new Date(),
  } as StellarAccount;

  const mockTransaction: StellarTransaction = {
    id: 1,
    hash: 'txhash123',
    fromAccountId: 1,
    toAccountId: 2,
    amount: '10.0000000',
    assetCode: 'XLM',
    status: TransactionStatus.COMPLETED,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as StellarTransaction;

  const mockEscrow: StellarEscrow = {
    id: 1,
    agreementId: 'agreement-1',
    buyerAccountId: 1,
    escrowAccountId: 2,
    amount: '50.0000000',
    assetCode: 'XLM',
    status: EscrowStatus.FUNDED,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as StellarEscrow;

  const mockQueryRunner = {
    connect: jest.fn(),
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(),
    release: jest.fn(),
    manager: {
      save: jest
        .fn()
        .mockImplementation((entity) => Promise.resolve({ ...entity, id: 1 })),
    },
  };

  const mockAccountRepository = {
    create: jest.fn().mockImplementation((dto) => dto),
    save: jest.fn().mockImplementation((e) => Promise.resolve({ ...e, id: 1 })),
    findOne: jest.fn(),
    find: jest.fn().mockResolvedValue([]),
    createQueryBuilder: jest.fn().mockReturnValue({
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    }),
  };

  const mockTransactionRepository = {
    create: jest.fn().mockImplementation((dto) => dto),
    save: jest.fn().mockImplementation((e) => Promise.resolve({ ...e, id: 1 })),
    findOne: jest.fn(),
    createQueryBuilder: jest.fn().mockReturnValue({
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    }),
  };

  const mockEscrowRepository = {
    create: jest.fn().mockImplementation((dto) => dto),
    save: jest.fn().mockImplementation((e) => Promise.resolve({ ...e, id: 1 })),
    findOne: jest.fn(),
    find: jest.fn().mockResolvedValue([]),
    createQueryBuilder: jest.fn().mockReturnValue({
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    }),
  };

  const mockConfigService = {
    get: jest.fn().mockReturnValue({
      network: 'testnet',
      networkPassphrase: 'Test SDF Network ; September 2015',
      horizonUrl: 'https://horizon-testnet.stellar.org',
      baseFee: '100',
      encryptionKey: 'test-key',
      friendbotUrl: 'https://friendbot.stellar.org',
    }),
  };

  const mockEncryptionService = {
    encrypt: jest.fn().mockReturnValue('encrypted-secret'),
    decrypt: jest
      .fn()
      .mockReturnValue(
        'SABCDEFGHIJKLMNOPQRSTUVWXYZ234567ABCDEFGHIJKLMNOPQRSTUV',
      ),
    isConfigured: jest.fn().mockReturnValue(true),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StellarService,
        {
          provide: getRepositoryToken(StellarAccount),
          useValue: mockAccountRepository,
        },
        {
          provide: getRepositoryToken(StellarTransaction),
          useValue: mockTransactionRepository,
        },
        {
          provide: getRepositoryToken(StellarEscrow),
          useValue: mockEscrowRepository,
        },
        {
          provide: DataSource,
          useValue: {
            createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
          },
        },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: EncryptionService, useValue: mockEncryptionService },
      ],
    }).compile();

    service = module.get<StellarService>(StellarService);
    jest.clearAllMocks();
  });

  // ── getTransactionById ────────────────────────────────────────────────────

  describe('getTransactionById', () => {
    it('returns a transaction when it exists', async () => {
      mockTransactionRepository.findOne.mockResolvedValue(mockTransaction);

      const result = await service.getTransactionById(1);
      expect(result).toEqual(mockTransaction);
    });

    it('throws NotFoundException when transaction does not exist', async () => {
      mockTransactionRepository.findOne.mockResolvedValue(null);

      await expect(service.getTransactionById(9999)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ── getTransactionByHash ──────────────────────────────────────────────────

  describe('getTransactionByHash', () => {
    it('returns a transaction by its hash', async () => {
      mockTransactionRepository.findOne.mockResolvedValue(mockTransaction);

      const result = await service.getTransactionByHash('txhash123');
      expect(result.hash).toBe('txhash123');
    });

    it('throws NotFoundException for an unknown hash', async () => {
      mockTransactionRepository.findOne.mockResolvedValue(null);

      await expect(service.getTransactionByHash('bad-hash')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ── getEscrowById ─────────────────────────────────────────────────────────

  describe('getEscrowById', () => {
    it('returns an escrow when it exists', async () => {
      mockEscrowRepository.findOne.mockResolvedValue(mockEscrow);

      const result = await service.getEscrowById(1);
      expect(result).toEqual(mockEscrow);
    });

    it('throws NotFoundException when escrow does not exist', async () => {
      mockEscrowRepository.findOne.mockResolvedValue(null);

      await expect(service.getEscrowById(9999)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ── getAccountsByUserId ───────────────────────────────────────────────────

  describe('getAccountsByUserId', () => {
    it('returns all accounts for a user', async () => {
      mockAccountRepository.find.mockResolvedValue([mockAccount]);

      const result = await service.getAccountsByUserId('user-1');
      expect(result).toHaveLength(1);
      expect(result[0].userId).toBe('user-1');
    });

    it('returns an empty array when user has no accounts', async () => {
      mockAccountRepository.find.mockResolvedValue([]);

      const result = await service.getAccountsByUserId('user-no-accounts');
      expect(result).toHaveLength(0);
    });
  });

  // ── getAccountById ────────────────────────────────────────────────────────

  describe('getAccountById', () => {
    it('returns an account when found', async () => {
      mockAccountRepository.findOne.mockResolvedValue(mockAccount);

      const result = await service.getAccountById(1);
      expect(result.publicKey).toBe(PUBLIC_KEY);
    });

    it('throws NotFoundException for unknown ID', async () => {
      mockAccountRepository.findOne.mockResolvedValue(null);

      await expect(service.getAccountById(9999)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ── getAccountByPublicKey ─────────────────────────────────────────────────

  describe('getAccountByPublicKey', () => {
    it('returns an account matching the given public key', async () => {
      mockAccountRepository.findOne.mockResolvedValue(mockAccount);

      const result = await service.getAccountByPublicKey(PUBLIC_KEY);
      expect(result.publicKey).toBe(PUBLIC_KEY);
    });

    it('throws NotFoundException for an unknown public key', async () => {
      mockAccountRepository.findOne.mockResolvedValue(null);

      await expect(service.getAccountByPublicKey('GUNKNOWN')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ── listEscrows ───────────────────────────────────────────────────────────

  describe('listEscrows', () => {
    it('returns paginated escrows with default params', async () => {
      const qb = mockEscrowRepository.createQueryBuilder();
      qb.getManyAndCount.mockResolvedValue([[mockEscrow], 1]);

      const result = await service.listEscrows({});
      expect(result).toBeDefined();
    });

    it('filters by status when provided', async () => {
      const qb = mockEscrowRepository.createQueryBuilder();
      qb.getManyAndCount.mockResolvedValue([[mockEscrow], 1]);

      const result = await service.listEscrows({ status: EscrowStatus.FUNDED });
      expect(result).toBeDefined();
    });
  });

  // ── listTransactions ──────────────────────────────────────────────────────

  describe('listTransactions', () => {
    it('returns paginated transactions', async () => {
      const qb = mockTransactionRepository.createQueryBuilder();
      qb.getManyAndCount.mockResolvedValue([[mockTransaction], 1]);

      const result = await service.listTransactions({});
      expect(result).toBeDefined();
    });

    it('filters by status when provided', async () => {
      const qb = mockTransactionRepository.createQueryBuilder();
      qb.getManyAndCount.mockResolvedValue([[mockTransaction], 1]);

      const result = await service.listTransactions({
        status: TransactionStatus.COMPLETED,
      });
      expect(result).toBeDefined();
    });
  });

  // ── createAccount ─────────────────────────────────────────────────────────

  describe('createAccount', () => {
    it('creates and persists a USER-type account', async () => {
      mockAccountRepository.save.mockResolvedValue({ ...mockAccount, id: 2 });

      const result = await service.createAccount({
        userId: 'user-2',
        accountType: StellarAccountType.USER,
      });

      expect(mockEncryptionService.encrypt).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('creates an ESCROW-type account', async () => {
      mockAccountRepository.save.mockResolvedValue({
        ...mockAccount,
        accountType: StellarAccountType.ESCROW,
      });

      const result = await service.createAccount({
        userId: 'user-3',
        accountType: StellarAccountType.ESCROW,
      });

      expect(result).toBeDefined();
    });
  });

  // ── service bootstrap ─────────────────────────────────────────────────────

  it('is defined', () => {
    expect(service).toBeDefined();
  });
});
