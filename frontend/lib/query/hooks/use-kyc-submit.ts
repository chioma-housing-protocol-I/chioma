'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { kycStatusQueryKey } from './use-kyc-status';

export type KycSubmitPayload = Record<string, unknown>;

export function useKycSubmit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (kycData: KycSubmitPayload) => {
      const { data } = await apiClient.post('/kyc/submit', { kycData });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: kycStatusQueryKey });
    },
  });
}
