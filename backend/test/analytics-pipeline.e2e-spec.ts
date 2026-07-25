import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AnalyticsService } from '../src/modules/analytics/analytics.service';
import {
  Property,
  ListingStatus,
} from '../src/modules/properties/entities/property.entity';
import {
  PropertyInquiry,
  PropertyInquiryStatus,
} from '../src/modules/inquiries/entities/property-inquiry.entity';

describe('Analytics Data Pipeline Integration', () => {
  let service: AnalyticsService;

  const mockPropertyRepository = { find: jest.fn() };
  const mockInquiryRepository = { find: jest.fn() };

  const OWNER_ID = 'landlord-001';

  const makeProperty = (overrides: Partial<Property> = {}): Property =>
    ({
      id: 'prop-001',
      ownerId: OWNER_ID,
      title: 'Test Property',
      city: 'Lagos',
      status: ListingStatus.PUBLISHED,
      viewCount: 100,
      favoriteCount: 20,
      createdAt: new Date('2026-01-01'),
      ...overrides,
    }) as Property;

  const makeInquiry = (
    overrides: Partial<PropertyInquiry> = {},
  ): PropertyInquiry =>
    ({
      id: 'inq-001',
      propertyId: 'prop-001',
      toUserId: OWNER_ID,
      status: PropertyInquiryStatus.PENDING,
      createdAt: new Date(),
      ...overrides,
    }) as PropertyInquiry;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        {
          provide: getRepositoryToken(Property),
          useValue: mockPropertyRepository,
        },
        {
          provide: getRepositoryToken(PropertyInquiry),
          useValue: mockInquiryRepository,
        },
      ],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
    jest.clearAllMocks();
  });

  describe('Event tracking and collection', () => {
    it('returns a dashboard with correct summary totals', async () => {
      const properties = [
        makeProperty({ id: 'prop-001', viewCount: 80, favoriteCount: 10 }),
        makeProperty({
          id: 'prop-002',
          viewCount: 60,
          favoriteCount: 15,
          status: ListingStatus.PUBLISHED,
        }),
      ];
      const inquiries = [
        makeInquiry({ propertyId: 'prop-001' }),
        makeInquiry({ propertyId: 'prop-001', id: 'inq-002' }),
      ];
      mockPropertyRepository.find.mockResolvedValue(properties);
      mockInquiryRepository.find.mockResolvedValue(inquiries);

      const result = await service.getLandlordDashboard(OWNER_ID, 30);

      expect(result.summary.totalProperties).toBe(2);
      expect(result.summary.totalViews).toBe(140);
      expect(result.summary.totalFavorites).toBe(25);
      expect(result.summary.totalInquiries).toBe(2);
    });

    it('counts only published properties in publishedProperties', async () => {
      const properties = [
        makeProperty({ id: 'prop-001', status: ListingStatus.PUBLISHED }),
        makeProperty({ id: 'prop-002', status: ListingStatus.DRAFT }),
        makeProperty({ id: 'prop-003', status: ListingStatus.PUBLISHED }),
      ];
      mockPropertyRepository.find.mockResolvedValue(properties);
      mockInquiryRepository.find.mockResolvedValue([]);

      const result = await service.getLandlordDashboard(OWNER_ID, 30);

      expect(result.summary.publishedProperties).toBe(2);
    });
  });

  describe('Data aggregation', () => {
    it('calculates average views per property correctly', async () => {
      const properties = [
        makeProperty({ id: 'prop-001', viewCount: 100 }),
        makeProperty({ id: 'prop-002', viewCount: 50 }),
      ];
      mockPropertyRepository.find.mockResolvedValue(properties);
      mockInquiryRepository.find.mockResolvedValue([]);

      const result = await service.getLandlordDashboard(OWNER_ID, 30);

      expect(result.performance.averageViewsPerProperty).toBe(75);
    });

    it('groups properties by city in cityTrends', async () => {
      const properties = [
        makeProperty({ id: 'prop-001', city: 'Lagos', viewCount: 100 }),
        makeProperty({ id: 'prop-002', city: 'Lagos', viewCount: 50 }),
        makeProperty({ id: 'prop-003', city: 'Abuja', viewCount: 200 }),
      ];
      mockPropertyRepository.find.mockResolvedValue(properties);
      mockInquiryRepository.find.mockResolvedValue([]);

      const result = await service.getLandlordDashboard(OWNER_ID, 30);

      const cities = result.marketTrends.cityTrends.map(
        (c: { city: string }) => c.city,
      );
      expect(cities).toContain('Lagos');
      expect(cities).toContain('Abuja');

      const abuja = result.marketTrends.cityTrends.find(
        (c: { city: string }) => c.city === 'Abuja',
      );
      expect(abuja?.totalViews).toBe(200);

      const lagos = result.marketTrends.cityTrends.find(
        (c: { city: string }) => c.city === 'Lagos',
      );
      expect(lagos?.totalViews).toBe(150);
    });

    it('builds listing status distribution across all statuses', async () => {
      const properties = [
        makeProperty({ status: ListingStatus.PUBLISHED }),
        makeProperty({ status: ListingStatus.PUBLISHED }),
        makeProperty({ status: ListingStatus.DRAFT }),
      ];
      mockPropertyRepository.find.mockResolvedValue(properties);
      mockInquiryRepository.find.mockResolvedValue([]);

      const result = await service.getLandlordDashboard(OWNER_ID, 30);

      const dist = result.marketTrends.listingStatusDistribution;
      const published = dist.find(
        (d: { status: ListingStatus }) => d.status === ListingStatus.PUBLISHED,
      );
      expect(published?.count).toBe(2);
    });
  });

  describe('Report generation', () => {
    it('includes a generatedAt timestamp in the response', async () => {
      mockPropertyRepository.find.mockResolvedValue([]);
      mockInquiryRepository.find.mockResolvedValue([]);

      const result = await service.getLandlordDashboard(OWNER_ID, 30);

      expect(result.generatedAt).toBeDefined();
      expect(typeof result.generatedAt).toBe('string');
    });

    it('includes range metadata with requested day count', async () => {
      mockPropertyRepository.find.mockResolvedValue([]);
      mockInquiryRepository.find.mockResolvedValue([]);

      const result = await service.getLandlordDashboard(OWNER_ID, 14);

      expect(result.range.days).toBe(14);
      expect(result.range.startDate).toBeDefined();
      expect(result.range.endDate).toBeDefined();
    });

    it('returns top performing properties sorted by engagement score', async () => {
      const properties = [
        makeProperty({ id: 'prop-001', viewCount: 10, favoriteCount: 1 }),
        makeProperty({ id: 'prop-002', viewCount: 500, favoriteCount: 80 }),
      ];
      const inquiries = [
        makeInquiry({ propertyId: 'prop-002', id: 'inq-001' }),
        makeInquiry({ propertyId: 'prop-002', id: 'inq-002' }),
      ];
      mockPropertyRepository.find.mockResolvedValue(properties);
      mockInquiryRepository.find.mockResolvedValue(inquiries);

      const result = await service.getLandlordDashboard(OWNER_ID, 30);

      expect(result.topPerformingProperties[0].propertyId).toBe('prop-002');
    });
  });

  describe('Metric calculations', () => {
    it('calculates conversion rate as percentage of views to inquiries', async () => {
      const properties = [makeProperty({ id: 'prop-001', viewCount: 200 })];
      const inquiries = [
        makeInquiry({ id: 'inq-001' }),
        makeInquiry({ id: 'inq-002' }),
      ];
      mockPropertyRepository.find.mockResolvedValue(properties);
      mockInquiryRepository.find.mockResolvedValue(inquiries);

      const result = await service.getLandlordDashboard(OWNER_ID, 30);

      expect(result.summary.conversionRate).toBe(1);
    });

    it('returns zero metrics safely when there are no properties', async () => {
      mockPropertyRepository.find.mockResolvedValue([]);
      mockInquiryRepository.find.mockResolvedValue([]);

      const result = await service.getLandlordDashboard(OWNER_ID, 30);

      expect(result.summary.totalProperties).toBe(0);
      expect(result.summary.totalViews).toBe(0);
      expect(result.summary.conversionRate).toBe(0);
      expect(result.performance.averageViewsPerProperty).toBe(0);
    });

    it('clamps days parameter to a valid range', async () => {
      mockPropertyRepository.find.mockResolvedValue([]);
      mockInquiryRepository.find.mockResolvedValue([]);

      const resultOver = await service.getLandlordDashboard(OWNER_ID, 999);
      expect(resultOver.range.days).toBe(365);

      const resultUnder = await service.getLandlordDashboard(OWNER_ID, 0);
      expect(resultUnder.range.days).toBe(1);
    });

    it('builds an inquiry trend with one bucket per requested day', async () => {
      mockPropertyRepository.find.mockResolvedValue([]);
      mockInquiryRepository.find.mockResolvedValue([]);

      const result = await service.getLandlordDashboard(OWNER_ID, 7);

      expect(result.marketTrends.inquiryTrend).toHaveLength(7);
    });
  });
});
