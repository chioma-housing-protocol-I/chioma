'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { queryKeys } from '../keys';
import type { Transaction, PaginatedResponse } from '@/types';

// ── Types ─────────────────────────────────────────────────────────────────

export interface TransactionListParams {
  page?: number;
  limit?: number;
  type?: Transaction['type'];
  status?: Transaction['status'];
  userId?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────

function buildQueryString(params: TransactionListParams): string {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      qs.append(key, String(value));
    }
  });
  const str = qs.toString();
  return str ? `?${str}` : '';
}

// ── Queries ───────────────────────────────────────────────────────────────

/**
 * Fetch a paginated list of transactions with optional filters.
 */
export function useTransactions(params: TransactionListParams = {}) {
  return useQuery({
    queryKey: queryKeys.transactions.list(params),
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResponse<Transaction>>(
        `/transactions${buildQueryString(params)}`,
      );
      return data;
    },
  });
}

/**
 * Fetch all transactions for a specific user.
 */
export function useUserTransactions(userId: string | null) {
  return useQuery({
    queryKey: queryKeys.transactions.byUser(userId ?? ''),
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResponse<Transaction>>(
        `/transactions?userId=${userId}`,
      );
      return data;
    },
    enabled: Boolean(userId),
  });
}

/**
 * Fetch a single transaction by ID.
 */
export function useTransaction(id: string | null) {
  return useQuery({
    queryKey: queryKeys.transactions.detail(id ?? ''),
    queryFn: async () => {
      const { data } = await apiClient.get<Transaction>(`/transactions/${id}`);
      return data;
    },
    enabled: Boolean(id),
  });
}
