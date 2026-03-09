'use client';

import {
  useQuery,
  useMutation,
  useQueryClient,
  useInfiniteQuery,
} from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { queryKeys } from '../keys';
import type { Property, PaginatedResponse } from '@/types';

// ─── Types ───────────────────────────────────────────────────────────────────

interface PropertyListParams {
  page?: number;
  limit?: number;
  city?: string;
  minPrice?: number;
  maxPrice?: number;
  bedrooms?: number;
  propertyType?: string;
  status?: string;
  search?: string;
}

interface CreatePropertyPayload {
  title: string;
  description: string;
  address: string;
  city: string;
  state: string;
  country: string;
  price: number;
  bedrooms: number;
  bathrooms: number;
  squareFeet: number;
  propertyType: Property['propertyType'];
  amenities?: string[];
}

type UpdatePropertyPayload = Partial<CreatePropertyPayload>;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildQueryString(params: PropertyListParams): string {
  const qs = new URLSearchParams();
  if (params.page) qs.append('page', String(params.page));
  if (params.limit) qs.append('limit', String(params.limit));
  if (params.city) qs.append('city', params.city);
  if (params.minPrice) qs.append('minPrice', String(params.minPrice));
  if (params.maxPrice) qs.append('maxPrice', String(params.maxPrice));
  if (params.bedrooms) qs.append('bedrooms', String(params.bedrooms));
  if (params.propertyType) qs.append('propertyType', params.propertyType);
  if (params.status) qs.append('status', params.status);
  if (params.search) qs.append('search', params.search);
  const str = qs.toString();
  return str ? `?${str}` : '';
}

// ─── Queries ─────────────────────────────────────────────────────────────────

/**
 * Fetch a paginated list of properties with optional filters.
 */
export function useProperties(params: PropertyListParams = {}) {
  return useQuery({
    queryKey: queryKeys.properties.list(params),
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResponse<Property>>(
        `/properties${buildQueryString(params)}`,
      );
      return data;
    },
  });
}

/**
 * Fetch a single property by ID.
 */
export function useProperty(id: string | null) {
  return useQuery({
    queryKey: queryKeys.properties.detail(id ?? ''),
    queryFn: async () => {
      const { data } = await apiClient.get<Property>(`/properties/${id}`);
      return data;
    },
    enabled: Boolean(id),
  });
}

/**
 * Infinite-scroll property list. Each page returns `PaginatedResponse<Property>`.
 */
export function useInfiniteProperties(
  params: Omit<PropertyListParams, 'page'> = {},
) {
  return useInfiniteQuery({
    queryKey: [...queryKeys.properties.lists(), 'infinite', params],
    queryFn: async ({ pageParam = 1 }) => {
      const { data } = await apiClient.get<PaginatedResponse<Property>>(
        `/properties${buildQueryString({ ...params, page: pageParam as number })}`,
      );
      return data;
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      if (lastPage.page < lastPage.totalPages) return lastPage.page + 1;
      return undefined;
    },
  });
}

// ─── Mutations ───────────────────────────────────────────────────────────────

/**
 * Create a new property with optimistic cache update.
 */
export function useCreateProperty() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreatePropertyPayload) => {
      const { data } = await apiClient.post<Property>('/properties', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.properties.all,
      });
    },
  });
}

/**
 * Update an existing property.
 */
export function useUpdateProperty(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: UpdatePropertyPayload) => {
      const { data } = await apiClient.patch<Property>(
        `/properties/${id}`,
        payload,
      );
      return data;
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.properties.detail(id), updated);
      queryClient.invalidateQueries({
        queryKey: queryKeys.properties.lists(),
      });
    },
  });
}

/**
 * Delete a property with optimistic removal from list caches.
 */
export function useDeleteProperty() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/properties/${id}`);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.properties.all,
      });
    },
  });
}
