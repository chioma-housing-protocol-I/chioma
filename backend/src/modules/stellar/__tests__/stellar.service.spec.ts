import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
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

// Mock Stellar SDK
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
      submitTransaction: jest.fn().mockResolvedValue({
        hash: 'abc123',
        ledger: 12345,
      }),
    })),
  },
  Asset: {
    native: jest.fn(() => ({ code: 'XLM', issuer: null })),
  },
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
    }),
  })),
  Operation: {
    payment: jest.fn(() => ({})),
    createAccount: jest.fn(() => ({})),
    accountMerge: jest.fn(() => ({})),
  },
  Memo: {
    text: jest.fn((text) => ({ type: 'text', value: text })),
    id: jest.fn((id) => ({ type: 'id', value: id })),
    hash: jest.fn((hash) => ({ type: 'hash', value: hash })),
    return: jest.fn((ret) => ({ type: 'return', value: ret })),
  },
}));

describe('StellarService', () => {
  let service: StellarService;
  let accountRepository: Repository<StellarAccount>;
  let transactionRepository: Repository<StellarTransaction>;
  let escrowRepository: Repository<StellarEscrow>;
  let encryptionService: EncryptionService;

  const mockConfigService = {
    get: jest.fn().mockReturnValue({
      network: 'testnet',
      networkPassphrase: 'Test SDF Network ; September 2015',
      horizonUrl: 'https://horizon-testnet.stellar.org',
      baseFee: '100',
      encryptionKey: 'test-encryption-key',
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

  const mockDataSource = {
    createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StellarService,
        {
          provide: getRepositoryToken(StellarAccount),
          useValue: {
            create: jest.fn().mockImplementation((dto) => dto),
            save: jest
              .fn()
              .mockImplementation((entity) =>
                Promise.resolve({ ...entity, id: 1 }),
              ),
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
          },
        },
        {
          provide: getRepositoryToken(StellarTransaction),
          useValue: {
            create: jest.fn().mockImplementation((dto) => dto),
            save: jest
              .fn()
              .mockImplementation((entity) =>
                Promise.resolve({ ...entity, id: 1 }),
              ),
            findOne: jest.fn(),
            createQueryBuilder: jest.fn().mockReturnValue({
              leftJoinAndSelect: jest.fn().mockReturnThis(),
              andWhere: jest.fn().mockReturnThis(),
              orderBy: jest.fn().mockReturnThis(),
              skip: jest.fn().mockReturnThis(),
              take: jest.fn().mockReturnThis(),
              getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
            }),
          },
        },
        {
          provide: getRepositoryToken(StellarEscrow),
          useValue: {
            create: jest.fn().mockImplementation((dto) => dto),
            save: jest
              .fn()
              .mockImplementation((entity) =>
                Promise.resolve({ ...entity, id: 1 }),
              ),
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
          },
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: EncryptionService,
          useValue: mockEncryptionService,
        },
      ],
    }).compile();

    service = module.get<StellarService>(StellarService);
    accountRepository = module.get<Repository<StellarAccount>>(
      getRepositoryToken(StellarAccount),
    );
    transactionRepository = module.get<Repository<StellarTransaction>>(
      getRepositoryToken(StellarTransaction),
    );
    escrowRepository = module.get<Repository<StellarEscrow>>(
      getRepositoryToken(StellarEscrow),
    );
    encryptionService = module.get<EncryptionService>(EncryptionService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createAccount', () => {
    it('should create a new Stellar account', async () => {
      const dto = {
        userId: 'user-123',
        accountType: StellarAccountType.USER,
      };

      const result = await service.createAccount(dto);

      expect(result).toBeDefined();
      expect(result.publicKey).toBeDefined();
      expect(result.accountType).toBe(StellarAccountType.USER);
      expect(accountRepository.create).toHaveBeenCalled();
      expect(accountRepository.save).toHaveBeenCalled();
      expect(mockEncryptionService.encrypt).toHaveBeenCalled();
    });

    it('should create an escrow account type', async () => {
      const dto = {
        accountType: StellarAccountType.ESCROW,
      };

      const result = await service.createAccount(dto);

      expect(result.accountType).toBe(StellarAccountType.ESCROW);
    });
  });

  describe('getAccountById', () => {
    it('should return an account by ID', async () => {
      const mockAccount = {
        id: 1,
        publicKey: 'GABCDEF...',
        accountType: StellarAccountType.USER,
        balance: '100.0000000',
        sequenceNumber: '123',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest
        .spyOn(accountRepository, 'findOne')
        .mockResolvedValue(mockAccount as any);

      const result = await service.getAccountById(1);

      expect(result).toEqual(mockAccount);
      expect(accountRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: ['user'],
      });
    });

    it('should throw NotFoundException if account not found', async () => {
      jest.spyOn(accountRepository, 'findOne').mockResolvedValue(null);

      await expect(service.getAccountById(999)).rejects.toThrow(
        'Stellar account with ID 999 not found',
      );
    });
  });

  describe('getAccountByPublicKey', () => {
    it('should return an account by public key', async () => {
      const publicKey =
        'GABCDEFGHIJKLMNOPQRSTUVWXYZ234567ABCDEFGHIJKLMNOPQRSTUV';
      const mockAccount = {
        id: 1,
        publicKey,
        accountType: StellarAccountType.USER,
      };

      jest
        .spyOn(accountRepository, 'findOne')
        .mockResolvedValue(mockAccount as any);

      const result = await service.getAccountByPublicKey(publicKey);

      expect(result.publicKey).toBe(publicKey);
    });

    it('should throw NotFoundException if account not found', async () => {
      jest.spyOn(accountRepository, 'findOne').mockResolvedValue(null);

      await expect(service.getAccountByPublicKey('INVALID')).rejects.toThrow(
        'Stellar account with public key INVALID not found',
      );
    });
  });

  describe('listTransactions', () => {
    it('should list transactions with default pagination', async () => {
      const mockTransactions = [
        {
          id: 1,
          transactionHash: 'hash1',
          amount: '100',
          status: TransactionStatus.COMPLETED,
        },
      ];

      jest.spyOn(transactionRepository, 'createQueryBuilder').mockReturnValue({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([mockTransactions, 1]),
      } as any);

      const result = await service.listTransactions({});

      expect(result.transactions).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should filter transactions by status', async () => {
      jest.spyOn(transactionRepository, 'createQueryBuilder').mockReturnValue({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      } as any);

      await service.listTransactions({ status: TransactionStatus.COMPLETED });

      const queryBuilder = transactionRepository.createQueryBuilder();
      expect(queryBuilder.andWhere).toHaveBeenCalled();
    });
  });

  describe('listEscrows', () => {
    it('should list escrows with filters', async () => {
      const mockEscrows = [
        {
          id: 1,
          amount: '1000',
          status: EscrowStatus.ACTIVE,
        },
      ];

      jest.spyOn(escrowRepository, 'createQueryBuilder').mockReturnValue({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([mockEscrows, 1]),
      } as any);

      const result = await service.listEscrows({ status: EscrowStatus.ACTIVE });

      expect(result.escrows).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });

  describe('getAccountsByUserId', () => {
    it('should return accounts for a user', async () => {
      const mockAccounts = [
        { id: 1, publicKey: 'PK1', userId: 'user-123' },
        { id: 2, publicKey: 'PK2', userId: 'user-123' },
      ];

      jest
        .spyOn(accountRepository, 'find')
        .mockResolvedValue(mockAccounts as any);

      const result = await service.getAccountsByUserId('user-123');

      expect(result).toHaveLength(2);
      expect(accountRepository.find).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        order: { createdAt: 'DESC' },
      });
    });
  });
});
