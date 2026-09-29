'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { queryKeys } from '../keys';

export function useReferrals() {
  const codeQuery = useQuery({
    queryKey: queryKeys.referrals.code(),
    queryFn: async () => {
      const { data } = await apiClient.get<{ referralCode: string }>(
        '/referrals/code',
      );
      return data.referralCode;
    },
  });

  const statsQuery = useQuery({
    queryKey: queryKeys.referrals.stats(),
    queryFn: async () => {
      const { data } = await apiClient.get<{
        totalReferrals: number;
        completedReferrals: number;
        totalRewards: number;
        referrals: Array<{
          id: string;
          referredName: string;
          status: string;
          createdAt: string;
          rewardAmount?: number;
        }>;
      }>('/referrals/stats');
      return data;
    },
  });

  const isLoading = codeQuery.isLoading || statsQuery.isLoading;
  const isError = codeQuery.isError || statsQuery.isError;

  const referralCode = codeQuery.data ?? null;
  const stats = statsQuery.data ?? null;

  return {
    referralCode,
    stats,
    isLoading,
    isError,
  };
}
