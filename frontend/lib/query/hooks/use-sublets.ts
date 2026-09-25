'use client';

/**
 * Sublet request, booking, and earnings hooks (#1553).
 *
 * Backend contract (`backend/src/modules/subletting/`):
 * - `POST /subletting/request` expects `{ agreementId, startDate, endDate, reason? }`.
 * - `GET /subletting/requests?status&page&limit` returns a paginated list.
 * - `PATCH /subletting/requests/:id/approve` / `.../deny` for landlord decisions.
 * - `GET /subletting/bookings?page&limit` returns paginated bookings, with
 *   amounts serialized as strings (decimals), so consumers must `Number()` them.
 * - `GET /subletting/earnings` returns aggregate totals for the current tenant.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { queryKeys } from '../keys';
import { getDomainCacheTtl } from '../cache-ttl';
import type { PaginatedResponse } from '@/types';

const subletsTtl = getDomainCacheTtl('sublets');

export type SubletRequestStatus = 'pending' | 'approved' | 'denied' | 'revoked';

export interface SubletRequest {
  id: string;
  agreementId: string;
  tenantId: string;
  landlordId: string;
  status: SubletRequestStatus;
  requestedStartDate: string;
  requestedEndDate: string;
  maxDaysPerYear?: number;
  tenantShare?: number;
  landlordShare?: number;
  reason?: string | null;
  landlordNotes?: string | null;
  respondedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SubletBooking {
  id: string;
  bookingId: string;
  agreementId: string;
  tenantId: string;
  landlordId: string;
  guestId: string;
  totalAmount: number;
  tenantEarnings: number;
  landlordEarnings: number;
  platformFee: number;
  payoutProcessed: boolean;
  createdAt: string;
  updatedAt: string;
}

interface SubletBookingApi {
  id: string;
  bookingId: string;
  agreementId: string;
  tenantId: string;
  landlordId: string;
  guestId: string;
  totalAmount: string | number;
  tenantEarnings: string | number;
  landlordEarnings: string | number;
  platformFee: string | number;
  payoutProcessed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SubletEarningsSummary {
  totalEarnings: number;
  pendingEarnings: number;
  paidEarnings: number;
  bookingCount: number;
}

export interface SubletRequestFilters {
  status?: SubletRequestStatus | 'all';
  page?: number;
  limit?: number;
}

export interface CreateSubletRequestPayload {
  agreementId: string;
  startDate: string;
  endDate: string;
  reason?: string;
}

function normalizeBooking(b: SubletBookingApi): SubletBooking {
  return {
    ...b,
    totalAmount: Number(b.totalAmount),
    tenantEarnings: Number(b.tenantEarnings),
    landlordEarnings: Number(b.landlordEarnings),
    platformFee: Number(b.platformFee),
  };
}

// ─── Queries ─────────────────────────────────────────────────────────────────

/** List the current user's sublet requests, optionally filtered by status. */
export function useSubletRequests(filters: SubletRequestFilters = {}) {
  return useQuery({
    queryKey: queryKeys.sublets.list(filters),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.status && filters.status !== 'all') {
        params.set('status', filters.status);
      }
      if (filters.page) params.set('page', String(filters.page));
      if (filters.limit) params.set('limit', String(filters.limit));
      const qs = params.toString();

      const { data } = await apiClient.get<PaginatedResponse<SubletRequest>>(
        `/subletting/requests${qs ? `?${qs}` : ''}`,
      );
      return data;
    },
    staleTime: subletsTtl.staleTime,
    gcTime: subletsTtl.gcTime,
  });
}

/** List the current user's sublet bookings, with decimal amounts normalized. */
export function useSubletBookings(
  filters: { page?: number; limit?: number } = {},
) {
  return useQuery({
    queryKey: [...queryKeys.sublets.all, 'bookings', filters] as const,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.page) params.set('page', String(filters.page));
      if (filters.limit) params.set('limit', String(filters.limit));
      const qs = params.toString();

      const { data } = await apiClient.get<PaginatedResponse<SubletBookingApi>>(
        `/subletting/bookings${qs ? `?${qs}` : ''}`,
      );
      return { ...data, data: data.data.map(normalizeBooking) };
    },
    staleTime: subletsTtl.staleTime,
    gcTime: subletsTtl.gcTime,
  });
}

/** Aggregate earnings totals for the current tenant (#1553's dedicated data source). */
export function useSubletEarnings() {
  return useQuery({
    queryKey: queryKeys.sublets.earnings(),
    queryFn: async () => {
      const { data } = await apiClient.get<SubletEarningsSummary>(
        '/subletting/earnings',
      );
      return data;
    },
    staleTime: subletsTtl.staleTime,
    gcTime: subletsTtl.gcTime,
  });
}

// ─── Mutations ───────────────────────────────────────────────────────────────

/** Submit a new sublet request against an existing agreement. */
export function useCreateSubletRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateSubletRequestPayload) => {
      const { data } = await apiClient.post<SubletRequest>(
        '/subletting/request',
        payload,
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sublets.lists() });
    },
  });
}

/** Landlord approves a pending sublet request. */
export function useApproveSubletRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes?: string }) => {
      const { data } = await apiClient.patch<SubletRequest>(
        `/subletting/requests/${id}/approve`,
        { notes },
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sublets.lists() });
    },
  });
}

/** Landlord denies a pending sublet request. */
export function useDenySubletRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const { data } = await apiClient.patch<SubletRequest>(
        `/subletting/requests/${id}/deny`,
        { reason },
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sublets.lists() });
    },
  });
}
