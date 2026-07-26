import { renderHook, waitFor } from '@testing-library/react';
import {
    useUpdateAdminDisputeStatus,
    useAdminDisputes,
} from '@/lib/query/hooks/use-admin-disputes';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Mock the api client
jest.mock('@/lib/api-client', () => ({
    apiClient: {
        get: jest.fn().mockResolvedValue({
            data: { disputes: [] },
        }),
        patch: jest.fn().mockResolvedValue({}),
    },
}));

const createWrapper = () => {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: { retry: false },
            mutations: { retry: false },
        },
    });
    return ({ children }: { children: React.ReactNode }) =>
        React.createElement(
            QueryClientProvider,
            { client: queryClient },
            children,
        );
};

describe('useUpdateAdminDisputeStatus', () => {
    it('should call patch endpoint with numeric dispute ID', async () => {
        const { apiClient } = require('@/lib/api-client');
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

        expect(apiClient.patch).toHaveBeenCalledWith(
            '/admin/disputes/1',
            expect.objectContaining({
                status: 'RESOLVED',
                resolution: 'Resolved by admin',
            }),
        );
    });

    it('should handle non-numeric IDs gracefully', async () => {
        const { apiClient } = require('@/lib/api-client');
        apiClient.patch.mockRejectedValueOnce(new Error('404 Not Found'));

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
        const { apiClient } = require('@/lib/api-client');
        apiClient.get.mockResolvedValueOnce({
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
        });

        const { result } = renderHook(() => useAdminDisputes(), {
            wrapper: createWrapper(),
        });

        await waitFor(() => {
            expect(result.current.isSuccess).toBe(true);
        });

        expect(result.current.data).toHaveLength(1);
        expect(result.current.data[0].id).toBe('1');
        expect(result.current.data[0].disputeId).toBe('DSP-2026-001');
    });
});
