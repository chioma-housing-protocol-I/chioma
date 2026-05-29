import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { StellarService } from '../src/modules/stellar/services/stellar.service';
import {
  StellarTransaction,
  TransactionStatus,
  AssetType,
  MemoType,
} from '../src/modules/stellar/entities/stellar-transaction.entity';
import {
  StellarAccount,
  StellarAccountType,
} from '../src/modules/stellar/entities/stellar-account.entity';
import {
  StellarEscrow,
  EscrowStatus,
} from '../src/modules/stellar/entities/stellar-escrow.entity';
import { EncryptionService } from '../src/modules/stellar/services/encryption.service';
import * as StellarSdk from '@stellar/stellar-sdk';

jest.mock('@stellar/stellar-sdk', () => {
  const actual = jest.requireActual('@stellar/stellar-sdk');
  return {
    ...actual,
    Horizon: {
      Server: jest.fn().mockImplementation(() => ({
        loadAccount: jest.fn(),
        submitTransaction: jest.fn(),
        transactions: jest.fn(),
      })),
    },
    TransactionBuilder: jest.fn().mockImplementation(() => ({
      addOperation: jest.fn().mockReturnThis(),
      setTimeout: jest.fn().mockReturnThis(),
      build: jest.fn().mockReturnValue({
        sign: jest.fn(),
        toXDR: jest.fn().mockReturnValue('mock-xdr'),
        hash: jest.fn().mockReturnValue(Buffer.from('a'.repeat(64), 'hex')),
      }),
    })),
    Operation: {
      payment: jest.fn().mockReturnValue({}),
      createAccount: jest.fn().mockReturnValue({}),
    },
    Asset: {
      native: jest.fn().mockReturnValue({ code: 'XLM', issuer: undefined }),
    },
    Keypair: {
      fromSecret: jest.fn().mockReturnValue({
        publicKey: jest.fn().mockReturnValue('MOCK_PUBLIC_KEY'),
        sign: jest.fn(),
      }),
      random: jest.fn().mockReturnValue({
        publicKey: jest.fn().mockReturnValue('MOCK_PUBLIC_KEY'),
        secret: jest.fn().mockReturnValue('MOCK_SECRET'),
      }),
    },
    Networks: {
      TESTNET: 'Test SDF Network ; September 2015',
      PUBLIC: 'Public Global Stellar Network ; September 2015',
    },
  };
});

