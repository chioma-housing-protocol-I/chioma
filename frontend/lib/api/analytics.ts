import { apiClient } from '@/lib/api-client';
import type { LandlordPropertyAnalytics } from '@/lib/property-analytics';

export interface DashboardMetrics {
  totalProperties: number;
  activeProperties: number;
  totalInquiries: number;
  totalViews: number;
  totalFavorites: number;
  totalPayments: number;
  totalRevenue: number;
  pendingPayments: number;
  completedPayments: number;
}

export interface PaymentAnalytics {
  generatedAt: string;
  range: {
    days: number;
    startDate: string;
    endDate: string;
  };
  summary: {
    totalPayments: number;
    totalAmount: number;
    completedPayments: number;
    completedAmount: number;
    pendingPayments: number;
    failedPayments: number;
    averagePaymentAmount: number;
    completionRate: number;
  };
  trends: {
    paymentTrend: Array<{ date: string; count: number; amount: number }>;
    statusDistribution: Array<{
      status: string;
      count: number;
      percentage: number;
    }>;
    methodDistribution: Array<{
      method: string;
      count: number;
      percentage: number;
    }>;
  };
}

export interface UserActivityAnalytics {
  generatedAt: string;
  range: {
    days: number;
    startDate: string;
    endDate: string;
  };
  summary: {
    totalActivities: number;
    uniqueActions: number;
    uniqueEntityTypes: number;
    averageActivitiesPerDay: number;
  };
  trends: {
    activityTrend: Array<{ date: string; count: number }>;
    actionDistribution: Array<{
      action: string;
      count: number;
      percentage: number;
    }>;
    entityTypeDistribution: Array<{
      entityType: string;
      count: number;
      percentage: number;
    }>;
  };
}

export enum ReportType {
  PROPERTY = 'property',
  PAYMENT = 'payment',
  USER_ACTIVITY = 'user_activity',
  COMPREHENSIVE = 'comprehensive',
}

export enum ReportFormat {
  PDF = 'pdf',
  CSV = 'csv',
  JSON = 'json',
}

export interface GenerateReportDto {
  reportType: ReportType;
  format: ReportFormat;
  days?: number;
  startDate?: string;
  endDate?: string;
  propertyId?: string;
}

export interface GeneratedReport {
  reportId: string;
  generatedAt: string;
  reportType: ReportType;
  format: ReportFormat;
  range: {
    startDate: string;
    endDate: string;
  };
  data: unknown;
}

export enum ExportType {
  PROPERTY = 'property',
  PAYMENT = 'payment',
  USER_ACTIVITY = 'user_activity',
  ALL = 'all',
}

export enum ExportFormat {
  CSV = 'csv',
  JSON = 'json',
  EXCEL = 'excel',
}

export interface ExportAnalyticsDto {
  exportType: ExportType;
  format: ExportFormat;
  days?: number;
  startDate?: string;
  endDate?: string;
  propertyId?: string;
}

export interface ExportedAnalytics {
  exportId: string;
  generatedAt: string;
  exportType: ExportType;
  format: ExportFormat;
  range: {
    startDate: string;
    endDate: string;
  };
  data: unknown;
}

export const analyticsApi = {
  getDashboardMetrics: () =>
    apiClient.get<DashboardMetrics>('/analytics/dashboard/metrics'),

  getPaymentAnalytics: (days: number) =>
    apiClient.get<PaymentAnalytics>(
      `/analytics/payment/analytics?days=${days}`,
    ),

  getUserActivityAnalytics: (days: number) =>
    apiClient.get<UserActivityAnalytics>(
      `/analytics/user/activity?days=${days}`,
    ),

  generateReport: (dto: GenerateReportDto) =>
    apiClient.post<GeneratedReport>('/analytics/reports/generate', dto),

  exportAnalytics: (dto: ExportAnalyticsDto) =>
    apiClient.post<ExportedAnalytics>('/analytics/export', dto),
};
