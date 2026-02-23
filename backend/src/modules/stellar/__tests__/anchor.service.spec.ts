import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { BadRequestException } from '@nestjs/common';
import { AnchorService } from '../services/anchor.service';
import {
  AnchorTransaction,
  AnchorTransactionType,
  AnchorTransactionStatus,
} from '../../transactions/entities/anchor-transaction.entity';
import { SupportedCurrency } from '../../transactions/entities/supported-currency.entity';
import { PaymentMethodType } from '../dto/deposit-request.dto';

describe('AnchorService', () => {
  let service: AnchorService;
  let anchorTransactionRepo: any;
  let supportedCurrencyRepo: any;

  const mockAnchorTransactionRepo = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
  };

  const mockSupportedCurrencyRepo = {
    findOne: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: string) => {
      const config = {
        ANCHOR_API_URL: 'https://test-anchor.com',
        ANCHOR_API_KEY: 'test-key',
        SUPPORTED_FIAT_CURRENCIES: 'USD,EUR,GBP,NGN',
      };
      return config[key] || defaultValue;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnchorService,
        {
          provide: getRepositoryToken(AnchorTransaction),
          useValue: mockAnchorTransactionRepo,
        },
        {
          provide: getRepositoryToken(SupportedCurrency),
          useValue: mockSupportedCurrencyRepo,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<AnchorService>(AnchorService);
    anchorTransactionRepo = module.get(getRepositoryToken(AnchorTransaction));
    supportedCurrencyRepo = module.get(getRepositoryToken(SupportedCurrency));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initiateDeposit', () => {
    it('should throw error for unsupported currency', async () => {
      const dto = {
        amount: 100,
        currency: 'XYZ',
        walletAddress: 'GTEST...',
        type: PaymentMethodType.ACH,
      };

      await expect(service.initiateDeposit(dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw error if currency not configured', async () => {
      const dto = {
        amount: 100,
        currency: 'USD',
        walletAddress: 'GTEST...',
        type: PaymentMethodType.ACH,
      };

      mockSupportedCurrencyRepo.findOne.mockResolvedValue(null);

      await expect(service.initiateDeposit(dto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('initiateWithdrawal', () => {
    it('should throw error for unsupported currency', async () => {
      const dto = {
        amount: 100,
        currency: 'XYZ',
        destination: 'bank-account',
        walletAddress: 'GTEST...',
      };

      await expect(service.initiateWithdrawal(dto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getTransactionStatus', () => {
    it('should throw error if transaction not found', async () => {
      mockAnchorTransactionRepo.findOne.mockResolvedValue(null);

      await expect(service.getTransactionStatus('invalid-id')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should return transaction if found', async () => {
      const mockTransaction = {
        id: 'test-id',
        status: AnchorTransactionStatus.PENDING,
        anchorTransactionId: null,
      };

      mockAnchorTransactionRepo.findOne.mockResolvedValue(mockTransaction);

      const result = await service.getTransactionStatus('test-id');
      expect(result).toEqual(mockTransaction);
    });
  });

  describe('handleWebhook', () => {
    it('should update transaction from webhook payload', async () => {
      const payload = {
        id: 'anchor-tx-123',
        status: 'completed',
        stellar_transaction_id: 'stellar-tx-456',
      };

      const mockTransaction = {
        id: 'test-id',
        anchorTransactionId: 'anchor-tx-123',
        status: AnchorTransactionStatus.PENDING,
        metadata: {},
      };

      mockAnchorTransactionRepo.findOne.mockResolvedValue(mockTransaction);
      mockAnchorTransactionRepo.save.mockResolvedValue(mockTransaction);

      await service.handleWebhook(payload);

      expect(mockAnchorTransactionRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: AnchorTransactionStatus.COMPLETED,
          stellarTransactionId: 'stellar-tx-456',
        }),
      );
    });
  });
});
