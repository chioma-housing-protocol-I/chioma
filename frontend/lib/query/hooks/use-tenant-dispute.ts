'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  addDisputeComment,
  appealDispute,
  getTenantDispute,
  uploadDisputeEvidence,
  type DisputeDetailRecord,
} from '@/lib/disputes/api';

export type TenantDisputeDetail = DisputeDetailRecord;

const TENANT_DISPUTE_DETAIL_QUERY_KEY = (id: string) =>
  ['tenant-dispute', id] as const;

export function useTenantDispute(disputeId: string) {
  return useQuery({
    queryKey: TENANT_DISPUTE_DETAIL_QUERY_KEY(disputeId),
    enabled: !!disputeId,
    queryFn: () => getTenantDispute(disputeId),
    staleTime: 5_000,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === 'OPEN' || status === 'UNDER_REVIEW' ? 30_000 : false;
    },
  });
}

export function useAddDisputeComment() {
  const queryClient = useQueryClient();
  return useMutation<
    { success: boolean },
    Error,
    { disputeId: string; content: string }
  >({
    mutationFn: async ({
      disputeId,
      content,
    }: {
      disputeId: string;
      content: string;
    }) => {
      await addDisputeComment(disputeId, content);
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-dispute'] });
      queryClient.invalidateQueries({ queryKey: ['tenant-disputes'] });
    },
  });
}

export function useUploadTenantDisputeEvidence() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      disputeId,
      files,
      description,
    }: {
      disputeId: string;
      files: File[];
      description?: string;
    }) => uploadDisputeEvidence(disputeId, files, description),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-dispute'] });
      queryClient.invalidateQueries({ queryKey: ['tenant-disputes'] });
    },
  });
}

export function useAppealTenantDispute() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ disputeId }: { disputeId: string }) =>
      appealDispute(disputeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-dispute'] });
      queryClient.invalidateQueries({ queryKey: ['tenant-disputes'] });
    },
  });
}
