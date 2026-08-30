import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import {
  useUpdateAdminDisputeStatus,
  useAdminDisputes,
} from '@/lib/query/hooks/use-admin-disputes';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { apiClient } from '@/lib/api-client';

// Mock the api client
vi.mock('@/lib/api-client', () => ({
  apiClient: {
    get: vi.fn(),
    patch: vi.fn(),
  },
}));

const mockedApiClient = vi.mocked(apiClient);

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
  Wrapper.displayName = 'QueryClientTestWrapper';
  return Wrapper;
};

beforeEach(() => {
  vi.clearAllMocks();
  mockedApiClient.get.mockResolvedValue({
    data: { disputes: [] },
    status: 200,
  });
  mockedApiClient.patch.mockResolvedValue({ data: {}, status: 200 });
});

describe('useUpdateAdminDisputeStatus', () => {
  it('should call patch endpoint with numeric dispute ID', async () => {
    const { result } = renderHook(() => useUpdateAdminDisputeStatus(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isPending).toBe(false);
    });

    await result.current.mutateAsync({
      disputeId: '1',
      status: 'RESOLVED',
      resolution: 'Resolved by admin',
    });

    expect(mockedApiClient.patch).toHaveBeenCalledWith(
      '/admin/disputes/1',
      expect.objectContaining({
        status: 'RESOLVED',
        resolution: 'Resolved by admin',
      }),
    );
  });

  it('should handle non-numeric IDs gracefully', async () => {
    mockedApiClient.patch.mockRejectedValueOnce(new Error('404 Not Found'));

    const { result } = renderHook(() => useUpdateAdminDisputeStatus(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isPending).toBe(false);
    });

    const response = await result.current.mutateAsync({
      disputeId: 'invalid-id',
      status: 'RESOLVED',
    });

    expect(response.localOnly).toBe(true);
  });
});

describe('useAdminDisputes', () => {
  it('should normalize disputes with numeric IDs', async () => {
    mockedApiClient.get.mockResolvedValueOnce({
      data: {
        disputes: [
          {
            id: 1,
            disputeId: 'DSP-2026-001',
            agreementId: 'agr-123',
            disputeType: 'RENT_PAYMENT',
            status: 'OPEN',
            description: 'Test dispute',
            evidence: [],
            comments: [],
          },
        ],
      },
      status: 200,
    });

    const { result } = renderHook(() => useAdminDisputes(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toHaveLength(1);
    expect(result.current.data?.[0].id).toBe('1');
    expect(result.current.data?.[0].disputeId).toBe('DSP-2026-001');
  });
});
