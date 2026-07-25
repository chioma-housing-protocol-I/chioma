import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PropertiesService } from '../properties.service';
import {
  Property,
  PropertyType,
  ListingStatus,
  PropertyRentalMode,
  CancellationPolicy,
} from '../entities/property.entity';
import { PropertyImage } from '../entities/property-image.entity';
import { PropertyAmenity } from '../entities/property-amenity.entity';
import { RentalUnit } from '../entities/rental-unit.entity';
import { PropertyListingDraft } from '../entities/property-listing-draft.entity';
import { CacheService } from '../../../common/cache/cache.service';
import { FraudHooksService } from '../../fraud/fraud-hooks.service';
import { QueryPropertyDto } from '../dto/query-property.dto';
import { User, UserRole, AuthMethod } from '../../users/entities/user.entity';
import { KycStatus } from '../../kyc/kyc-status.enum';

describe('PropertiesService – Pagination', () => {
  let service: PropertiesService;

  // ─── Helpers ────────────────────────────────────────────────────────────────

  function makeProperty(overrides: Partial<Property> = {}): Property {
    return {
      id: 'prop-1',
      title: 'Test Property',
      description: 'desc',
      type: PropertyType.APARTMENT,
      status: ListingStatus.PUBLISHED,
      latitude: 40.7128,
      longitude: -74.006,
      address: '1 Main St',
      city: 'New York',
      state: 'NY',
      postalCode: '10001',
      country: 'USA',
      price: 2000,
      currency: 'USD',
      bedrooms: 2,
      bathrooms: 1,
      area: 80,
      floor: 1,
      isFurnished: false,
      hasParking: false,
      petsAllowed: false,
      metadata: {},
      ownerId: 'owner-1',
      owner: {} as User,
      images: [],
      amenities: [],
      rentalUnits: [],
      viewCount: 0,
      favoriteCount: 0,
      lastViewedAt: null,
      verificationStatus: null,
      virtualTourUrl: null,
      videoUrl: null,
      floorPlanUrl: null,
      energyRating: null,
      petPolicy: null,
      parkingSpaces: null,
      rentalMode: PropertyRentalMode.LONG_TERM,
      minStayDays: 1,
      maxStayDays: null,
      nightlyRate: null,
      weeklyDiscount: 0,
      monthlyDiscount: 0,
      cleaningFee: 0,
      extraGuestFee: 0,
      maxGuests: 4,
      instantBooking: false,
      requireGuestVerification: true,
      minimumGuestRating: 0,
      cancellationPolicy: CancellationPolicy.MODERATE,
      checkInTime: '15:00',
      checkOutTime: '11:00',
      checkInMethod: 'lockbox',
      sublettingAllowed: false,
      sublettingApprovalRequired: true,
      sublettingMaxDaysPerYear: 90,
      sublettingTenantShare: 60,
      sublettingLandlordShare: 30,
      smokingAllowed: false,
      partiesAllowed: false,
      childrenAllowed: true,
      aiPricingSuggestion: null,
      aiOptimalMode: null,
      aiOccupancyPrediction: null,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
      ...overrides,
    };
  }

  function makeQueryBuilder(data: Property[], total: number) {
    const qb: any = {
      alias: 'property',
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([data, total]),
    };
    return qb;
  }

  // ─── Mocks ──────────────────────────────────────────────────────────────────

  let mockQb: any;

  const mockPropertyRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
    increment: jest.fn(),
    update: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockCacheService = {
    get: jest.fn(),
    set: jest.fn(),
    getOrSet: jest.fn(async (_key: string, factory: () => Promise<unknown>) =>
      factory(),
    ),
    invalidatePropertyDomainCaches: jest.fn().mockResolvedValue(undefined),
  };

  const mockFraudHooksService = {
    onListingPublished: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    mockCacheService.getOrSet.mockImplementation(
      async (_key: string, factory: () => Promise<unknown>) => factory(),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PropertiesService,
        {
          provide: getRepositoryToken(Property),
          useValue: mockPropertyRepository,
        },
        {
          provide: getRepositoryToken(PropertyImage),
          useValue: { create: jest.fn(), save: jest.fn(), delete: jest.fn() },
        },
        {
          provide: getRepositoryToken(PropertyAmenity),
          useValue: { create: jest.fn(), save: jest.fn(), delete: jest.fn() },
        },
        {
          provide: getRepositoryToken(RentalUnit),
          useValue: { create: jest.fn(), save: jest.fn(), delete: jest.fn() },
        },
        {
          provide: getRepositoryToken(PropertyListingDraft),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            remove: jest.fn(),
          },
        },
        { provide: CacheService, useValue: mockCacheService },
        { provide: FraudHooksService, useValue: mockFraudHooksService },
      ],
    }).compile();

    service = module.get<PropertiesService>(PropertiesService);
  });

  // ─── Offset-based pagination ─────────────────────────────────────────────────

  describe('offset-based pagination', () => {
    it('should return first page with correct meta', async () => {
      const properties = [
        makeProperty({ id: 'p1' }),
        makeProperty({ id: 'p2' }),
      ];
      mockQb = makeQueryBuilder(properties, 20);
      mockPropertyRepository.createQueryBuilder.mockReturnValue(mockQb);

      const result = await service.findAll({ page: 1, limit: 2 });

      expect(result.data).toHaveLength(2);
      expect(result.meta.total).toBe(20);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(2);
    });

    it('should apply correct skip for page 2', async () => {
      mockQb = makeQueryBuilder([], 50);
      mockPropertyRepository.createQueryBuilder.mockReturnValue(mockQb);

      await service.findAll({ page: 2, limit: 10 });

      expect(mockQb.skip).toHaveBeenCalledWith(10);
      expect(mockQb.take).toHaveBeenCalledWith(10);
    });

    it('should apply correct skip for page 3 with limit 25', async () => {
      mockQb = makeQueryBuilder([], 100);
      mockPropertyRepository.createQueryBuilder.mockReturnValue(mockQb);

      await service.findAll({ page: 3, limit: 25 });

      expect(mockQb.skip).toHaveBeenCalledWith(50);
      expect(mockQb.take).toHaveBeenCalledWith(25);
    });

    it('should use default page=1 and limit=10 when not provided', async () => {
      mockQb = makeQueryBuilder([], 0);
      mockPropertyRepository.createQueryBuilder.mockReturnValue(mockQb);

      await service.findAll({});

      expect(mockQb.skip).toHaveBeenCalledWith(0);
      expect(mockQb.take).toHaveBeenCalledWith(10);
    });

    it('should handle last page with fewer items than limit', async () => {
      const properties = [makeProperty({ id: 'p-last' })];
      mockQb = makeQueryBuilder(properties, 21);
      mockPropertyRepository.createQueryBuilder.mockReturnValue(mockQb);

      const result = await service.findAll({ page: 3, limit: 10 });

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(21);
    });
  });

  // ─── Empty results ────────────────────────────────────────────────────────────

  describe('empty results', () => {
    it('should return empty data array when no properties match', async () => {
      mockQb = makeQueryBuilder([], 0);
      mockPropertyRepository.createQueryBuilder.mockReturnValue(mockQb);

      const result = await service.findAll({ status: ListingStatus.PUBLISHED });

      expect(result.data).toEqual([]);
      expect(result.meta.total).toBe(0);
    });

    it('should return empty data for page beyond total', async () => {
      mockQb = makeQueryBuilder([], 5);
      mockPropertyRepository.createQueryBuilder.mockReturnValue(mockQb);

      const result = await service.findAll({ page: 100, limit: 10 });

      expect(result.data).toEqual([]);
      expect(result.meta.total).toBe(5);
    });
  });

  // ─── Sorting ──────────────────────────────────────────────────────────────────

  describe('sorting', () => {
    it('should sort by price ASC', async () => {
      mockQb = makeQueryBuilder([], 0);
      mockPropertyRepository.createQueryBuilder.mockReturnValue(mockQb);

      await service.findAll({ sortBy: 'price', sortOrder: 'ASC' });

      expect(mockQb.orderBy).toHaveBeenCalledWith('property.price', 'ASC');
    });

    it('should sort by createdAt DESC by default', async () => {
      mockQb = makeQueryBuilder([], 0);
      mockPropertyRepository.createQueryBuilder.mockReturnValue(mockQb);

      await service.findAll({});

      expect(mockQb.orderBy).toHaveBeenCalledWith('property.createdAt', 'DESC');
    });

    it('should fallback to createdAt for invalid sort field', async () => {
      mockQb = makeQueryBuilder([], 0);
      mockPropertyRepository.createQueryBuilder.mockReturnValue(mockQb);

      await service.findAll({ sortBy: 'injectedField; DROP TABLE--' });

      expect(mockQb.orderBy).toHaveBeenCalledWith('property.createdAt', 'DESC');
    });

    it('should sort by title ASC', async () => {
      mockQb = makeQueryBuilder([], 0);
      mockPropertyRepository.createQueryBuilder.mockReturnValue(mockQb);

      await service.findAll({ sortBy: 'title', sortOrder: 'ASC' });

      expect(mockQb.orderBy).toHaveBeenCalledWith('property.title', 'ASC');
    });

    it('should sort by bedrooms DESC', async () => {
      mockQb = makeQueryBuilder([], 0);
      mockPropertyRepository.createQueryBuilder.mockReturnValue(mockQb);

      await service.findAll({ sortBy: 'bedrooms', sortOrder: 'DESC' });

      expect(mockQb.orderBy).toHaveBeenCalledWith('property.bedrooms', 'DESC');
    });
  });

  // ─── Filtering ────────────────────────────────────────────────────────────────

  describe('filtering', () => {
    it('should filter by property type', async () => {
      mockQb = makeQueryBuilder([], 0);
      mockPropertyRepository.createQueryBuilder.mockReturnValue(mockQb);

      await service.findAll({ type: PropertyType.APARTMENT });

      expect(mockQb.andWhere).toHaveBeenCalledWith('property.type = :type', {
        type: PropertyType.APARTMENT,
      });
    });

    it('should filter by listing status', async () => {
      mockQb = makeQueryBuilder([], 0);
      mockPropertyRepository.createQueryBuilder.mockReturnValue(mockQb);

      await service.findAll({ status: ListingStatus.PUBLISHED });

      expect(mockQb.andWhere).toHaveBeenCalledWith(
        'property.status = :status',
        { status: ListingStatus.PUBLISHED },
      );
    });

    it('should filter by price range', async () => {
      mockQb = makeQueryBuilder([], 0);
      mockPropertyRepository.createQueryBuilder.mockReturnValue(mockQb);

      await service.findAll({ minPrice: 1000, maxPrice: 3000 });

      expect(mockQb.andWhere).toHaveBeenCalledWith(
        'property.price >= :minPrice',
        { minPrice: 1000 },
      );
      expect(mockQb.andWhere).toHaveBeenCalledWith(
        'property.price <= :maxPrice',
        { maxPrice: 3000 },
      );
    });

    it('should filter by city (case-insensitive)', async () => {
      mockQb = makeQueryBuilder([], 0);
      mockPropertyRepository.createQueryBuilder.mockReturnValue(mockQb);

      await service.findAll({ city: 'Lagos' });

      expect(mockQb.andWhere).toHaveBeenCalledWith(
        'LOWER(property.city) = LOWER(:city)',
        { city: 'Lagos' },
      );
    });

    it('should filter by ownerId', async () => {
      mockQb = makeQueryBuilder([], 0);
      mockPropertyRepository.createQueryBuilder.mockReturnValue(mockQb);

      await service.findAll({ ownerId: 'owner-uuid' });

      expect(mockQb.andWhere).toHaveBeenCalledWith(
        'property.ownerId = :ownerId',
        { ownerId: 'owner-uuid' },
      );
    });

    it('should apply full-text search on title and description', async () => {
      mockQb = makeQueryBuilder([], 0);
      mockPropertyRepository.createQueryBuilder.mockReturnValue(mockQb);

      await service.findAll({ search: 'modern apartment' });

      expect(mockQb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('LOWER(property.title) LIKE LOWER(:search)'),
        { search: '%modern apartment%' },
      );
    });

    it('should filter by boolean attributes (isFurnished)', async () => {
      mockQb = makeQueryBuilder([], 0);
      mockPropertyRepository.createQueryBuilder.mockReturnValue(mockQb);

      await service.findAll({ isFurnished: true });

      expect(mockQb.andWhere).toHaveBeenCalledWith(
        'property.isFurnished = :isFurnished',
        { isFurnished: true },
      );
    });

    it('should filter by bedroom range', async () => {
      mockQb = makeQueryBuilder([], 0);
      mockPropertyRepository.createQueryBuilder.mockReturnValue(mockQb);

      await service.findAll({ minBedrooms: 2, maxBedrooms: 4 });

      expect(mockQb.andWhere).toHaveBeenCalledWith(
        'property.bedrooms >= :minBedrooms',
        { minBedrooms: 2 },
      );
      expect(mockQb.andWhere).toHaveBeenCalledWith(
        'property.bedrooms <= :maxBedrooms',
        { maxBedrooms: 4 },
      );
    });

    it('should combine multiple filters', async () => {
      mockQb = makeQueryBuilder([], 0);
      mockPropertyRepository.createQueryBuilder.mockReturnValue(mockQb);

      await service.findAll({
        type: PropertyType.APARTMENT,
        status: ListingStatus.PUBLISHED,
        minPrice: 500,
        city: 'Abuja',
      });

      expect(mockQb.andWhere).toHaveBeenCalledTimes(4);
    });
  });

  // ─── Caching ──────────────────────────────────────────────────────────────────

  describe('caching', () => {
    it('should use cache for public published listings', async () => {
      mockQb = makeQueryBuilder([], 0);
      mockPropertyRepository.createQueryBuilder.mockReturnValue(mockQb);

      await service.findAll({ status: ListingStatus.PUBLISHED });

      expect(mockCacheService.getOrSet).toHaveBeenCalled();
    });

    it('should bypass cache when ownerId is provided', async () => {
      mockQb = makeQueryBuilder([], 0);
      mockPropertyRepository.createQueryBuilder.mockReturnValue(mockQb);

      await service.findAll({
        status: ListingStatus.PUBLISHED,
        ownerId: 'owner-1',
      });

      expect(mockCacheService.getOrSet).not.toHaveBeenCalled();
    });

    it('should bypass cache for non-published listings', async () => {
      mockQb = makeQueryBuilder([], 0);
      mockPropertyRepository.createQueryBuilder.mockReturnValue(mockQb);

      await service.findAll({ status: ListingStatus.DRAFT });

      expect(mockCacheService.getOrSet).not.toHaveBeenCalled();
    });
  });

  // ─── Performance ─────────────────────────────────────────────────────────────

  describe('performance', () => {
    it('should complete pagination query within acceptable time', async () => {
      const largeDataset = Array.from({ length: 100 }, (_, i) =>
        makeProperty({ id: `prop-${i}` }),
      );
      mockQb = makeQueryBuilder(largeDataset, 10000);
      mockPropertyRepository.createQueryBuilder.mockReturnValue(mockQb);

      const start = Date.now();
      const result = await service.findAll({ page: 1, limit: 100 });
      const elapsed = Date.now() - start;

      expect(result.data).toHaveLength(100);
      expect(result.meta.total).toBe(10000);
      // Service layer (no DB) should resolve in well under 100ms
      expect(elapsed).toBeLessThan(100);
    });

    it('should not execute multiple DB queries for a single findAll call', async () => {
      mockQb = makeQueryBuilder([], 0);
      mockPropertyRepository.createQueryBuilder.mockReturnValue(mockQb);

      await service.findAll({ page: 1, limit: 10 });

      expect(mockQb.getManyAndCount).toHaveBeenCalledTimes(1);
    });
  });
});
