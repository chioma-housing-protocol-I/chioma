import { describe, it, expect, vi, beforeEach } from 'vitest';
import { analyticsApi } from '@/lib/api/analytics';
import { apiClient } from '@/lib/api-client';

vi.mock('@/lib/api-client');

describe('analyticsApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getDashboardMetrics', () => {
    it('should call apiClient.get with correct endpoint', async () => {
      const mockData = {
        totalProperties: 10,
        activeProperties: 8,
        totalInquiries: 50,
        totalViews: 1000,
        totalFavorites: 200,
        totalPayments: 30,
        totalRevenue: 15000,
        pendingPayments: 5,
        completedPayments: 25,
      };

      vi.mocked(apiClient.get).mockResolvedValue({
        data: mockData,
        status: 200,
      });

      const result = await analyticsApi.getDashboardMetrics();

      expect(apiClient.get).toHaveBeenCalledWith(
        '/analytics/dashboard/metrics',
      );
      expect(result.data).toEqual(mockData);
    });
  });

  describe('getPaymentAnalytics', () => {
    it('should call apiClient.get with correct endpoint and days parameter', async () => {
      const mockData = {
        generatedAt: '2024-01-15T00:00:00Z',
        range: { days: 30, startDate: '2024-01-01', endDate: '2024-01-30' },
        summary: {
          totalPayments: 10,
          totalAmount: 5000,
          completedPayments: 8,
          completedAmount: 4000,
          pendingPayments: 2,
          failedPayments: 0,
          averagePaymentAmount: 500,
          completionRate: 80,
        },
        trends: {
          paymentTrend: [],
          statusDistribution: [],
          methodDistribution: [],
        },
      };

      vi.mocked(apiClient.get).mockResolvedValue({
        data: mockData,
        status: 200,
      });

      const result = await analyticsApi.getPaymentAnalytics(30);

      expect(apiClient.get).toHaveBeenCalledWith(
        '/analytics/payment/analytics?days=30',
      );
      expect(result.data).toEqual(mockData);
    });
  });

  describe('getUserActivityAnalytics', () => {
    it('should call apiClient.get with correct endpoint and days parameter', async () => {
      const mockData = {
        generatedAt: '2024-01-15T00:00:00Z',
        range: { days: 30, startDate: '2024-01-01', endDate: '2024-01-30' },
        summary: {
          totalActivities: 100,
          uniqueActions: 10,
          uniqueEntityTypes: 5,
          averageActivitiesPerDay: 3.33,
        },
        trends: {
          activityTrend: [],
          actionDistribution: [],
          entityTypeDistribution: [],
        },
      };

      vi.mocked(apiClient.get).mockResolvedValue({
        data: mockData,
        status: 200,
      });

      const result = await analyticsApi.getUserActivityAnalytics(30);

      expect(apiClient.get).toHaveBeenCalledWith(
        '/analytics/user/activity?days=30',
      );
      expect(result.data).toEqual(mockData);
    });
  });

  describe('generateReport', () => {
    it('should call apiClient.post with correct endpoint and dto', async () => {
      const mockDto = {
        reportType: 'property' as const,
        format: 'pdf' as const,
        days: 30,
      };

      const mockData = {
        reportId: 'report_1234567890',
        generatedAt: '2024-01-15T00:00:00Z',
        reportType: 'property' as const,
        format: 'pdf' as const,
        range: { startDate: '2024-01-01', endDate: '2024-01-30' },
        data: {},
      };

      vi.mocked(apiClient.post).mockResolvedValue({
        data: mockData,
        status: 200,
      });

      const result = await analyticsApi.generateReport(mockDto);

      expect(apiClient.post).toHaveBeenCalledWith(
        '/analytics/reports/generate',
        mockDto,
      );
      expect(result.data).toEqual(mockData);
    });
  });

  describe('exportAnalytics', () => {
    it('should call apiClient.post with correct endpoint and dto', async () => {
      const mockDto = {
        exportType: 'payment' as const,
        format: 'csv' as const,
        days: 30,
      };

      const mockData = {
        exportId: 'export_1234567890',
        generatedAt: '2024-01-15T00:00:00Z',
        exportType: 'payment' as const,
        format: 'csv' as const,
        range: { startDate: '2024-01-01', endDate: '2024-01-30' },
        data: {},
      };

      vi.mocked(apiClient.post).mockResolvedValue({
        data: mockData,
        status: 200,
      });

      const result = await analyticsApi.exportAnalytics(mockDto);

      expect(apiClient.post).toHaveBeenCalledWith('/analytics/export', mockDto);
      expect(result.data).toEqual(mockData);
    });
  });
});
