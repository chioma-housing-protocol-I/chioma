'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { queryKeys } from '../keys';
import type { KycVerification, PaginatedResponse } from '@/types';

export interface KycVerificationListParams {
  page?: number;
  limit?: number;
  status?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'NEEDS_INFO';
  search?: string;
  sortBy?: 'createdAt' | 'updatedAt' | 'status';
  sortOrder?: 'asc' | 'desc';
}

interface UpdateKycDecisionPayload {
  verificationId: string;
  reason?: string;
}

function buildQueryString(params: KycVerificationListParams): string {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      qs.append(key, String(value));
    }
  });
  const str = qs.toString();
  return str ? `?${str}` : '';
}

export function usePendingKycVerifications(
  params: KycVerificationListParams = {},
) {
  return useQuery({
    queryKey: queryKeys.kyc.list(params),
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResponse<KycVerification>>(
        `/admin/kyc/pending${buildQueryString(params)}`,
      );
      return data;
    },
  });
}

export function useRejectedKycVerifications(
  params: KycVerificationListParams = {},
) {
  return useQuery({
    queryKey: queryKeys.kyc.list({ ...params, status: 'REJECTED' }),
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResponse<KycVerification>>(
        `/admin/kyc/rejected${buildQueryString(params)}`,
      );
      return data;
    },
  });
}

export function useApproveKycVerification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      verificationId,
      reason,
    }: UpdateKycDecisionPayload) => {
      await apiClient.post(`/admin/kyc/${verificationId}/approve`, {
        reason,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.kyc.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
    },
  });
}

export function useRejectKycVerification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      verificationId,
      reason,
    }: UpdateKycDecisionPayload) => {
      await apiClient.post(`/admin/kyc/${verificationId}/reject`, {
        reason,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.kyc.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
    },
  });
}
