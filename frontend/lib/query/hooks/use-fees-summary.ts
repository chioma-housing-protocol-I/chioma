'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { queryKeys } from '../keys';

interface FeesSummary {
  totalPlatformFees: number;
  bookingCount: number;
}

export function useFeesSummary() {
  return useQuery<FeesSummary>({
    queryKey: queryKeys.analytics.feesSummary(),
    queryFn: async () => {
      const { data } = await apiClient.get<FeesSummary>(
        '/analytics/landlord/fees-summary',
      );
      return data;
    },
  });
}