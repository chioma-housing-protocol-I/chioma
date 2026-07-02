import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SearchService, SearchFilters } from './search.service';
import {
  Property,
  PropertyType,
  ListingStatus,
} from '../properties/entities/property.entity';
import { User, UserRole } from '../users/entities/user.entity';
import {
  RentAgreement,
  AgreementStatus,
} from '../rent/entities/rent-contract.entity';
import { CacheService } from '../../common/cache/cache.service';

/**
 * Builds a minimal mock SelectQueryBuilder that supports the fluent API used
 * by SearchService.  Each method returns `this` so chains work correctly.
 */
function buildMockQb(overrides: Record<string, jest.Mock> = {}) {
  const qb: Record<string, jest.Mock> = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    setParameter: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    having: jest.fn().mockReturnThis(),
    subQuery: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    getQuery: jest.fn().mockReturnValue('subquery'),
    getMany: jest.fn().mockResolvedValue([]),
    getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    getCount: jest.fn().mockResolvedValue(0),
    getRawMany: jest.fn().mockResolvedValue([]),
    getRawOne: jest.fn().mockResolvedValue(null),
    ...overrides,
  };
  return qb;
}

describe('SearchService', () => {
  let service: SearchService;
  let mockPropertyRepo: { createQueryBuilder: jest.Mock };
  let mockUserRepo: { createQueryBuilder: jest.Mock };
  let mockAgreementRepo: { createQueryBuilder: jest.Mock };
  let mockCacheService: {
    getOrSet: jest.Mock;
  };

  const sampleProperty: Partial<Property> = {
    id: 'prop-1',
    title: 'Cozy Apartment',
    city: 'Lagos',
    status: ListingStatus.PUBLISHED,
    type: PropertyType.APARTMENT,
    price: 1200,
    latitude: 6.5244,
    longitude: 3.3792,
    isFurnished: true,
    hasParking: false,
    petsAllowed: false,
    amenities: [],
    images: [],
  };

  beforeEach(async () => {
    mockPropertyRepo = {
      createQueryBuilder: jest.fn(),
    };

    mockUserRepo = {
      createQueryBuilder: jest.fn(),
    };

    mockAgreementRepo = {
      createQueryBuilder: jest.fn(),
    };

    mockCacheService = {
      getOrSet: jest.fn(async (_key: string, factory: () => Promise<unknown>) =>
        factory(),
      ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchService,
        {
          provide: getRepositoryToken(Property),
          useValue: mockPropertyRepo,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepo,
        },
        {
          provide: getRepositoryToken(RentAgreement),
          useValue: mockAgreementRepo,
        },
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
      ],
    }).compile();

    service = module.get<SearchService>(SearchService);
  });

  afterEach(() => jest.clearAllMocks());

  // ─── helpers ────────────────────────────────────────────────────────────────

  function setupQbForSearch(
    items: Partial<Property>[],
    total: number,
    facetOverrides: Record<string, jest.Mock> = {},
  ) {
    const qb = buildMockQb({
      getMany: jest.fn().mockResolvedValue(items),
      getCount: jest.fn().mockResolvedValue(total),
      getRawMany: jest.fn().mockResolvedValue([]),
      getRawOne: jest.fn().mockResolvedValue(null),
      ...facetOverrides,
    });
    mockPropertyRepo.createQueryBuilder.mockReturnValue(qb);
    return qb;
  }

  // ─── searchProperties ────────────────────────────────────────────────────────

  describe('searchProperties', () => {
    it('returns items, total, page, limit, and facets', async () => {
      setupQbForSearch([sampleProperty], 1);

      const result = await service.searchProperties({}, 1, 10);

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.facets).toBeDefined();
    });

    it('defaults to published status when no status filter is given', async () => {
      const qb = setupQbForSearch([], 0);

      await service.searchProperties({});

      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('property.status'),
        expect.objectContaining({ status: ListingStatus.PUBLISHED }),
      );
    });

    it('uses cache via CacheService.getOrSet', async () => {
      setupQbForSearch([], 0);

      await service.searchProperties({ city: 'Abuja' });

      expect(mockCacheService.getOrSet).toHaveBeenCalledTimes(1);
    });

    // ── price range filter ──────────────────────────────────────────────────

    it('applies minPrice filter', async () => {
      const qb = setupQbForSearch([], 0);
      const filters: SearchFilters = { minPrice: 500 };

      await service.searchProperties(filters);

      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('property.price >= :minPrice'),
        expect.objectContaining({ minPrice: 500 }),
      );
    });

    it('applies maxPrice filter', async () => {
      const qb = setupQbForSearch([], 0);
      const filters: SearchFilters = { maxPrice: 2000 };

      await service.searchProperties(filters);

      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('property.price <= :maxPrice'),
        expect.objectContaining({ maxPrice: 2000 }),
      );
    });

    it('applies both minPrice and maxPrice together', async () => {
      const qb = setupQbForSearch([], 0);
      const filters: SearchFilters = { minPrice: 800, maxPrice: 1500 };

      await service.searchProperties(filters);

      const calls = qb.andWhere.mock.calls.map((c: unknown[]) => c[0]);
      expect(calls.some((c: unknown) => String(c).includes(':minPrice'))).toBe(
        true,
      );
      expect(calls.some((c: unknown) => String(c).includes(':maxPrice'))).toBe(
        true,
      );
    });

    // ── amenity filter ──────────────────────────────────────────────────────

    it('applies amenity filter using subquery', async () => {
      const qb = setupQbForSearch([], 0);
      const filters: SearchFilters = { amenities: ['Pool', 'Gym'] };

      await service.searchProperties(filters);

      // The amenity filter uses andWhere with a callback (subquery)
      expect(qb.andWhere).toHaveBeenCalled();
      expect(qb.setParameter).toHaveBeenCalledWith('amenityNames', [
        'pool',
        'gym',
      ]);
      expect(qb.setParameter).toHaveBeenCalledWith('amenityCount', 2);
    });

    it('does not apply amenity filter when amenities array is empty', async () => {
      const qb = setupQbForSearch([], 0);

      await service.searchProperties({ amenities: [] });

      // setParameter for amenityNames should NOT be called
      const setParamCalls = qb.setParameter.mock.calls.map(
        (c: unknown[]) => c[0],
      );
      expect(setParamCalls).not.toContain('amenityNames');
    });

    // ── proximity filter ────────────────────────────────────────────────────

    it('applies proximity (Haversine) filter when lat/lng/radiusKm are provided', async () => {
      const qb = setupQbForSearch([], 0);
      const filters: SearchFilters = { lat: 6.5244, lng: 3.3792, radiusKm: 5 };

      await service.searchProperties(filters);

      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('acos'),
        expect.objectContaining({ lat: 6.5244, lng: 3.3792, radius: 5 }),
      );
    });

    it('does not apply proximity filter when only lat is provided', async () => {
      const qb = setupQbForSearch([], 0);

      await service.searchProperties({ lat: 6.5244 });

      const calls = qb.andWhere.mock.calls.map((c: unknown[]) => c[0]);
      expect(calls.some((c: unknown) => String(c).includes('acos'))).toBe(
        false,
      );
    });

    it('does not apply proximity filter when radiusKm is missing', async () => {
      const qb = setupQbForSearch([], 0);

      await service.searchProperties({ lat: 6.5244, lng: 3.3792 });

      const calls = qb.andWhere.mock.calls.map((c: unknown[]) => c[0]);
      expect(calls.some((c: unknown) => String(c).includes('acos'))).toBe(
        false,
      );
    });

    // ── boolean filters ─────────────────────────────────────────────────────

    it('applies isFurnished filter', async () => {
      const qb = setupQbForSearch([], 0);

      await service.searchProperties({ isFurnished: true });

      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('is_furnished'),
        expect.objectContaining({ isFurnished: true }),
      );
    });

    it('applies hasParking filter', async () => {
      const qb = setupQbForSearch([], 0);

      await service.searchProperties({ hasParking: true });

      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('has_parking'),
        expect.objectContaining({ hasParking: true }),
      );
    });

    it('applies petsAllowed filter', async () => {
      const qb = setupQbForSearch([], 0);

      await service.searchProperties({ petsAllowed: false });

      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('pets_allowed'),
        expect.objectContaining({ petsAllowed: false }),
      );
    });

    it('applies location, type, and explicit status filters', async () => {
      const qb = setupQbForSearch([], 0);

      await service.searchProperties({
        city: 'Lagos',
        state: 'Lagos State',
        country: 'NG',
        type: PropertyType.APARTMENT,
        status: ListingStatus.DRAFT,
      });

      expect(qb.andWhere).toHaveBeenCalledWith('property.city ILIKE :city', {
        city: '%Lagos%',
      });
      expect(qb.andWhere).toHaveBeenCalledWith('property.state ILIKE :state', {
        state: '%Lagos State%',
      });
      expect(qb.andWhere).toHaveBeenCalledWith('property.country = :country', {
        country: 'NG',
      });
      expect(qb.andWhere).toHaveBeenCalledWith('property.type = :type', {
        type: PropertyType.APARTMENT,
      });
      expect(qb.andWhere).toHaveBeenCalledWith('property.status = :status', {
        status: ListingStatus.DRAFT,
      });
    });

    it('applies bedroom and bathroom minimum filters', async () => {
      const qb = setupQbForSearch([], 0);

      await service.searchProperties({ bedrooms: 2, bathrooms: 1 });

      expect(qb.andWhere).toHaveBeenCalledWith(
        'property.bedrooms >= :bedrooms',
        { bedrooms: 2 },
      );
      expect(qb.andWhere).toHaveBeenCalledWith(
        'property.bathrooms >= :bathrooms',
        { bathrooms: 1 },
      );
    });

    // ── full-text search ────────────────────────────────────────────────────

    it('applies full-text search_vector filter when query is provided', async () => {
      const qb = setupQbForSearch([], 0);

      await service.searchProperties({ query: 'modern apartment' });

      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('search_vector'),
        expect.objectContaining({ query: 'modern apartment' }),
      );
    });

    // ── pagination ──────────────────────────────────────────────────────────

    it('applies skip and take for pagination', async () => {
      const qb = setupQbForSearch([], 0);

      await service.searchProperties({}, 3, 15);

      expect(qb.skip).toHaveBeenCalledWith(30); // (3-1)*15
      expect(qb.take).toHaveBeenCalledWith(15);
    });
  });

  // ─── facets ──────────────────────────────────────────────────────────────────

  describe('facets', () => {
    it('returns price range facets with real counts', async () => {
      const qb = buildMockQb({
        getMany: jest.fn().mockResolvedValue([]),
        getCount: jest.fn().mockResolvedValue(0),
        getRawMany: jest.fn().mockResolvedValue([]),
        getRawOne: jest
          .fn()
          // First call: amenity counts
          .mockResolvedValueOnce({
            furnished: '3',
            parking: '2',
            pets_allowed: '1',
          })
          // Second call: price range counts
          .mockResolvedValueOnce({
            range0: '5',
            range1: '10',
            range2: '8',
            range3: '3',
          }),
      });
      mockPropertyRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.searchProperties({});

      expect(result.facets.priceRanges).toHaveLength(4);
      // Counts come from the mocked getRawOne responses
      const labels = result.facets.priceRanges.map((r) => r.label);
      expect(labels).toContain('Under $500');
      expect(labels).toContain('$500-$1000');
      expect(labels).toContain('$1000-$2000');
      expect(labels).toContain('Over $2000');
    });

    it('returns amenity facets', async () => {
      const qb = buildMockQb({
        getMany: jest.fn().mockResolvedValue([]),
        getCount: jest.fn().mockResolvedValue(0),
        getRawMany: jest.fn().mockResolvedValue([]),
        getRawOne: jest
          .fn()
          .mockResolvedValueOnce({
            furnished: '7',
            parking: '4',
            pets_allowed: '2',
          })
          .mockResolvedValueOnce(null),
      });
      mockPropertyRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.searchProperties({});

      expect(result.facets.amenities.furnished).toBe(7);
      expect(result.facets.amenities.parking).toBe(4);
      expect(result.facets.amenities.petsAllowed).toBe(2);
    });

    it('handles null facet rows gracefully', async () => {
      const qb = buildMockQb({
        getMany: jest.fn().mockResolvedValue([]),
        getCount: jest.fn().mockResolvedValue(0),
        getRawMany: jest.fn().mockResolvedValue([]),
        getRawOne: jest.fn().mockResolvedValue(null),
      });
      mockPropertyRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.searchProperties({});

      expect(result.facets.amenities.furnished).toBe(0);
      expect(result.facets.amenities.parking).toBe(0);
      expect(result.facets.amenities.petsAllowed).toBe(0);
    });

    it('maps type and city facet rows to numeric counts', async () => {
      const qb = buildMockQb({
        getMany: jest.fn().mockResolvedValue([]),
        getCount: jest.fn().mockResolvedValue(0),
        getRawMany: jest
          .fn()
          .mockResolvedValueOnce([{ type: PropertyType.HOUSE, count: '4' }])
          .mockResolvedValueOnce([{ city: 'Accra', count: '3' }]),
        getRawOne: jest.fn().mockResolvedValue(null),
      });
      mockPropertyRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.searchProperties({});

      expect(result.facets.types).toEqual([
        { type: PropertyType.HOUSE, count: 4 },
      ]);
      expect(result.facets.cities).toEqual([{ city: 'Accra', count: 3 }]);
    });
  });

  // ─── suggest ─────────────────────────────────────────────────────────────────

  describe('suggest', () => {
    it('returns empty array for queries shorter than 2 characters', async () => {
      const result = await service.suggest('a');
      expect(result).toEqual([]);
      expect(mockPropertyRepo.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('returns empty array for empty string', async () => {
      const result = await service.suggest('');
      expect(result).toEqual([]);
    });

    it('returns deduplicated title and city suggestions', async () => {
      const qb = buildMockQb({
        getMany: jest.fn().mockResolvedValue([
          { title: 'Modern Flat', city: 'Lagos' },
          { title: 'Cozy Studio', city: 'Lagos' },
        ]),
      });
      mockPropertyRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.suggest('mo');

      expect(result).toContain('Modern Flat');
      expect(result).toContain('Lagos');
      // Lagos should appear only once despite two properties in same city
      expect(result.filter((s) => s === 'Lagos')).toHaveLength(1);
    });

    it('limits suggestions after combining titles and cities', async () => {
      const qb = buildMockQb({
        getMany: jest.fn().mockResolvedValue([
          { title: 'Modern Flat', city: 'Lagos' },
          { title: 'Modern Duplex', city: 'Abuja' },
          { title: 'Modern Loft', city: 'Kigali' },
        ]),
      });
      mockPropertyRepo.createQueryBuilder.mockReturnValue(qb);

      await expect(service.suggest('mo', 3)).resolves.toHaveLength(3);
      expect(qb.limit).toHaveBeenCalledWith(3);
    });

    it('uses cache for suggestions', async () => {
      const qb = buildMockQb({
        getMany: jest.fn().mockResolvedValue([]),
      });
      mockPropertyRepo.createQueryBuilder.mockReturnValue(qb);

      await service.suggest('mo');

      expect(mockCacheService.getOrSet).toHaveBeenCalledTimes(1);
    });
  });

  // ─── searchUsers ──────────────────────────────────────────────────────────────

  describe('searchUsers', () => {
    function setupQbForUsers(items: Partial<User>[], total: number) {
      const qb = buildMockQb({
        getManyAndCount: jest.fn().mockResolvedValue([items, total]),
      });
      mockUserRepo.createQueryBuilder.mockReturnValue(qb);
      return qb;
    }

    const sampleUser: Partial<User> = {
      id: 'user-1',
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
      role: UserRole.USER,
      isActive: true,
    };

    it('returns paginated user results', async () => {
      setupQbForUsers([sampleUser], 1);

      const result = await service.searchUsers({}, 1, 10);

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });

    it('applies skip and take for pagination', async () => {
      const qb = setupQbForUsers([], 0);

      await service.searchUsers({}, 3, 15);

      expect(qb.skip).toHaveBeenCalledWith(30);
      expect(qb.take).toHaveBeenCalledWith(15);
    });

    it('filters by query on name and email', async () => {
      const qb = setupQbForUsers([], 0);

      await service.searchUsers({ query: 'john' });

      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('firstName'),
        expect.objectContaining({ query: '%john%' }),
      );
    });

    it('filters by role', async () => {
      const qb = setupQbForUsers([], 0);

      await service.searchUsers({ role: UserRole.ADMIN });

      expect(qb.andWhere).toHaveBeenCalledWith('user.role = :role', {
        role: UserRole.ADMIN,
      });
    });

    it('filters by isActive', async () => {
      const qb = setupQbForUsers([], 0);

      await service.searchUsers({ isActive: false });

      expect(qb.andWhere).toHaveBeenCalledWith('user.isActive = :isActive', {
        isActive: false,
      });
    });

    it('filters by kycVerified', async () => {
      const qb = setupQbForUsers([], 0);

      await service.searchUsers({ kycVerified: true });

      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('APPROVED'),
      );
    });

    it('orders by createdAt desc by default', async () => {
      const qb = setupQbForUsers([], 0);

      await service.searchUsers({});

      expect(qb.orderBy).toHaveBeenCalledWith('user.createdAt', 'DESC');
    });

    it('sanitizes sortBy to prevent injection', async () => {
      const qb = setupQbForUsers([], 0);

      await service.searchUsers({ sortBy: 'injection()', sortOrder: 'asc' });

      expect(qb.orderBy).toHaveBeenCalledWith('user.createdAt', 'ASC');
    });
  });

  // ─── searchDocuments ─────────────────────────────────────────────────────────

  describe('searchDocuments', () => {
    function setupQbForDocs(items: Partial<RentAgreement>[], total: number) {
      const qb = buildMockQb({
        getManyAndCount: jest.fn().mockResolvedValue([items, total]),
      });
      mockAgreementRepo.createQueryBuilder.mockReturnValue(qb);
      return qb;
    }

    const sampleDoc: Partial<RentAgreement> = {
      id: 'agreement-1',
      agreementNumber: 'AGR-001',
      monthlyRent: 1200,
      status: AgreementStatus.ACTIVE,
    };

    it('returns paginated document results', async () => {
      setupQbForDocs([sampleDoc], 1);

      const result = await service.searchDocuments({}, 1, 10);

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });

    it('applies skip and take for pagination', async () => {
      const qb = setupQbForDocs([], 0);

      await service.searchDocuments({}, 3, 15);

      expect(qb.skip).toHaveBeenCalledWith(30);
      expect(qb.take).toHaveBeenCalledWith(15);
    });

    it('filters by query on agreement number', async () => {
      const qb = setupQbForDocs([], 0);

      await service.searchDocuments({ query: 'AGR' });

      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('agreementNumber'),
        expect.objectContaining({ query: '%agr%' }),
      );
    });

    it('filters by status', async () => {
      const qb = setupQbForDocs([], 0);

      await service.searchDocuments({ status: AgreementStatus.ACTIVE });

      expect(qb.andWhere).toHaveBeenCalledWith('agreement.status = :status', {
        status: AgreementStatus.ACTIVE,
      });
    });

    it('filters by propertyId', async () => {
      const qb = setupQbForDocs([], 0);

      await service.searchDocuments({ propertyId: 'prop-1' });

      expect(qb.andWhere).toHaveBeenCalledWith(
        'agreement.propertyId = :propertyId',
        { propertyId: 'prop-1' },
      );
    });

    it('filters by userId', async () => {
      const qb = setupQbForDocs([], 0);

      await service.searchDocuments({ userId: 'user-1' });

      expect(qb.andWhere).toHaveBeenCalledWith('agreement.userId = :userId', {
        userId: 'user-1',
      });
    });

    it('filters by minRent and maxRent', async () => {
      const qb = setupQbForDocs([], 0);

      await service.searchDocuments({ minRent: 500, maxRent: 2000 });

      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('minRent'),
        { minRent: 500 },
      );
      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('maxRent'),
        { maxRent: 2000 },
      );
    });

    it('filters by date range', async () => {
      const qb = setupQbForDocs([], 0);

      await service.searchDocuments({
        dateFrom: '2024-01-01',
        dateTo: '2024-12-31',
      });

      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('dateFrom'),
        expect.objectContaining({ dateFrom: new Date('2024-01-01') }),
      );
      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('dateTo'),
        expect.objectContaining({ dateTo: new Date('2024-12-31') }),
      );
    });

    it('sanitizes sortBy to prevent injection', async () => {
      const qb = setupQbForDocs([], 0);

      await service.searchDocuments({ sortBy: 'DROP TABLE' });

      expect(qb.orderBy).toHaveBeenCalledWith('agreement.createdAt', 'DESC');
    });
  });
});
