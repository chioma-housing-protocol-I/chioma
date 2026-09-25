import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  Property,
  ListingStatus,
  PropertyType,
} from '../properties/entities/property.entity';
import { UserPreferences } from './entities/user-preferences.entity';
import { MatchingAiService } from './matching-ai.service';
import { CacheService } from '../../common/cache/cache.service';

describe('MatchingAiService', () => {
  let service: MatchingAiService;

  const mockPropertyRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
  };

  const mockPreferencesRepo = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockCacheService = {
    // Bypass the cache layer entirely so tests exercise the factory directly.
    getOrSet: jest.fn((_key: string, factory: () => Promise<unknown>) =>
      factory(),
    ),
    invalidate: jest.fn(),
  };

  const basePreferences: Partial<UserPreferences> = {
    userId: 'user-1',
    preferredCity: 'Lagos',
    maxBudget: 500000,
    minBudget: null,
    bedrooms: 2,
    bathrooms: null,
    preferredType: null,
    petsRequired: false,
    parkingRequired: false,
    furnishedRequired: false,
    preferredAmenities: null,
  };

  const baseProperty: Partial<Property> = {
    id: 'prop-1',
    title: 'Nice Flat',
    city: 'Lagos',
    price: 400000 as any,
    bedrooms: 2,
    bathrooms: 1,
    type: PropertyType.APARTMENT,
    status: ListingStatus.PUBLISHED,
    petsAllowed: false,
    hasParking: false,
    isFurnished: false,
    amenities: [],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MatchingAiService,
        {
          provide: getRepositoryToken(Property),
          useValue: mockPropertyRepo,
        },
        {
          provide: getRepositoryToken(UserPreferences),
          useValue: mockPreferencesRepo,
        },
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
      ],
    }).compile();

    service = module.get<MatchingAiService>(MatchingAiService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getRecommendations', () => {
    it('returns the latest published properties when the user has no preferences', async () => {
      mockPreferencesRepo.findOne.mockResolvedValue(null);
      mockPropertyRepo.find.mockResolvedValue([baseProperty]);

      const result = await service.getRecommendations('user-1', 10);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        propertyId: 'prop-1',
        score: 0,
        matchPercentage: 0,
        reasons: ['no_preferences_set'],
      });
    });

    it('scores and ranks properties against the user preferences', async () => {
      mockPreferencesRepo.findOne.mockResolvedValue(basePreferences);
      mockPropertyRepo.find.mockResolvedValue([baseProperty]);

      const result = await service.getRecommendations('user-1', 10);

      expect(result).toHaveLength(1);
      expect(result[0].propertyId).toBe('prop-1');
      expect(result[0].score).toBeGreaterThan(0);
      expect(result[0].reasons).toEqual(
        expect.arrayContaining([
          'city_match',
          'within_budget',
          'bedroom_match',
        ]),
      );
    });

    it('respects the requested limit', async () => {
      mockPreferencesRepo.findOne.mockResolvedValue(null);
      mockPropertyRepo.find.mockResolvedValue([
        { ...baseProperty, id: 'a' },
        { ...baseProperty, id: 'b' },
        { ...baseProperty, id: 'c' },
      ]);

      const result = await service.getRecommendations('user-1', 2);

      expect(result).toHaveLength(2);
    });
  });

  describe('getMatchScore', () => {
    it('returns a zero score when the property does not exist', async () => {
      mockPreferencesRepo.findOne.mockResolvedValue(basePreferences);
      mockPropertyRepo.findOne.mockResolvedValue(null);

      const result = await service.getMatchScore('user-1', 'missing-prop');

      expect(result).toEqual({
        propertyId: 'missing-prop',
        score: 0,
        matchPercentage: 0,
        reasons: ['property_not_found'],
      });
    });

    it('returns a zero score when the user has no preferences', async () => {
      mockPreferencesRepo.findOne.mockResolvedValue(null);
      mockPropertyRepo.findOne.mockResolvedValue(baseProperty);

      const result = await service.getMatchScore('user-1', 'prop-1');

      expect(result).toEqual({
        propertyId: 'prop-1',
        score: 0,
        matchPercentage: 0,
        reasons: ['no_preferences_set'],
      });
    });

    it('computes a match score when both property and preferences exist', async () => {
      mockPreferencesRepo.findOne.mockResolvedValue(basePreferences);
      mockPropertyRepo.findOne.mockResolvedValue(baseProperty);

      const result = await service.getMatchScore('user-1', 'prop-1');

      expect(result.propertyId).toBe('prop-1');
      expect(result.score).toBeGreaterThan(0);
      expect(result.reasons.length).toBeGreaterThan(0);
    });
  });

  describe('getSimilarProperties', () => {
    it('returns an empty array when the source property does not exist', async () => {
      mockPropertyRepo.findOne.mockResolvedValue(null);

      const result = await service.getSimilarProperties('missing-prop', 5);

      expect(result).toEqual([]);
    });

    it('excludes the source property from the results', async () => {
      mockPropertyRepo.findOne.mockResolvedValue(baseProperty);
      mockPropertyRepo.find.mockResolvedValue([baseProperty]);

      const result = await service.getSimilarProperties('prop-1', 5);

      expect(result).toEqual([]);
    });

    it('ranks candidates by similarity score', async () => {
      mockPropertyRepo.findOne.mockResolvedValue(baseProperty);
      mockPropertyRepo.find.mockResolvedValue([
        baseProperty,
        {
          ...baseProperty,
          id: 'prop-2',
          bedrooms: 2,
          bathrooms: 1,
          isFurnished: false,
          petsAllowed: false,
          hasParking: false,
          price: 410000 as any,
        },
        {
          ...baseProperty,
          id: 'prop-3',
          bedrooms: 5,
          bathrooms: 4,
          price: 2000000 as any,
        },
      ]);

      const result = await service.getSimilarProperties('prop-1', 5);

      expect(result).toHaveLength(2);
      expect(result[0].propertyId).toBe('prop-2');
      expect(result[0].similarityScore).toBeGreaterThan(
        result[1].similarityScore,
      );
    });
  });

  describe('updatePreferences', () => {
    it('creates new preferences when none exist yet', async () => {
      mockPreferencesRepo.findOne.mockResolvedValue(null);
      mockPreferencesRepo.create.mockImplementation((data) => data);
      mockPreferencesRepo.save.mockImplementation((data) =>
        Promise.resolve({ id: 'new-id', ...data }),
      );

      const dto = { preferredCity: 'Abuja' };
      const result = await service.updatePreferences('user-1', dto);

      expect(mockPreferencesRepo.create).toHaveBeenCalledWith({
        userId: 'user-1',
        ...dto,
      });
      expect(result).toMatchObject({ id: 'new-id', preferredCity: 'Abuja' });
      expect(mockCacheService.invalidate).toHaveBeenCalledWith(
        'ai:recommendations:user-1:*',
      );
    });

    it('updates existing preferences in place', async () => {
      const existing = { ...basePreferences };
      mockPreferencesRepo.findOne.mockResolvedValue(existing);
      mockPreferencesRepo.save.mockImplementation((data) =>
        Promise.resolve(data),
      );

      const dto = { preferredCity: 'Kano' };
      const result = await service.updatePreferences('user-1', dto);

      expect(mockPreferencesRepo.create).not.toHaveBeenCalled();
      expect(result.preferredCity).toBe('Kano');
    });
  });

  describe('getPreferences', () => {
    it('returns the stored preferences', async () => {
      mockPreferencesRepo.findOne.mockResolvedValue(basePreferences);

      const result = await service.getPreferences('user-1');

      expect(result).toEqual(basePreferences);
    });

    it('returns null when the user has no preferences', async () => {
      mockPreferencesRepo.findOne.mockResolvedValue(null);

      const result = await service.getPreferences('user-1');

      expect(result).toBeNull();
    });
  });
});
