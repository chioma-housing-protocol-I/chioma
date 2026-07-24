'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { DisputeStatus } from '@/lib/dashboard-data';
import { useAuthStore } from '@/store/authStore';
import {
  listTenantDisputes,
  type DisputeFilters,
  type DisputeListItem,
} from '@/lib/disputes/api';

export type TenantDisputeFilters = DisputeFilters & {
  sort?: 'createdAt' | 'updatedAt' | 'amount';
};

export type TenantDisputeRecord = DisputeListItem;

const TENANT_DISPUTES_QUERY_KEY = ['tenant-disputes'] as const;

export function useTenantDisputes(filters: TenantDisputeFilters = {}) {
  const userId = useAuthStore((state) => state.user?.id);

  return useQuery({
    queryKey: [...TENANT_DISPUTES_QUERY_KEY, userId, filters],
    enabled: Boolean(userId),
    queryFn: () =>
      listTenantDisputes(
        {
          ...filters,
          page: filters.page ?? 1,
        },
        userId,
      ),
    staleTime: 5_000,
    refetchInterval: (query) =>
      (query.state.data ?? []).some(
        (dispute) =>
          dispute.status === 'OPEN' || dispute.status === 'UNDER_REVIEW',
      )
        ? 30_000
        : false,
  });
}

export function useUpdateTenantDisputeStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      disputeId,
      status,
    }: {
      disputeId: string;
      status: DisputeStatus;
    }) => {
      await apiClient.put(`/disputes/${disputeId}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TENANT_DISPUTES_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['tenant-dispute'] });
    },
  });
}
