import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { of } from 'rxjs';

import { AnchorService } from './services/anchor-service';
import { AnchorTransaction } from './entities/anchor-transaction.entity';
import { SupportedCurrency } from './entities/supported-currency.entity';
import { User } from '../users/entities/user.entity';

describe('AnchorService', () => {
  let service: AnchorService;
  let anchorTransactionRepository: Repository<AnchorTransaction>;
  let supportedCurrencyRepository: Repository<SupportedCurrency>;
  let userRepository: Repository<User>;
  let httpService: HttpService;
  let configService: ConfigService;

  const mockUser: User = {
    id: 'user-123',
    email: 'test@example.com',
    stellarPublicKey: 'GA123...',
  } as User;

  const mockCurrency: SupportedCurrency = {
    id: 'currency-123',
    code: 'USD',
    name: 'US Dollar',
    type: 'fiat',
    isActive: true,
    exchangeRateToUsd: 1.0,
  } as SupportedCurrency;

  const mockAnchorResponse = {
    id: 'anchor-tx-123',
    url: 'https://anchor.com/pay',
    external_transaction_id: 'ext-123',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnchorService,
        {
          provide: getRepositoryToken(AnchorTransaction),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(SupportedCurrency),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: HttpService,
          useValue: {
            post: jest.fn(),
            get: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config = {
                ANCHOR_API_URL: 'https://api.anchor.com',
                ANCHOR_API_KEY: 'test-key',
                SUPPORTED_FIAT_CURRENCIES: 'USD,EUR,GBP',
              };
              return config[key] || 'default';
            }),
          },
        },
      ],
    }).compile();

    service = module.get<AnchorService>(AnchorService);
    anchorTransactionRepository = module.get<Repository<AnchorTransaction>>(
      getRepositoryToken(AnchorTransaction),
    );
    supportedCurrencyRepository = module.get<Repository<SupportedCurrency>>(
      getRepositoryToken(SupportedCurrency),
    );
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    httpService = module.get<HttpService>(HttpService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('initiateDeposit', () => {
    beforeEach(() => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);
      jest.spyOn(supportedCurrencyRepository, 'findOne').mockResolvedValue(mockCurrency);
      jest.spyOn(httpService, 'post').mockReturnValue(of({ data: mockAnchorResponse }));
      jest.spyOn(anchorTransactionRepository, 'create').mockReturnValue({} as AnchorTransaction);
      jest.spyOn(anchorTransactionRepository, 'save').mockResolvedValue({} as AnchorTransaction);
    });

    it('should create deposit transaction successfully', async () => {
      const depositRequest = {
        amount: 100,
        currency: 'USD',
        walletAddress: 'GA123...',
        type: 'SEPA' as const,
      };

      const result = await service.initiateDeposit('user-123', depositRequest);

      expect(userRepository.findOne).toHaveBeenCalledWith({ where: { id: 'user-123' } });
      expect(supportedCurrencyRepository.findOne).toHaveBeenCalledWith({
        where: { code: 'USD', type: 'fiat', isActive: true },
      });
      expect(httpService.post).toHaveBeenCalled();
      expect(anchorTransactionRepository.create).toHaveBeenCalled();
      expect(anchorTransactionRepository.save).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should throw error for unsupported currency', async () => {
      const depositRequest = {
        amount: 100,
        currency: 'XYZ',
        walletAddress: 'GA123...',
        type: 'SEPA' as const,
      };

      await expect(
        service.initiateDeposit('user-123', depositRequest),
      ).rejects.toThrow('Currency XYZ is not supported');
    });

    it('should throw error for non-existent user', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);

      const depositRequest = {
        amount: 100,
        currency: 'USD',
        walletAddress: 'GA123...',
        type: 'SEPA' as const,
      };

      await expect(
        service.initiateDeposit('user-123', depositRequest),
      ).rejects.toThrow('User not found');
    });

    it('should throw error for inactive currency', async () => {
      const inactiveCurrency = { ...mockCurrency, isActive: false };
      jest.spyOn(supportedCurrencyRepository, 'findOne').mockResolvedValue(inactiveCurrency);

      const depositRequest = {
        amount: 100,
        currency: 'USD',
        walletAddress: 'GA123...',
        type: 'SEPA' as const,
      };

      await expect(
        service.initiateDeposit('user-123', depositRequest),
      ).rejects.toThrow('Currency USD is not configured');
    });
  });

  describe('initiateWithdrawal', () => {
    beforeEach(() => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);
      jest.spyOn(supportedCurrencyRepository, 'findOne').mockResolvedValue(mockCurrency);
      jest.spyOn(httpService, 'post').mockReturnValue(of({ data: mockAnchorResponse }));
      jest.spyOn(anchorTransactionRepository, 'create').mockReturnValue({} as AnchorTransaction);
      jest.spyOn(anchorTransactionRepository, 'save').mockResolvedValue({} as AnchorTransaction);
    });

    it('should create withdrawal transaction successfully', async () => {
      const withdrawRequest = {
        amount: 100,
        currency: 'USD',
        destination: 'bank account details',
        walletAddress: 'GA123...',
      };

      const result = await service.initiateWithdrawal('user-123', withdrawRequest);

      expect(userRepository.findOne).toHaveBeenCalledWith({ where: { id: 'user-123' } });
      expect(supportedCurrencyRepository.findOne).toHaveBeenCalledWith({
        where: { code: 'USD', type: 'fiat', isActive: true },
      });
      expect(httpService.post).toHaveBeenCalled();
      expect(anchorTransactionRepository.create).toHaveBeenCalled();
      expect(anchorTransactionRepository.save).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });

  describe('getTransactionStatus', () => {
    it('should return transaction status', async () => {
      const mockTransaction = {
        id: 'tx-123',
        status: 'pending',
        anchorTransactionId: 'anchor-123',
      } as AnchorTransaction;

      jest.spyOn(anchorTransactionRepository, 'findOne').mockResolvedValue(mockTransaction);
      jest.spyOn(httpService, 'get').mockReturnValue(of({ data: { status: 'completed' } }));

      const result = await service.getTransactionStatus('tx-123');

      expect(result).toBe(mockTransaction);
      expect(anchorTransactionRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'tx-123' },
        relations: ['user'],
      });
    });

    it('should throw error for non-existent transaction', async () => {
      jest.spyOn(anchorTransactionRepository, 'findOne').mockResolvedValue(null);

      await expect(service.getTransactionStatus('tx-123')).rejects.toThrow('Transaction not found');
    });
  });

  describe('handleAnchorWebhook', () => {
    it('should update transaction status from webhook', async () => {
      const mockTransaction = {
        id: 'tx-123',
        status: 'pending',
        anchorTransactionId: 'anchor-123',
      } as AnchorTransaction;

      jest.spyOn(anchorTransactionRepository, 'findOne').mockResolvedValue(mockTransaction);
      jest.spyOn(anchorTransactionRepository, 'save').mockResolvedValue(mockTransaction);

      const webhookData = {
        transaction_id: 'anchor-123',
        status: 'completed',
        stellar_transaction_id: 'stellar-123',
      };

      await service.handleAnchorWebhook(webhookData);

      expect(anchorTransactionRepository.findOne).toHaveBeenCalledWith({
        where: { anchorTransactionId: 'anchor-123' },
      });
      expect(anchorTransactionRepository.save).toHaveBeenCalled();
      expect(mockTransaction.status).toBe('completed');
      expect(mockTransaction.stellarTransactionHash).toBe('stellar-123');
    });

    it('should log warning for unknown transaction', async () => {
      jest.spyOn(anchorTransactionRepository, 'findOne').mockResolvedValue(null);

      const webhookData = {
        transaction_id: 'unknown-anchor-123',
        status: 'completed',
      };

      // Should not throw error, just log warning
      await expect(service.handleAnchorWebhook(webhookData)).resolves.toBeUndefined();
    });
  });
});
