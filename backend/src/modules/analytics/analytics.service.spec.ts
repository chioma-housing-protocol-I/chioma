import { ListingStatus } from '../properties/entities/property.entity';
import { PropertyInquiryStatus } from '../inquiries/entities/property-inquiry.entity';
import { AnalyticsService } from './analytics.service';

describe('AnalyticsService', () => {
  const propertyRepository = {
    find: jest.fn(),
  };

  const inquiryRepository = {
    find: jest.fn(),
  };

  const subletBookingRepository = {
    find: jest.fn(),
  };

  const paymentRepository = {
    find: jest.fn(),
  };

  const auditLogRepository = {
    find: jest.fn(),
  };

  const queueManagementService = {
    addAnalyticsJob: jest.fn(),
  };

  let service: AnalyticsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AnalyticsService(
      propertyRepository as any,
      inquiryRepository as any,
      subletBookingRepository as any,
      paymentRepository as any,
      auditLogRepository as any,
      queueManagementService as any,
    );
  });

  it('builds landlord analytics summary and conversion metrics', async () => {
    propertyRepository.find.mockResolvedValue([
      {
        id: 'property-1',
        title: 'Lekki One',
        city: 'Lagos',
        status: ListingStatus.PUBLISHED,
        viewCount: 120,
        favoriteCount: 25,
        createdAt: new Date('2026-03-01T00:00:00.000Z'),
      },
      {
        id: 'property-2',
        title: 'Lekki Two',
        city: 'Lagos',
        status: ListingStatus.DRAFT,
        viewCount: 30,
        favoriteCount: 6,
        createdAt: new Date('2026-03-04T00:00:00.000Z'),
      },
    ]);

    inquiryRepository.find.mockResolvedValue([
      {
        id: 'inq-1',
        propertyId: 'property-1',
        status: PropertyInquiryStatus.VIEWED,
        createdAt: new Date(),
      },
      {
        id: 'inq-2',
        propertyId: 'property-1',
        status: PropertyInquiryStatus.PENDING,
        createdAt: new Date(),
      },
      {
        id: 'inq-3',
        propertyId: 'property-2',
        status: PropertyInquiryStatus.VIEWED,
        createdAt: new Date(),
      },
    ]);

    const result = await service.getLandlordDashboard('landlord-1', 30);

    expect(result.summary.totalProperties).toBe(2);
    expect(result.summary.publishedProperties).toBe(1);
    expect(result.summary.totalViews).toBe(150);
    expect(result.summary.totalFavorites).toBe(31);
    expect(result.summary.totalInquiries).toBe(3);
    expect(result.summary.conversionRate).toBe(2);
    expect(result.performance.inquiryResponseRate).toBe(66.67);
    expect(result.topPerformingProperties).toHaveLength(2);
    expect(result.marketTrends.inquiryTrend).toHaveLength(30);
    expect(result.marketTrends.cityTrends[0].city).toBe('Lagos');
  });

  it('returns safe zero values when no properties exist', async () => {
    propertyRepository.find.mockResolvedValue([]);
    inquiryRepository.find.mockResolvedValue([]);

    const result = await service.getLandlordDashboard('landlord-2', 15);

    expect(result.summary.totalProperties).toBe(0);
    expect(result.summary.totalViews).toBe(0);
    expect(result.summary.totalInquiries).toBe(0);
    expect(result.summary.conversionRate).toBe(0);
    expect(result.performance.averageViewsPerProperty).toBe(0);
    expect(result.marketTrends.cityTrends).toEqual([]);
    expect(result.marketTrends.inquiryTrend).toHaveLength(15);
  });

  it('sums platform fees from sublet bookings for a landlord', async () => {
    subletBookingRepository.find.mockResolvedValue([
      { platformFee: 50000, landlordId: 'landlord-1' },
      { platformFee: 35000, landlordId: 'landlord-1' },
      { platformFee: 15000, landlordId: 'landlord-1' },
    ]);

    const result = await service.getLandlordFeesSummary('landlord-1');

    expect(result.totalPlatformFees).toBe(100000);
    expect(result.bookingCount).toBe(3);
  });

  it('returns zero fees when landlord has no sublet bookings', async () => {
    subletBookingRepository.find.mockResolvedValue([]);

    const result = await service.getLandlordFeesSummary('landlord-2');

    expect(result.totalPlatformFees).toBe(0);
    expect(result.bookingCount).toBe(0);
  });
});
