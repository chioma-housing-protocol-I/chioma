import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository, Between } from 'typeorm';
import {
  Property,
  ListingStatus,
} from '../properties/entities/property.entity';
import {
  PropertyInquiry,
  PropertyInquiryStatus,
} from '../inquiries/entities/property-inquiry.entity';
import { Payment, PaymentStatus } from '../payments/entities/payment.entity';
import { AuditLog } from '../audit/entities/audit-log.entity';
import {
  GenerateReportDto,
  ReportType,
  ReportFormat,
} from './dto/generate-report.dto';
import {
  ExportAnalyticsDto,
  ExportType,
  ExportFormat,
} from './dto/export-analytics.dto';

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
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
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

  async getDashboardMetrics(userId: string) {
    const properties = await this.propertyRepository.find({
      where: { ownerId: userId },
      select: ['id', 'status', 'viewCount', 'favoriteCount'],
    });

    const propertyIds = properties.map((p) => p.id);
    const inquiries = propertyIds.length
      ? await this.inquiryRepository.find({
          where: { propertyId: In(propertyIds) },
        })
      : [];

    const payments = await this.paymentRepository.find({
      where: { userId },
      select: ['id', 'amount', 'status', 'createdAt'],
    });

    return {
      totalProperties: properties.length,
      activeProperties: properties.filter(
        (p) => p.status === ListingStatus.PUBLISHED,
      ).length,
      totalInquiries: inquiries.length,
      totalViews: properties.reduce((sum, p) => sum + (p.viewCount || 0), 0),
      totalFavorites: properties.reduce(
        (sum, p) => sum + (p.favoriteCount || 0),
        0,
      ),
      totalPayments: payments.length,
      totalRevenue: payments.reduce((sum, p) => sum + Number(p.amount || 0), 0),
      pendingPayments: payments.filter(
        (p) => p.status === PaymentStatus.PENDING,
      ).length,
      completedPayments: payments.filter(
        (p) => p.status === PaymentStatus.COMPLETED,
      ).length,
    };
  }

  async getPaymentAnalytics(userId: string, days: number) {
    const normalizedDays = this.normalizeDays(days);
    const endDate = new Date();
    const startDate = new Date(endDate);
    startDate.setDate(endDate.getDate() - (normalizedDays - 1));

    const payments = await this.paymentRepository.find({
      where: {
        userId,
        createdAt: Between(startDate, endDate),
      },
      select: ['id', 'amount', 'status', 'createdAt', 'paymentMethod'],
      order: { createdAt: 'ASC' },
    });

    const totalAmount = payments.reduce(
      (sum, p) => sum + Number(p.amount || 0),
      0,
    );
    const completedPayments = payments.filter(
      (p) => p.status === PaymentStatus.COMPLETED,
    );
    const completedAmount = completedPayments.reduce(
      (sum, p) => sum + Number(p.amount || 0),
      0,
    );

    const paymentTrend = this.buildPaymentTrend(
      payments,
      normalizedDays,
      startDate,
      endDate,
    );
    const statusDistribution = this.buildPaymentStatusDistribution(payments);
    const methodDistribution = this.buildPaymentMethodDistribution(payments);

    return {
      generatedAt: endDate.toISOString(),
      range: {
        days: normalizedDays,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      summary: {
        totalPayments: payments.length,
        totalAmount,
        completedPayments: completedPayments.length,
        completedAmount,
        pendingPayments: payments.filter(
          (p) => p.status === PaymentStatus.PENDING,
        ).length,
        failedPayments: payments.filter(
          (p) => p.status === PaymentStatus.FAILED,
        ).length,
        averagePaymentAmount: this.safeDivide(totalAmount, payments.length),
        completionRate: this.toPercent(
          completedPayments.length,
          payments.length,
        ),
      },
      trends: {
        paymentTrend,
        statusDistribution,
        methodDistribution,
      },
    };
  }

  async getUserActivityAnalytics(userId: string, days: number) {
    const normalizedDays = this.normalizeDays(days);
    const endDate = new Date();
    const startDate = new Date(endDate);
    startDate.setDate(endDate.getDate() - (normalizedDays - 1));

    const activities = await this.auditLogRepository.find({
      where: {
        performed_by: userId,
        performed_at: Between(startDate, endDate),
      },
      select: ['id', 'action', 'entity_type', 'performed_at'],
      order: { performed_at: 'ASC' },
    });

    const activityTrend = this.buildActivityTrend(
      activities,
      normalizedDays,
      startDate,
      endDate,
    );
    const actionDistribution = this.buildActionDistribution(activities);
    const entityTypeDistribution = this.buildEntityTypeDistribution(activities);

    return {
      generatedAt: endDate.toISOString(),
      range: {
        days: normalizedDays,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      summary: {
        totalActivities: activities.length,
        uniqueActions: new Set(activities.map((a) => a.action)).size,
        uniqueEntityTypes: new Set(activities.map((a) => a.entity_type)).size,
        averageActivitiesPerDay: this.safeDivide(
          activities.length,
          normalizedDays,
        ),
      },
      trends: {
        activityTrend,
        actionDistribution,
        entityTypeDistribution,
      },
    };
  }

  async generateReport(userId: string, dto: GenerateReportDto) {
    const { reportType, format, days, startDate, endDate, propertyId } = dto;
    const normalizedDays = days ? this.normalizeDays(days) : 30;
    const reportEndDate = new Date();
    const reportStartDate = startDate
      ? new Date(startDate)
      : new Date(reportEndDate);
    reportStartDate.setDate(reportEndDate.getDate() - (normalizedDays - 1));

    let data: unknown;
    switch (reportType) {
      case ReportType.PROPERTY:
        data = await this.getLandlordDashboard(userId, normalizedDays);
        break;
      case ReportType.PAYMENT:
        data = await this.getPaymentAnalytics(userId, normalizedDays);
        break;
      case ReportType.USER_ACTIVITY:
        data = await this.getUserActivityAnalytics(userId, normalizedDays);
        break;
      case ReportType.COMPREHENSIVE:
        data = {
          property: await this.getLandlordDashboard(userId, normalizedDays),
          payment: await this.getPaymentAnalytics(userId, normalizedDays),
          activity: await this.getUserActivityAnalytics(userId, normalizedDays),
        };
        break;
    }

    return {
      reportId: `report_${Date.now()}`,
      generatedAt: reportEndDate.toISOString(),
      reportType,
      format,
      range: {
        startDate: reportStartDate.toISOString(),
        endDate: reportEndDate.toISOString(),
      },
      data,
    };
  }

  async exportAnalytics(userId: string, dto: ExportAnalyticsDto) {
    const { exportType, format, days, startDate, endDate, propertyId } = dto;
    const normalizedDays = days ? this.normalizeDays(days) : 30;
    const exportEndDate = new Date();
    const exportStartDate = startDate
      ? new Date(startDate)
      : new Date(exportEndDate);
    exportStartDate.setDate(exportEndDate.getDate() - (normalizedDays - 1));

    let data: unknown;
    switch (exportType) {
      case ExportType.PROPERTY:
        data = await this.getLandlordDashboard(userId, normalizedDays);
        break;
      case ExportType.PAYMENT:
        data = await this.getPaymentAnalytics(userId, normalizedDays);
        break;
      case ExportType.USER_ACTIVITY:
        data = await this.getUserActivityAnalytics(userId, normalizedDays);
        break;
      case ExportType.ALL:
        data = {
          property: await this.getLandlordDashboard(userId, normalizedDays),
          payment: await this.getPaymentAnalytics(userId, normalizedDays),
          activity: await this.getUserActivityAnalytics(userId, normalizedDays),
        };
        break;
    }

    return {
      exportId: `export_${Date.now()}`,
      generatedAt: exportEndDate.toISOString(),
      exportType,
      format,
      range: {
        startDate: exportStartDate.toISOString(),
        endDate: exportEndDate.toISOString(),
      },
      data,
    };
  }

  private buildPaymentTrend(
    payments: Array<{ createdAt: Date; amount?: number }>,
    days: number,
    startDate: Date,
    endDate: Date,
  ) {
    const buckets = new Map<string, { count: number; amount: number }>();

    for (let offset = 0; offset < days; offset += 1) {
      const day = new Date(startDate);
      day.setDate(startDate.getDate() + offset);
      const key = this.toDateKey(day);
      buckets.set(key, { count: 0, amount: 0 });
    }

    payments.forEach((payment) => {
      if (payment.createdAt < startDate || payment.createdAt > endDate) {
        return;
      }

      const key = this.toDateKey(payment.createdAt);
      const current = buckets.get(key) ?? { count: 0, amount: 0 };
      current.count += 1;
      current.amount += Number(payment.amount || 0);
      buckets.set(key, current);
    });

    return Array.from(buckets.entries()).map(([date, { count, amount }]) => ({
      date,
      count,
      amount,
    }));
  }

  private buildPaymentStatusDistribution(payments: Array<{ status?: string }>) {
    const counts = new Map<string, number>();
    payments.forEach((payment) => {
      const status = payment.status || 'unknown';
      counts.set(status, (counts.get(status) ?? 0) + 1);
    });

    return Array.from(counts.entries()).map(([status, count]) => ({
      status,
      count,
      percentage: this.toPercent(count, payments.length),
    }));
  }

  private buildPaymentMethodDistribution(
    payments: Array<{ paymentMethod?: string }>,
  ) {
    const counts = new Map<string, number>();
    payments.forEach((payment) => {
      const method = payment.paymentMethod || 'unknown';
      counts.set(method, (counts.get(method) ?? 0) + 1);
    });

    return Array.from(counts.entries()).map(([method, count]) => ({
      method,
      count,
      percentage: this.toPercent(count, payments.length),
    }));
  }

  private buildActivityTrend(
    activities: Array<{ performed_at: Date }>,
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

    activities.forEach((activity) => {
      if (
        activity.performed_at < startDate ||
        activity.performed_at > endDate
      ) {
        return;
      }

      const key = this.toDateKey(activity.performed_at);
      buckets.set(key, (buckets.get(key) ?? 0) + 1);
    });

    return Array.from(buckets.entries()).map(([date, count]) => ({
      date,
      count,
    }));
  }

  private buildActionDistribution(activities: Array<{ action?: string }>) {
    const counts = new Map<string, number>();
    activities.forEach((activity) => {
      const action = activity.action || 'unknown';
      counts.set(action, (counts.get(action) ?? 0) + 1);
    });

    return Array.from(counts.entries()).map(([action, count]) => ({
      action,
      count,
      percentage: this.toPercent(count, activities.length),
    }));
  }

  private buildEntityTypeDistribution(
    activities: Array<{ entity_type?: string }>,
  ) {
    const counts = new Map<string, number>();
    activities.forEach((activity) => {
      const entityType = activity.entity_type || 'unknown';
      counts.set(entityType, (counts.get(entityType) ?? 0) + 1);
    });

    return Array.from(counts.entries()).map(([entityType, count]) => ({
      entityType,
      count,
      percentage: this.toPercent(count, activities.length),
    }));
  }
}
