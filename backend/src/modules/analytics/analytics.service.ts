import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import {
  Property,
  ListingStatus,
} from '../properties/entities/property.entity';
import {
  PropertyInquiry,
  PropertyInquiryStatus,
} from '../inquiries/entities/property-inquiry.entity';

export interface CityAggregate {
  city: string;
  propertyCount: number;
  totalViews: number;
  totalFavorites: number;
  totalInquiries: number;
  averageViewsPerProperty: number;
}

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(Property)
    private readonly propertyRepository: Repository<Property>,
    @InjectRepository(PropertyInquiry)
    private readonly inquiryRepository: Repository<PropertyInquiry>,
  ) {}

  async getLandlordDashboard(ownerId: string, days = 30) {
    const normalizedDays = this.normalizeDays(days);
    const endDate = new Date();
    const startDate = new Date(endDate);
    startDate.setDate(endDate.getDate() - (normalizedDays - 1));

    const properties = await this.propertyRepository.find({
      where: { ownerId },
      select: [
        'id',
        'title',
        'city',
        'status',
        'viewCount',
        'favoriteCount',
        'createdAt',
      ],
    });

    const propertyIds = properties.map((property) => property.id);
    const inquiries = propertyIds.length
      ? await this.inquiryRepository.find({
          where: {
            propertyId: In(propertyIds),
            toUserId: ownerId,
          },
          select: ['id', 'propertyId', 'status', 'createdAt'],
          order: { createdAt: 'ASC' },
        })
      : [];

    const totalProperties = properties.length;
    const publishedProperties = properties.filter(
      (property) => property.status === ListingStatus.PUBLISHED,
    ).length;

    const totalViews = properties.reduce(
      (sum, property) => sum + Number(property.viewCount ?? 0),
      0,
    );
    const totalFavorites = properties.reduce(
      (sum, property) => sum + Number(property.favoriteCount ?? 0),
      0,
    );
    const totalInquiries = inquiries.length;
    const viewedInquiries = inquiries.filter(
      (inquiry) => inquiry.status === PropertyInquiryStatus.VIEWED,
    ).length;

    const inquiriesByProperty = new Map<string, number>();
    inquiries.forEach((inquiry) => {
      inquiriesByProperty.set(
        inquiry.propertyId,
        (inquiriesByProperty.get(inquiry.propertyId) ?? 0) + 1,
      );
    });

    const topPerformingProperties = properties
      .map((property) => {
        const inquiryCount = inquiriesByProperty.get(property.id) ?? 0;
        const viewCount = Number(property.viewCount ?? 0);
        const favoriteCount = Number(property.favoriteCount ?? 0);

        return {
          propertyId: property.id,
          title: property.title,
          city: property.city,
          status: property.status,
          viewCount,
          favoriteCount,
          inquiryCount,
          conversionRate: this.toPercent(inquiryCount, viewCount),
          engagementScore: viewCount + favoriteCount * 2 + inquiryCount * 3,
        };
      })
      .sort((a, b) => b.engagementScore - a.engagementScore)
      .slice(0, 5)
      .map((property) => ({
        propertyId: property.propertyId,
        title: property.title,
        city: property.city,
        status: property.status,
        viewCount: property.viewCount,
        favoriteCount: property.favoriteCount,
        inquiryCount: property.inquiryCount,
        conversionRate: property.conversionRate,
      }));

    const inquiryTrend = this.buildInquiryTrend(
      inquiries,
      normalizedDays,
      startDate,
      endDate,
    );

    const listingStatusDistribution = this.buildStatusDistribution(properties);
    const cityTrends = this.buildCityTrends(properties, inquiriesByProperty);

    return {
      generatedAt: endDate.toISOString(),
      range: {
        days: normalizedDays,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      summary: {
        totalProperties,
        publishedProperties,
        totalViews,
        totalFavorites,
        totalInquiries,
        conversionRate: this.toPercent(totalInquiries, totalViews),
      },
      performance: {
        averageViewsPerProperty: this.safeDivide(totalViews, totalProperties),
        averageInquiriesPerProperty: this.safeDivide(
          totalInquiries,
          totalProperties,
        ),
        inquiryResponseRate: this.toPercent(viewedInquiries, totalInquiries),
        favoriteToViewRate: this.toPercent(totalFavorites, totalViews),
      },
      topPerformingProperties,
      marketTrends: {
        inquiryTrend,
        listingStatusDistribution,
        cityTrends,
      },
    };
  }

  private normalizeDays(days: number): number {
    if (!Number.isFinite(days)) {
      return 30;
    }

    return Math.min(365, Math.max(1, Math.floor(days)));
  }

  private safeDivide(numerator: number, denominator: number): number {
    if (denominator === 0) {
      return 0;
    }

    return Number((numerator / denominator).toFixed(2));
  }

  private toPercent(part: number, whole: number): number {
    if (whole === 0) {
      return 0;
    }

    return Number(((part / whole) * 100).toFixed(2));
  }

  private buildInquiryTrend(
    inquiries: Array<Pick<PropertyInquiry, 'createdAt'>>,
    days: number,
    startDate: Date,
    endDate: Date,
  ) {
    const buckets = new Map<string, number>();

    for (let offset = 0; offset < days; offset += 1) {
      const day = new Date(startDate);
      day.setDate(startDate.getDate() + offset);
      const key = this.toDateKey(day);
      buckets.set(key, 0);
    }

    inquiries.forEach((inquiry) => {
      if (inquiry.createdAt < startDate || inquiry.createdAt > endDate) {
        return;
      }

      const key = this.toDateKey(inquiry.createdAt);
      buckets.set(key, (buckets.get(key) ?? 0) + 1);
    });

    return Array.from(buckets.entries()).map(([date, count]) => ({
      date,
      inquiries: count,
    }));
  }

  private buildStatusDistribution(
    properties: Array<Pick<Property, 'status'>>,
  ): Array<{ status: ListingStatus; count: number; percentage: number }> {
    const total = properties.length;
    const counts = new Map<ListingStatus, number>();

    properties.forEach((property) => {
      const status = property.status;
      counts.set(status, (counts.get(status) ?? 0) + 1);
    });

    return Array.from(counts.entries())
      .map(([status, count]) => ({
        status,
        count,
        percentage: this.toPercent(count, total),
      }))
      .sort((a, b) => b.count - a.count);
  }

  private buildCityTrends(
    properties: Array<
      Pick<Property, 'id' | 'city' | 'viewCount' | 'favoriteCount'>
    >,
    inquiriesByProperty: Map<string, number>,
  ): CityAggregate[] {
    const cityMap = new Map<
      string,
      Omit<CityAggregate, 'averageViewsPerProperty'>
    >();

    properties.forEach((property) => {
      const city = property.city?.trim() || 'Unspecified';
      const current = cityMap.get(city) ?? {
        city,
        propertyCount: 0,
        totalViews: 0,
        totalFavorites: 0,
        totalInquiries: 0,
      };

      current.propertyCount += 1;
      current.totalViews += Number(property.viewCount ?? 0);
      current.totalFavorites += Number(property.favoriteCount ?? 0);
      current.totalInquiries += inquiriesByProperty.get(property.id) ?? 0;

      cityMap.set(city, current);
    });

    return Array.from(cityMap.values())
      .map((entry) => ({
        ...entry,
        averageViewsPerProperty: this.safeDivide(
          entry.totalViews,
          entry.propertyCount,
        ),
      }))
      .sort((a, b) => b.totalViews - a.totalViews)
      .slice(0, 8);
  }

  private toDateKey(value: Date): string {
    return value.toISOString().slice(0, 10);
  }
}