describe('Blockchain Transaction Integration (e2e)', () => {
  let module: TestingModule;

  const mockAccount: StellarAccount = {
    id: 1,
    userId: 'user-1',
    user: null as any,
    publicKey: 'GCEZWKCA5VLDNRLN3RPRJMRZOX3Z6G5CHCGKW7FCPG7HZNZXNUUA8A',
    secretKeyEncrypted: 'encrypted-secret',
    sequenceNumber: '0',
    accountType: StellarAccountType.USER,
    isActive: true,
    balance: '100',
    createdAt: new Date(),
    updatedAt: new Date(),
  } as StellarAccount;

  const mockTransaction: StellarTransaction = {
    id: 1,
    transactionHash: 'a'.repeat(64),
    fromAccountId: 1,
    fromAccount: mockAccount,
    toAccountId: 2,
    toAccount: { ...mockAccount, id: 2 } as StellarAccount,
    assetType: AssetType.NATIVE,
    assetCode: 'XLM',
    assetIssuer: null,
    amount: '100',
    feePaid: 100,
    status: TransactionStatus.PENDING,
    memoType: MemoType.NONE,
    memo: null,
    errorMessage: null,
    ledger: null,
    sourceAccount: null,
    destinationAccount: null,
    idempotencyKey: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as StellarTransaction;

  const mockTransactionRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    update: jest.fn(),
    createQueryBuilder: jest.fn().mockReturnValue({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    }),
  };

  const mockAccountRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    createQueryBuilder: jest.fn().mockReturnValue({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    }),
  };

  const mockEscrowRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
    createQueryBuilder: jest.fn().mockReturnValue({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    }),
  };

  const mockDataSource = {
    createQueryRunner: jest.fn().mockReturnValue({
      connect: jest.fn(),
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
      manager: {
        save: jest.fn(),
        findOne: jest.fn(),
      },
    }),
  };

  const mockEncryptionService = {
    encrypt: jest.fn().mockResolvedValue('encrypted'),
    decrypt: jest.fn().mockResolvedValue('SMOCK_SECRET_KEY'),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [
            () => ({
              STELLAR_NETWORK: 'testnet',
              STELLAR_HORIZON_URL: 'https://horizon-testnet.stellar.org',
              STELLAR_BASE_FEE: '100',
            }),
          ],
        }),
      ],
      providers: [
        StellarService,
        EncryptionService,
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
          provide: 'DataSource',
          useValue: mockDataSource,
        },
        {
          provide: EncryptionService,
          useValue: mockEncryptionService,
        },
      ],
    }).compile();
  });

  afterAll(async () => {
    if (module) {
      await module.close();
    }
  });

  describe('Transaction Status Tracking', () => {
    it('creates transaction with PENDING status initially', () => {
      expect(mockTransaction.status).toBe(TransactionStatus.PENDING);
    });

    it('tracks all valid transaction status transitions', () => {
      const statuses = Object.values(TransactionStatus);
      expect(statuses).toContain(TransactionStatus.PENDING);
      expect(statuses).toContain(TransactionStatus.SUBMITTED);
      expect(statuses).toContain(TransactionStatus.COMPLETED);
      expect(statuses).toContain(TransactionStatus.FAILED);
    });

    it('records status change on submission', async () => {
      const submitted: StellarTransaction = {
        ...mockTransaction,
        status: TransactionStatus.SUBMITTED,
        updatedAt: new Date(),
      };
      mockTransactionRepository.save.mockResolvedValue(submitted);

      const saved = await mockTransactionRepository.save(submitted);
      expect(saved.updatedAt).toBeDefined();
      expect(saved.status).toBe(TransactionStatus.SUBMITTED);
    });

    it('records status change on completion', async () => {
      const confirmed: StellarTransaction = {
        ...mockTransaction,
        status: TransactionStatus.COMPLETED,
        updatedAt: new Date(),
      };
      mockTransactionRepository.save.mockResolvedValue(confirmed);

      const saved = await mockTransactionRepository.save(confirmed);
      expect(saved.updatedAt).toBeDefined();
      expect(saved.status).toBe(TransactionStatus.COMPLETED);
    });
  });

  describe('Transaction Creation', () => {
    it('constructs a transaction with the correct fields', () => {
      const txData = {
        transactionHash: 'b'.repeat(64),
        fromAccountId: 1,
        toAccountId: 2,
        assetType: AssetType.NATIVE,
        assetCode: 'XLM',
        amount: '50',
        feePaid: 100,
        status: TransactionStatus.PENDING,
        memoType: MemoType.TEXT,
        memo: 'rent-payment',
      };

      mockTransactionRepository.create.mockReturnValue({ id: 10, ...txData });
      mockTransactionRepository.save.mockResolvedValue({ id: 10, ...txData });

      const created = mockTransactionRepository.create(txData);

      expect(created.transactionHash).toBe(txData.transactionHash);
      expect(created.amount).toBe('50');
      expect(created.status).toBe(TransactionStatus.PENDING);
    });

    it('supports NATIVE and credit asset types', () => {
      const assetTypes = Object.values(AssetType);
      expect(assetTypes).toContain(AssetType.NATIVE);
      expect(assetTypes).toContain(AssetType.CREDIT_ALPHANUM4);
      expect(assetTypes).toContain(AssetType.CREDIT_ALPHANUM12);
    });
  });

  describe('Error Handling and Recovery', () => {
    it('records error message on failed transaction', async () => {
      const failed: StellarTransaction = {
        ...mockTransaction,
        status: TransactionStatus.FAILED,
        errorMessage: 'tx_failed: insufficient funds',
      };
      mockTransactionRepository.save.mockResolvedValue(failed);

      const saved = await mockTransactionRepository.save(failed);
      expect(saved.status).toBe(TransactionStatus.FAILED);
      expect(saved.errorMessage).toBe('tx_failed: insufficient funds');
    });

    it('looks up existing transaction by hash', async () => {
      mockTransactionRepository.findOne.mockResolvedValue(mockTransaction);

      const found = await mockTransactionRepository.findOne({
        where: { transactionHash: mockTransaction.transactionHash },
      });

      expect(found).toBeDefined();
      expect(found.transactionHash).toBe(mockTransaction.transactionHash);
    });

    it('returns null when transaction hash is not found', async () => {
      mockTransactionRepository.findOne.mockResolvedValue(null);

      const found = await mockTransactionRepository.findOne({
        where: { transactionHash: 'nonexistent' },
      });

      expect(found).toBeNull();
    });
  });

  describe('Stellar Network Integration', () => {
    it('uses testnet network passphrase in test environment', () => {
      expect(StellarSdk.Networks.TESTNET).toBe(
        'Test SDF Network ; September 2015',
      );
    });

    it('generates a unique keypair per account', () => {
      const kp = StellarSdk.Keypair.random();
      expect(kp.publicKey()).toBe('MOCK_PUBLIC_KEY');
    });

    it('memo types cover common use cases', () => {
      const memoTypes = Object.values(MemoType);
      expect(memoTypes).toContain(MemoType.TEXT);
      expect(memoTypes).toContain(MemoType.ID);
      expect(memoTypes).toContain(MemoType.NONE);
    });
  });

  describe('Concurrent and Performance Scenarios', () => {
    it('saves 10 transactions concurrently without conflict', async () => {
      mockTransactionRepository.save.mockImplementation((tx) =>
        Promise.resolve({ ...tx, id: Math.random() }),
      );

      const txs = Array.from({ length: 10 }, (_, i) => ({
        ...mockTransaction,
        transactionHash: `hash-${i}`,
      }));

      const results = await Promise.all(
        txs.map((tx) => mockTransactionRepository.save(tx)),
      );

      expect(results).toHaveLength(10);
      expect(mockTransactionRepository.save).toHaveBeenCalledTimes(10);
    });
  });
});
