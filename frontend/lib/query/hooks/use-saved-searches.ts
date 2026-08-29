'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/store/authStore';
import { queryKeys } from '../keys';
import type { PropertySearchParams } from './use-properties';

export interface SavedSearchFilters {
  q?: string;
  city?: string;
  state?: string;
  country?: string;
  type?: string;
  status?: string;
  minPrice?: number;
  maxPrice?: number;
  bedrooms?: number;
  bathrooms?: number;
  furnished?: boolean;
  parking?: boolean;
  petsAllowed?: boolean;
  amenities?: string[];
  lat?: number;
  lng?: number;
  radiusKm?: number;
}

export interface SavedSearch {
  id: string;
  name: string;
  filters: SavedSearchFilters;
  alertsEnabled: boolean;
  lastNotifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSavedSearchPayload {
  name: string;
  filters: SavedSearchFilters;
  alertsEnabled?: boolean;
}

function useSavedSearchesEnabled(): boolean {
  return useAuthStore((state) => state.isAuthenticated);
}

/** Converts the querystring-shaped PropertySearchParams into a typed filters object. */
export function toSavedSearchFilters(
  params: PropertySearchParams,
): SavedSearchFilters {
  const filters: SavedSearchFilters = {};
  if (params.q) filters.q = params.q;
  if (params.city) filters.city = params.city;
  if (params.state) filters.state = params.state;
  if (params.country) filters.country = params.country;
  if (params.type) filters.type = params.type;
  if (params.status) filters.status = params.status;
  if (params.minPrice) filters.minPrice = Number(params.minPrice);
  if (params.maxPrice) filters.maxPrice = Number(params.maxPrice);
  if (params.bedrooms) filters.bedrooms = Number(params.bedrooms);
  if (params.bathrooms) filters.bathrooms = Number(params.bathrooms);
  if (params.furnished) filters.furnished = params.furnished === 'true';
  if (params.parking) filters.parking = params.parking === 'true';
  if (params.petsAllowed) filters.petsAllowed = params.petsAllowed === 'true';
  if (params.amenities) filters.amenities = params.amenities.split(',');
  if (params.lat) filters.lat = Number(params.lat);
  if (params.lng) filters.lng = Number(params.lng);
  if (params.radiusKm) filters.radiusKm = Number(params.radiusKm);
  return filters;
}

export function useSavedSearches() {
  const isEnabled = useSavedSearchesEnabled();

  return useQuery({
    queryKey: queryKeys.savedSearches.list(),
    queryFn: async () => {
      const { data } = await apiClient.get<SavedSearch[]>(
        '/search/saved-searches',
      );
      return data;
    },
    enabled: isEnabled,
    staleTime: 30_000,
  });
}

export function useCreateSavedSearch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateSavedSearchPayload) => {
      const { data } = await apiClient.post<SavedSearch>(
        '/search/saved-searches',
        payload,
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.savedSearches.all,
      });
    },
  });
}

export function useDeleteSavedSearch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/search/saved-searches/${id}`);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.savedSearches.all,
      });
    },
  });
}
