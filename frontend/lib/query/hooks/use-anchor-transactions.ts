'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { queryKeys } from '../keys';
import type {
  AnchorTransaction,
  AnchorTransactionStatus,
  AnchorTransactionStats,
  AnchorTransactionType,
  PaginatedResponse,
} from '@/types';

export interface AnchorTransactionListParams {
  page?: number;
  limit?: number;
  type?: AnchorTransactionType;
  status?: AnchorTransactionStatus;
  startDate?: string;
  endDate?: string;
  search?: string;
}

function buildQueryString(params: AnchorTransactionListParams): string {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.append(key, String(value));
    }
  });

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : '';
}

export function useAnchorTransactions(
  params: AnchorTransactionListParams = {},
) {
  return useQuery({
    queryKey: queryKeys.anchorTransactions.list(params),
    queryFn: async () => {
      const { data } = await apiClient.get<
        PaginatedResponse<AnchorTransaction>
      >(`/anchor/transactions${buildQueryString(params)}`);
      return data;
    },
    refetchInterval: 15000,
  });
}

export function useAnchorTransaction(id: string | null) {
  return useQuery({
    queryKey: queryKeys.anchorTransactions.detail(id ?? ''),
    queryFn: async () => {
      const { data } = await apiClient.get<AnchorTransaction>(
        `/anchor/transactions/${id}`,
      );
      return data;
    },
    enabled: Boolean(id),
    refetchInterval: 15000,
  });
}

export interface WithdrawRequest {
  amount: number;
  currency: string;
  destination: string;
  walletAddress: string;
}

/** Initiates an anchor withdrawal to an external Stellar address. */
export function useCreateWithdrawal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: WithdrawRequest) => {
      const { data } = await apiClient.post<AnchorTransaction>(
        '/anchor/withdraw',
        payload,
      );
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.anchorTransactions.all,
      });
    },
  });
}

export function useAnchorTransactionStats() {
  return useQuery({
    queryKey: queryKeys.anchorTransactions.stats(),
    queryFn: async () => {
      const { data } = await apiClient.get<AnchorTransactionStats>(
        '/anchor/transactions/stats',
      );
      return data;
    },
    refetchInterval: 15000,
  });
}
