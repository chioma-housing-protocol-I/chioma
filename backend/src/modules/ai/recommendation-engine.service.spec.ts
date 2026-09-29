import { Test, TestingModule } from '@nestjs/testing';
import {
  PropertyCandidate,
  RecommendationEngineService,
  UserPreference,
} from './recommendation-engine.service';

describe('RecommendationEngineService', () => {
  let service: RecommendationEngineService;

  const candidates: PropertyCandidate[] = [
    {
      propertyId: 'p1',
      city: 'Lagos',
      monthlyRent: 400000,
      bedrooms: 2,
      amenities: ['WiFi', 'Pool'],
    },
    {
      propertyId: 'p2',
      city: 'Abuja',
      monthlyRent: 800000,
      bedrooms: 3,
      amenities: ['Gym'],
    },
    {
      propertyId: 'p3',
      city: 'Lagos',
      monthlyRent: 900000,
      bedrooms: 1,
      amenities: [],
    },
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RecommendationEngineService],
    }).compile();

    service = module.get<RecommendationEngineService>(
      RecommendationEngineService,
    );
  });

  describe('recommend', () => {
    it('returns candidates sorted by descending score', () => {
      const preferences: UserPreference = {
        preferredCity: 'Lagos',
        maxBudget: 500000,
        bedrooms: 2,
        preferredAmenities: ['WiFi', 'Pool'],
      };

      const result = service.recommend(preferences, candidates);

      expect(result).toHaveLength(3);
      expect(result[0].propertyId).toBe('p1');
      expect(result[0].score).toBeGreaterThan(result[1].score);
      expect(result[1].score).toBeGreaterThanOrEqual(result[2].score);
    });

    it('scores city, budget, bedroom, and amenity matches independently', () => {
      const preferences: UserPreference = {
        preferredCity: 'Lagos',
        maxBudget: 500000,
        bedrooms: 2,
        preferredAmenities: ['WiFi', 'Pool'],
      };

      const [top] = service.recommend(preferences, [candidates[0]]);

      // city_match(35) + within_budget(25) + bedroom_match(20) + amenity_match(min(20, 2*5)=10)
      expect(top.score).toBe(90);
      expect(top.reasons).toEqual(
        expect.arrayContaining([
          'city_match',
          'within_budget',
          'bedroom_match',
          'amenity_match',
        ]),
      );
    });

    it('caps amenity score at 20 regardless of how many amenities match', () => {
      const preferences: UserPreference = {
        preferredAmenities: ['a', 'b', 'c', 'd', 'e'],
      };
      const candidate: PropertyCandidate = {
        propertyId: 'p-many',
        city: 'Lagos',
        monthlyRent: 100000,
        bedrooms: 1,
        amenities: ['a', 'b', 'c', 'd', 'e'],
      };

      const [result] = service.recommend(preferences, [candidate]);

      expect(result.score).toBe(20);
      expect(result.reasons).toEqual(['amenity_match']);
    });

    it('gives a zero score with no reasons when nothing matches', () => {
      const preferences: UserPreference = {
        preferredCity: 'Kano',
        maxBudget: 1000,
        bedrooms: 10,
      };

      const [result] = service.recommend(preferences, [candidates[0]]);

      expect(result.score).toBe(0);
      expect(result.reasons).toEqual([]);
    });

    it('returns an empty array when there are no candidates', () => {
      const result = service.recommend({ preferredCity: 'Lagos' }, []);

      expect(result).toEqual([]);
    });

    it('does not mutate the input candidates', () => {
      const original = JSON.parse(JSON.stringify(candidates));

      service.recommend({ preferredCity: 'Lagos' }, candidates);

      expect(candidates).toEqual(original);
    });
  });
});
