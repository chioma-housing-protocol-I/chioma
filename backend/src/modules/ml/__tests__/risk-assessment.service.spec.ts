import { Test, TestingModule } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { RiskAssessmentService } from '../services/risk-assessment.service';
import { MLModelService } from '../services/ml-model.service';
import { FraudDetectionService } from '../services/fraud-detection.service';
import {
  RiskAssessmentRequest,
  RiskLevel,
  RiskCategory,
} from '../types/risk-assessment.types';

describe('RiskAssessmentService', () => {
  let service: RiskAssessmentService;
  let cacheManager: any;

  const mockCacheManager = {
    get: jest.fn(),
    set: jest.fn(),
  };

  const mockMLModelService = {
    predict: jest.fn(),
  };

  const mockFraudDetectionService = {
    analyzeTransaction: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RiskAssessmentService,
        {
          provide: MLModelService,
          useValue: mockMLModelService,
        },
        {
          provide: FraudDetectionService,
          useValue: mockFraudDetectionService,
        },
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
      ],
    }).compile();

    service = module.get<RiskAssessmentService>(RiskAssessmentService);
    cacheManager = module.get(CACHE_MANAGER);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('assessRisk', () => {
    it('should assess risk for a user', async () => {
      const request: RiskAssessmentRequest = {
        entityId: 'user-123',
        entityType: 'user',
      };

      mockCacheManager.get.mockResolvedValue(null);

      const result = await service.assessRisk(request);

      expect(result.entityId).toBe('user-123');
      expect(result.entityType).toBe('user');
      expect(result.overallRiskScore).toBeGreaterThanOrEqual(0);
      expect(result.overallRiskScore).toBeLessThanOrEqual(100);
      expect(result.riskLevel).toBeDefined();
      expect(result.factors).toBeDefined();
      expect(Array.isArray(result.factors)).toBe(true);
      expect(result.recommendations).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should return cached risk assessment if valid', async () => {
      const request: RiskAssessmentRequest = {
        entityId: 'user-cached',
        entityType: 'user',
      };

      const cachedResult = {
        entityId: 'user-cached',
        entityType: 'user',
        overallRiskScore: 45,
        riskLevel: RiskLevel.MODERATE,
        factors: [],
        recommendations: [],
        confidence: 0.88,
        assessedAt: new Date(),
        validUntil: new Date(Date.now() + 3600000),
      };

      mockCacheManager.get.mockResolvedValue(cachedResult);

      const result = await service.assessRisk(request);

      expect(result).toEqual(cachedResult);
    });

    it('should identify high-risk entities', async () => {
      const request: RiskAssessmentRequest = {
        entityId: 'user-highrisk',
        entityType: 'user',
      };

      mockCacheManager.get.mockImplementation((key) => {
        if (key.includes('transaction_history')) {
          return Promise.resolve({
            totalAmount: 200000,
            failedTransactions: 10,
            chargebacks: 3,
          });
        }
        if (key.includes('security_profile')) {
          return Promise.resolve({
            mfaEnabled: false,
            suspiciousLoginAttempts: 5,
            accountAge: 10,
          });
        }
        return Promise.resolve(null);
      });

      const result = await service.assessRisk(request);

      expect(result.riskLevel).not.toBe(RiskLevel.MINIMAL);
      expect(result.factors.length).toBeGreaterThan(0);
    });

    it('should categorize risk factors correctly', async () => {
      const request: RiskAssessmentRequest = {
        entityId: 'user-categories',
        entityType: 'user',
      };

      mockCacheManager.get.mockResolvedValue(null);

      const result = await service.assessRisk(request);

      const categories = new Set(result.factors.map((f) => f.category));
      expect(categories.size).toBeGreaterThanOrEqual(0);
    });

    it('should provide recommendations based on risk factors', async () => {
      const request: RiskAssessmentRequest = {
        entityId: 'user-recommendations',
        entityType: 'user',
      };

      mockCacheManager.get.mockResolvedValue(null);

      const result = await service.assessRisk(request);

      expect(result.recommendations).toBeDefined();
      expect(Array.isArray(result.recommendations)).toBe(true);
      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it('should assess property risk', async () => {
      const request: RiskAssessmentRequest = {
        entityId: 'property-123',
        entityType: 'property',
        context: {
          propertyValue: 1500000,
        },
      };

      mockCacheManager.get.mockResolvedValue(null);

      const result = await service.assessRisk(request);

      expect(result.entityType).toBe('property');
      expect(result.overallRiskScore).toBeGreaterThanOrEqual(0);
    });

    it('should calculate risk level correctly', async () => {
      const request: RiskAssessmentRequest = {
        entityId: 'user-level',
        entityType: 'user',
      };

      mockCacheManager.get.mockResolvedValue(null);

      const result = await service.assessRisk(request);

      const validLevels = Object.values(RiskLevel);
      expect(validLevels).toContain(result.riskLevel);
    });
  });

  describe('getRiskMitigationStrategies', () => {
    it('should provide mitigation strategies', async () => {
      mockCacheManager.get.mockResolvedValue(null);

      const strategies = await service.getRiskMitigationStrategies('user-123');

      expect(Array.isArray(strategies)).toBe(true);
      strategies.forEach((strategy) => {
        expect(strategy.riskFactor).toBeDefined();
        expect(strategy.action).toBeDefined();
        expect(strategy.priority).toBeDefined();
        expect(['low', 'medium', 'high']).toContain(strategy.priority);
      });
    });
  });
});
