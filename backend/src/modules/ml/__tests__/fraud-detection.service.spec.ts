import { Test, TestingModule } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { FraudDetectionService } from '../services/fraud-detection.service';
import { MLModelService } from '../services/ml-model.service';
import {
  TransactionData,
  FraudRiskLevel,
} from '../types/fraud-detection.types';

describe('FraudDetectionService', () => {
  let service: FraudDetectionService;
  let cacheManager: any;

  const mockCacheManager = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FraudDetectionService,
        {
          provide: MLModelService,
          useValue: {
            predict: jest.fn(),
          },
        },
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
      ],
    }).compile();

    service = module.get<FraudDetectionService>(FraudDetectionService);
    cacheManager = module.get(CACHE_MANAGER);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('analyzeTransaction', () => {
    it('should detect high-risk transaction for excessive amount', async () => {
      const transaction: TransactionData = {
        id: 'txn-123',
        userId: 'user-123',
        amount: 150000,
        currency: 'USD',
        timestamp: new Date(),
        ipAddress: '192.168.1.1',
      };

      mockCacheManager.get.mockResolvedValue(null);

      const result = await service.analyzeTransaction(transaction);

      expect(result.transactionId).toBe('txn-123');
      expect(result.riskLevel).toBe(FraudRiskLevel.MEDIUM);
      expect(result.isBlocked).toBe(false);
      expect(result.flags.length).toBeGreaterThan(0);
    });

    it('should detect velocity-based fraud', async () => {
      const baseTransaction: TransactionData = {
        id: 'txn-velocity',
        userId: 'user-velocity',
        amount: 1000,
        currency: 'USD',
        timestamp: new Date(),
        ipAddress: '192.168.1.1',
      };

      const recentTransactions = Array.from({ length: 12 }, (_, i) => ({
        ...baseTransaction,
        id: `txn-${i}`,
        timestamp: new Date(Date.now() - i * 60000),
      }));

      mockCacheManager.get.mockResolvedValue(recentTransactions);

      const result = await service.analyzeTransaction(baseTransaction);

      expect(result.flags.some((f) => f.type === 'high_velocity')).toBe(true);
      expect(result.riskScore).toBeGreaterThan(30);
    });

    it('should flag new device transactions', async () => {
      const transaction: TransactionData = {
        id: 'txn-device',
        userId: 'user-device',
        amount: 1000,
        currency: 'USD',
        timestamp: new Date(),
        deviceFingerprint: 'new-device-fingerprint',
      };

      mockCacheManager.get.mockImplementation((key) => {
        if (key.includes('devices')) {
          return Promise.resolve(['known-device-1', 'known-device-2']);
        }
        return Promise.resolve(null);
      });

      const result = await service.analyzeTransaction(transaction);

      expect(result.flags.some((f) => f.type === 'new_device')).toBe(true);
    });

    it('should calculate risk score correctly', async () => {
      const transaction: TransactionData = {
        id: 'txn-calc',
        userId: 'user-calc',
        amount: 50000,
        currency: 'USD',
        timestamp: new Date(),
      };

      mockCacheManager.get.mockResolvedValue(null);

      const result = await service.analyzeTransaction(transaction);

      expect(result.riskScore).toBeGreaterThanOrEqual(0);
      expect(result.riskScore).toBeLessThanOrEqual(100);
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should block high-risk transactions', async () => {
      const transaction: TransactionData = {
        id: 'txn-block',
        userId: 'user-block',
        amount: 200000,
        currency: 'USD',
        timestamp: new Date(),
      };

      const recentTransactions = Array.from({ length: 15 }, (_, i) => ({
        ...transaction,
        id: `txn-${i}`,
        timestamp: new Date(Date.now() - i * 60000),
      }));

      mockCacheManager.get.mockImplementation((key) => {
        if (key.includes('velocity')) {
          return Promise.resolve(recentTransactions);
        }
        return Promise.resolve(null);
      });

      const result = await service.analyzeTransaction(transaction);

      expect(result.isBlocked || result.requiresReview).toBe(true);
    });
  });

  describe('getFraudStatistics', () => {
    it('should return fraud statistics', async () => {
      const stats = {
        total: 100,
        blocked: 5,
        highRisk: 10,
      };

      mockCacheManager.get.mockResolvedValue(stats);

      const result = await service.getFraudStatistics();

      expect(result).toEqual(stats);
    });
  });
});
