import { Test, TestingModule } from '@nestjs/testing';
import { StellarController } from '../controllers/stellar.controller';
import { StellarService } from '../services/stellar.service';
import { StellarAccountType } from '../entities/stellar-account.entity';
import {
  TransactionStatus,
  AssetType,
} from '../entities/stellar-transaction.entity';
import { EscrowStatus } from '../entities/stellar-escrow.entity';

describe('StellarController', () => {
  let controller: StellarController;
  let stellarService: StellarService;

  const mockStellarService = {
    createAccount: jest.fn(),
    getAccountById: jest.fn(),
    getAccountByPublicKey: jest.fn(),
    getAccountsByUserId: jest.fn(),
    fundAccountTestnet: jest.fn(),
    syncAccountFromNetwork: jest.fn(),
    getAccountInfoFromNetwork: jest.fn(),
    sendPayment: jest.fn(),
    listTransactions: jest.fn(),
    getTransactionById: jest.fn(),
    getTransactionByHash: jest.fn(),
    createEscrow: jest.fn(),
    releaseEscrow: jest.fn(),
    refundEscrow: jest.fn(),
    getEscrowById: jest.fn(),
    listEscrows: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StellarController],
      providers: [
        {
          provide: StellarService,
          useValue: mockStellarService,
        },
      ],
    }).compile();

    controller = module.get<StellarController>(StellarController);
    stellarService = module.get<StellarService>(StellarService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createAccount', () => {
    it('should create a new account', async () => {
      const mockAccount = {
        id: 1,
        publicKey: 'GABCDEF...',
        accountType: StellarAccountType.USER,
        balance: '0',
        sequenceNumber: '0',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockStellarService.createAccount.mockResolvedValue(mockAccount);

      const result = await controller.createAccount({
        accountType: StellarAccountType.USER,
      });

      expect(result.publicKey).toBe(mockAccount.publicKey);
      expect(mockStellarService.createAccount).toHaveBeenCalledWith({
        accountType: StellarAccountType.USER,
      });
    });
  });

  describe('getAccountById', () => {
    it('should return account by ID', async () => {
      const mockAccount = {
        id: 1,
        publicKey: 'GABCDEF...',
        accountType: StellarAccountType.USER,
        balance: '100',
        sequenceNumber: '123',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockStellarService.getAccountById.mockResolvedValue(mockAccount);

      const result = await controller.getAccountById(1);

      expect(result.id).toBe(1);
      expect(mockStellarService.getAccountById).toHaveBeenCalledWith(1);
    });
  });

  describe('getAccountByPublicKey', () => {
    it('should return account by public key', async () => {
      const publicKey =
        'GABCDEFGHIJKLMNOPQRSTUVWXYZ234567ABCDEFGHIJKLMNOPQRSTUV';
      const mockAccount = {
        id: 1,
        publicKey,
        accountType: StellarAccountType.USER,
        balance: '100',
        sequenceNumber: '123',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockStellarService.getAccountByPublicKey.mockResolvedValue(mockAccount);

      const result = await controller.getAccountByPublicKey(publicKey);

      expect(result.publicKey).toBe(publicKey);
    });
  });

  describe('fundAccount', () => {
    it('should fund account via Friendbot', async () => {
      mockStellarService.fundAccountTestnet.mockResolvedValue(true);

      const result = await controller.fundAccount({ publicKey: 'GABCDEF...' });

      expect(result.success).toBe(true);
      expect(mockStellarService.fundAccountTestnet).toHaveBeenCalledWith(
        'GABCDEF...',
      );
    });
  });

  describe('sendPayment', () => {
    it('should send a payment', async () => {
      const mockTransaction = {
        id: 1,
        transactionHash: 'hash123',
        sourceAccount: 'SOURCE...',
        destinationAccount: 'DEST...',
        amount: '100',
        assetType: AssetType.NATIVE,
        status: TransactionStatus.COMPLETED,
        feePaid: 100,
        ledger: 12345,
        createdAt: new Date(),
      };

      mockStellarService.sendPayment.mockResolvedValue(mockTransaction);

      const dto = {
        sourcePublicKey:
          'GABCDEFGHIJKLMNOPQRSTUVWXYZ234567ABCDEFGHIJKLMNOPQRSTUV',
        destinationPublicKey:
          'GZYXWVUTSRQPONMLKJIHGFEDCBA765432ZYXWVUTSRQPONMLKJIHGF',
        amount: '100',
      };

      const result = await controller.sendPayment(dto);

      expect(result.transactionHash).toBe('hash123');
      expect(result.status).toBe(TransactionStatus.COMPLETED);
    });
  });

  describe('listTransactions', () => {
    it('should list transactions with pagination', async () => {
      const mockTransactions = [
        {
          id: 1,
          transactionHash: 'hash1',
          sourceAccount: 'SRC1',
          destinationAccount: 'DST1',
          amount: '100',
          assetType: AssetType.NATIVE,
          feePaid: 100,
          status: TransactionStatus.COMPLETED,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockStellarService.listTransactions.mockResolvedValue({
        transactions: mockTransactions,
        total: 1,
      });

      const result = await controller.listTransactions({
        limit: 20,
        offset: 0,
      });

      expect(result.transactions).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.offset).toBe(0);
    });
  });

  describe('createEscrow', () => {
    it('should create an escrow', async () => {
      const mockEscrow = {
        id: 1,
        escrowAccount: { publicKey: 'ESCROW...' },
        sourceAccount: { publicKey: 'SOURCE...' },
        destinationAccount: { publicKey: 'DEST...' },
        amount: '1000',
        assetType: AssetType.NATIVE,
        status: EscrowStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockStellarService.createEscrow.mockResolvedValue(mockEscrow);

      const dto = {
        sourcePublicKey:
          'GABCDEFGHIJKLMNOPQRSTUVWXYZ234567ABCDEFGHIJKLMNOPQRSTUV',
        destinationPublicKey:
          'GZYXWVUTSRQPONMLKJIHGFEDCBA765432ZYXWVUTSRQPONMLKJIHGF',
        amount: '1000',
      };

      const result = await controller.createEscrow(dto);

      expect(result.status).toBe(EscrowStatus.ACTIVE);
      expect(result.amount).toBe('1000');
    });
  });

  describe('releaseEscrow', () => {
    it('should release an escrow', async () => {
      const mockEscrow = {
        id: 1,
        escrowAccount: { publicKey: 'ESCROW...' },
        sourceAccount: { publicKey: 'SOURCE...' },
        destinationAccount: { publicKey: 'DEST...' },
        amount: '1000',
        assetType: AssetType.NATIVE,
        status: EscrowStatus.RELEASED,
        releasedAt: new Date(),
        releaseTransactionHash: 'release-hash',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockStellarService.releaseEscrow.mockResolvedValue(mockEscrow);

      const result = await controller.releaseEscrow({ escrowId: 1 });

      expect(result.status).toBe(EscrowStatus.RELEASED);
      expect(result.releaseTransactionHash).toBe('release-hash');
    });
  });

  describe('refundEscrow', () => {
    it('should refund an escrow', async () => {
      const mockEscrow = {
        id: 1,
        escrowAccount: { publicKey: 'ESCROW...' },
        sourceAccount: { publicKey: 'SOURCE...' },
        destinationAccount: { publicKey: 'DEST...' },
        amount: '1000',
        assetType: AssetType.NATIVE,
        status: EscrowStatus.REFUNDED,
        refundedAt: new Date(),
        refundTransactionHash: 'refund-hash',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockStellarService.refundEscrow.mockResolvedValue(mockEscrow);

      const result = await controller.refundEscrow({
        escrowId: 1,
        reason: 'Test refund',
      });

      expect(result.status).toBe(EscrowStatus.REFUNDED);
      expect(result.refundTransactionHash).toBe('refund-hash');
    });
  });

  describe('listEscrows', () => {
    it('should list escrows with filters', async () => {
      const mockEscrows = [
        {
          id: 1,
          escrowAccount: { publicKey: 'ESCROW...' },
          sourceAccount: { publicKey: 'SOURCE...' },
          destinationAccount: { publicKey: 'DEST...' },
          amount: '1000',
          assetType: AssetType.NATIVE,
          status: EscrowStatus.ACTIVE,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockStellarService.listEscrows.mockResolvedValue({
        escrows: mockEscrows,
        total: 1,
      });

      const result = await controller.listEscrows({
        status: EscrowStatus.ACTIVE,
      });

      expect(result.escrows).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });
});
