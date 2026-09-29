'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { queryKeys } from '../keys';
import type { KycStatus } from '@/types';

export type KycStatusValue = KycStatus;

export interface KycStatusResponse {
  status: KycStatus;
  reason?: string;
}

export const kycStatusQueryKey = [...queryKeys.kyc.all, 'status'] as const;

/**
 * Current user's KYC status. Resolves to `null` when the user has never
 * submitted KYC (the API returns an empty body in that case).
 */
export function useKycStatus() {
  return useQuery({
    queryKey: kycStatusQueryKey,
    queryFn: async () => {
      const { data } = await apiClient.get<KycStatusResponse | null>(
        '/kyc/status',
      );
      return data && data.status ? data : null;
    },
  });
}
