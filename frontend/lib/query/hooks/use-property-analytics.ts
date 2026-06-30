'use client';

import { useQuery, useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { queryKeys } from '../keys';
import type { LandlordPropertyAnalytics } from '@/lib/property-analytics';
import type {
  DashboardMetrics,
  PaymentAnalytics,
  UserActivityAnalytics,
  GenerateReportDto,
  GeneratedReport,
  ExportAnalyticsDto,
  ExportedAnalytics,
} from '@/lib/api/analytics';
import { analyticsApi } from '@/lib/api/analytics';

const LIVE_REFRESH_MS = 30_000;

export function useLandlordPropertyAnalytics(days = 30) {
  const normalizedDays = Math.min(365, Math.max(1, Math.floor(days)));

  return useQuery({
    queryKey: queryKeys.analytics.landlordOverview(normalizedDays),
    queryFn: async () => {
      const { data } = await apiClient.get<LandlordPropertyAnalytics>(
        `/analytics/landlord/dashboard?days=${normalizedDays}`,
      );
      return data;
    },
    refetchInterval: LIVE_REFRESH_MS,
    refetchIntervalInBackground: true,
  });
}

export function useDashboardMetrics() {
  return useQuery({
    queryKey: queryKeys.analytics.dashboardMetrics(),
    queryFn: async () => {
      const { data } = await analyticsApi.getDashboardMetrics();
      return data;
    },
    refetchInterval: LIVE_REFRESH_MS,
    refetchIntervalInBackground: true,
  });
}

export function usePaymentAnalytics(days = 30) {
  const normalizedDays = Math.min(365, Math.max(1, Math.floor(days)));

  return useQuery({
    queryKey: queryKeys.analytics.paymentAnalytics(normalizedDays),
    queryFn: async () => {
      const { data } = await analyticsApi.getPaymentAnalytics(normalizedDays);
      return data;
    },
    refetchInterval: LIVE_REFRESH_MS,
    refetchIntervalInBackground: true,
  });
}

export function useUserActivityAnalytics(days = 30) {
  const normalizedDays = Math.min(365, Math.max(1, Math.floor(days)));

  return useQuery({
    queryKey: queryKeys.analytics.userActivity(normalizedDays),
    queryFn: async () => {
      const { data } = await analyticsApi.getUserActivityAnalytics(
        normalizedDays,
      );
      return data;
    },
    refetchInterval: LIVE_REFRESH_MS,
    refetchIntervalInBackground: true,
  });
}

export function useGenerateReport() {
  return useMutation({
    mutationFn: (dto: GenerateReportDto) => analyticsApi.generateReport(dto),
  });
}

export function useExportAnalytics() {
  return useMutation({
    mutationFn: (dto: ExportAnalyticsDto) => analyticsApi.exportAnalytics(dto),
  });
}
