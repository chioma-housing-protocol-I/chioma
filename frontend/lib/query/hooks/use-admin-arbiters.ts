import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { Arbiter } from '@/types';

export interface AdminArbiterRecord extends Arbiter {
  id: number;
}

export interface RegisterArbiterPayload {
  arbiterAddress: string;
  qualifications: string;
  stakeAmount: string;
  specialization?: string;
}

export interface DeregisterArbiterPayload {
  arbiterAddress: string;
}

export interface SelectArbitersPayload {
  disputeId: string;
  count: number;
  specialization?: string;
}

/**
 * Fetch all active arbiters
 */
export function useAdminArbiters() {
  return useQuery({
    queryKey: ['admin', 'arbiters'],
    queryFn: async () => {
      const response = await apiClient.get<AdminArbiterRecord[]>(
        '/stellar/disputes/arbiters/pool',
      );
      return response.data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Fetch a specific arbiter by address
 */
export function useAdminArbiter(address: string) {
  return useQuery({
    queryKey: ['admin', 'arbiter', address],
    queryFn: async () => {
      const response = await apiClient.get<AdminArbiterRecord>(
        `/stellar/disputes/arbiters/${address}`,
      );
      return response.data;
    },
    enabled: !!address,
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Fetch arbiter reputation score
 */
export function useArbiterReputation(address: string) {
  return useQuery({
    queryKey: ['admin', 'arbiter-reputation', address],
    queryFn: async () => {
      const response = await apiClient.get<{
        arbiterAddress: string;
        reputationScore: number;
        totalVotes: number;
      }>(`/stellar/disputes/arbiters/${address}/reputation`);
      return response.data;
    },
    enabled: !!address,
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Register a new arbiter
 */
export function useRegisterArbiter() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: RegisterArbiterPayload) => {
      const response = await apiClient.post<{
        transactionHash: string;
        message: string;
      }>('/stellar/disputes/arbiters/register', payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'arbiters'] });
    },
  });
}

/**
 * Deregister an arbiter
 */
export function useDeregisterArbiter() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: DeregisterArbiterPayload) => {
      const response = await apiClient.post<{ message: string }>(
        '/stellar/disputes/arbiters/deregister',
        payload,
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'arbiters'] });
    },
  });
}

/**
 * Select arbiters for a dispute
 */
export function useSelectArbiters() {
  return useMutation({
    mutationFn: async (payload: SelectArbitersPayload) => {
      const response = await apiClient.post<{ arbiters: string[] }>(
        '/stellar/disputes/arbiters/select',
        payload,
      );
      return response.data;
    },
  });
}

/**
 * Link a user to an arbiter
 */
export function useLinkUserToArbiter() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { arbiterAddress: string; userId: string }) => {
      const response = await apiClient.post<{ message: string }>(
        '/stellar/disputes/arbiters/link-user',
        payload,
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'arbiters'] });
    },
  });
}

/**
 * Unlink a user from an arbiter
 */
export function useUnlinkUserFromArbiter() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (arbiterAddress: string) => {
      const response = await apiClient.post<{ message: string }>(
        '/stellar/disputes/arbiters/unlink-user',
        { arbiterAddress },
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'arbiters'] });
    },
  });
}
