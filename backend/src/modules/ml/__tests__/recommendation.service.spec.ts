import { Test, TestingModule } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { RecommendationService } from '../services/recommendation.service';
import { MLModelService } from '../services/ml-model.service';
import {
  RecommendationType,
  RecommendationRequest,
} from '../types/recommendation.types';

describe('RecommendationService', () => {
  let service: RecommendationService;
  let cacheManager: any;

  const mockCacheManager = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  const mockMLModelService = {
    predict: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecommendationService,
        {
          provide: MLModelService,
          useValue: mockMLModelService,
        },
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
      ],
    }).compile();

    service = module.get<RecommendationService>(RecommendationService);
    cacheManager = module.get(CACHE_MANAGER);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateRecommendations', () => {
    it('should generate property recommendations', async () => {
      const request: RecommendationRequest = {
        userId: 'user-123',
        type: RecommendationType.PROPERTY,
        limit: 10,
      };

      mockCacheManager.get.mockResolvedValue(null);

      const result = await service.generateRecommendations(request);

      expect(result.userId).toBe('user-123');
      expect(result.type).toBe(RecommendationType.PROPERTY);
      expect(result.recommendations).toBeDefined();
      expect(result.recommendations.length).toBeLessThanOrEqual(10);
      expect(result.algorithm).toBeDefined();
    });

    it('should return cached recommendations when available', async () => {
      const request: RecommendationRequest = {
        userId: 'user-cached',
        type: RecommendationType.PROPERTY,
        limit: 5,
      };

      const cachedResult = {
        userId: 'user-cached',
        type: RecommendationType.PROPERTY,
        recommendations: [
          {
            itemId: 'property-1',
            score: 0.95,
            reasons: ['Matches preferences'],
            confidence: 0.9,
          },
        ],
        algorithm: 'hybrid',
        generatedAt: new Date(),
        totalAvailable: 1,
      };

      mockCacheManager.get.mockResolvedValue(cachedResult);

      const result = await service.generateRecommendations(request);

      expect(result).toEqual(cachedResult);
      expect(mockCacheManager.get).toHaveBeenCalled();
    });

    it('should generate similar listings recommendations', async () => {
      const request: RecommendationRequest = {
        userId: 'user-123',
        type: RecommendationType.SIMILAR_LISTINGS,
        context: {
          currentPropertyId: 'property-456',
        },
      };

      mockCacheManager.get.mockResolvedValue(null);

      const result = await service.generateRecommendations(request);

      expect(result.type).toBe(RecommendationType.SIMILAR_LISTINGS);
      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it('should generate trending recommendations', async () => {
      const request: RecommendationRequest = {
        userId: 'user-123',
        type: RecommendationType.TRENDING,
        limit: 5,
      };

      mockCacheManager.get.mockResolvedValue(null);

      const result = await service.generateRecommendations(request);

      expect(result.type).toBe(RecommendationType.TRENDING);
      expect(result.recommendations.length).toBeGreaterThan(0);
      expect(result.recommendations[0].score).toBeGreaterThanOrEqual(0);
    });

    it('should include reasons for recommendations', async () => {
      const request: RecommendationRequest = {
        userId: 'user-123',
        type: RecommendationType.PROPERTY,
        limit: 3,
      };

      mockCacheManager.get.mockResolvedValue(null);

      const result = await service.generateRecommendations(request);

      result.recommendations.forEach((rec) => {
        expect(rec.reasons).toBeDefined();
        expect(Array.isArray(rec.reasons)).toBe(true);
        expect(rec.score).toBeGreaterThanOrEqual(0);
        expect(rec.score).toBeLessThanOrEqual(1);
      });
    });

    it('should respect recommendation limit', async () => {
      const request: RecommendationRequest = {
        userId: 'user-123',
        type: RecommendationType.PROPERTY,
        limit: 3,
      };

      mockCacheManager.get.mockResolvedValue(null);

      const result = await service.generateRecommendations(request);

      expect(result.recommendations.length).toBeLessThanOrEqual(3);
    });
  });

  describe('recordInteraction', () => {
    it('should record user interaction', async () => {
      const interaction = {
        userId: 'user-123',
        itemId: 'property-456',
        interaction: 'view' as const,
        timestamp: new Date(),
      };

      mockCacheManager.get.mockResolvedValue([]);

      await service.recordInteraction(interaction);

      expect(mockCacheManager.set).toHaveBeenCalled();
    });
  });

  describe('updateUserPreferences', () => {
    it('should update user preferences', async () => {
      const preferences = {
        userId: 'user-123',
        propertyTypes: ['apartment', 'house'],
        priceRange: { min: 1000, max: 5000 },
        locations: ['New York'],
        amenities: ['parking', 'gym'],
        keywords: ['modern', 'spacious'],
      };

      await service.updateUserPreferences('user-123', preferences);

      expect(mockCacheManager.set).toHaveBeenCalled();
    });
  });
});
