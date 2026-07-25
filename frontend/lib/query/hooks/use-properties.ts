'use client';

import {
  useQuery,
  useMutation,
  useQueryClient,
  useInfiniteQuery,
} from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { queryKeys } from '../keys';
import type { Property, PaginatedResponse, SearchResult, User } from '@/types';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PropertyListParams {
  page?: number;
  limit?: number;
  city?: string;
  state?: string;
  country?: string;
  minPrice?: number;
  maxPrice?: number;
  minBedrooms?: number;
  maxBedrooms?: number;
  minBathrooms?: number;
  maxBathrooms?: number;
  type?: Property['type'];
  status?: Property['status'];
  search?: string;
  isFurnished?: boolean;
  hasParking?: boolean;
  petsAllowed?: boolean;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface CreatePropertyPayload {
  title: string;
  description?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  price: number;
  currency?: string;
  bedrooms?: number;
  bathrooms?: number;
  /** Area in square metres (backend field) */
  area?: number;
  floor?: number;
  type?: Property['type'];
  isFurnished?: boolean;
  hasParking?: boolean;
  petsAllowed?: boolean;
  amenities?: Array<{ name: string; icon?: string }>;
  images?: Array<{ url: string; sortOrder?: number; isPrimary?: boolean }>;
  metadata?: Record<string, unknown>;
}

export type UpdatePropertyPayload = Partial<CreatePropertyPayload>;

export interface PropertyListingWizardDraft {
  id: string;
  landlordId: string;
  data: Record<string, unknown>;
  currentStep: number;
  completedSteps: number[];
  createdAt: string;
  updatedAt: string;
  expiresAt: string | null;
}

interface StartWizardPayload {
  data?: Record<string, unknown>;
}

interface UpdateWizardStepPayload {
  step: number;
  data: Record<string, unknown>;
  completedSteps?: number[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildQueryString(params: PropertyListParams): string {
  const qs = new URLSearchParams();
  if (params.page) qs.append('page', String(params.page));
  if (params.limit) qs.append('limit', String(params.limit));
  if (params.city) qs.append('city', params.city);
  if (params.state) qs.append('state', params.state);
  if (params.country) qs.append('country', params.country);
  if (params.minPrice !== undefined)
    qs.append('minPrice', String(params.minPrice));
  if (params.maxPrice !== undefined)
    qs.append('maxPrice', String(params.maxPrice));
  if (params.minBedrooms !== undefined)
    qs.append('minBedrooms', String(params.minBedrooms));
  if (params.maxBedrooms !== undefined)
    qs.append('maxBedrooms', String(params.maxBedrooms));
  if (params.minBathrooms !== undefined)
    qs.append('minBathrooms', String(params.minBathrooms));
  if (params.maxBathrooms !== undefined)
    qs.append('maxBathrooms', String(params.maxBathrooms));
  if (params.type) qs.append('type', params.type);
  if (params.status) qs.append('status', params.status);
  if (params.search) qs.append('search', params.search);
  if (params.isFurnished !== undefined)
    qs.append('isFurnished', String(params.isFurnished));
  if (params.hasParking !== undefined)
    qs.append('hasParking', String(params.hasParking));
  if (params.petsAllowed !== undefined)
    qs.append('petsAllowed', String(params.petsAllowed));
  if (params.sortBy) qs.append('sortBy', params.sortBy);
  if (params.sortOrder) qs.append('sortOrder', params.sortOrder);
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
 * Record a public listing view (increments backend viewCount).
 */
export function useRecordPropertyView() {
  return useMutation({
    mutationFn: async (propertyId: string) => {
      const { data } = await apiClient.post<{
        viewCount: number;
        lastViewedAt: string;
      }>(`/properties/${propertyId}/view`);
      return data;
    },
  });
}

/**
 * Record interest / favorite (increments backend favoriteCount).
 */
export function useRecordPropertyFavorite() {
  return useMutation({
    mutationFn: async (propertyId: string) => {
      const { data } = await apiClient.post<{ favoriteCount: number }>(
        `/properties/${propertyId}/favorite`,
      );
      return data;
    },
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

// ─── Search Hooks ────────────────────────────────────────────────────────────

export interface PropertySearchParams {
  q?: string;
  city?: string;
  state?: string;
  country?: string;
  type?: string;
  status?: string;
  minPrice?: string;
  maxPrice?: string;
  bedrooms?: string;
  bathrooms?: string;
  furnished?: string;
  parking?: string;
  petsAllowed?: string;
  amenities?: string;
  lat?: string;
  lng?: string;
  radiusKm?: string;
  page?: string;
  limit?: string;
  sortBy?: string;
  sortOrder?: string;
  [key: string]: string | undefined;
}

function buildSearchQueryString(params: PropertySearchParams): string {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== '' && val !== null) {
      qs.append(key, val);
    }
  });
  const str = qs.toString();
  return str ? `?${str}` : '';
}

/**
 * Fetch search results from the dedicated search/properties endpoint
 * with full-text search, filters, faceting, and pagination.
 */
export function useSearchProperties(params: PropertySearchParams = {}) {
  return useQuery({
    queryKey: queryKeys.search.properties(params),
    queryFn: async () => {
      const { data } = await apiClient.get<SearchResult<Property>>(
        `/search/properties${buildSearchQueryString(params)}`,
      );
      return data;
    },
  });
}

/**
 * Search users by name, email, role, or status.
 */
export function useSearchUsers(params: PropertySearchParams = {}) {
  return useQuery({
    queryKey: queryKeys.search.users(params),
    queryFn: async () => {
      const { data } = await apiClient.get<{
        items: User[];
        total: number;
        page: number;
        limit: number;
      }>(`/search/users${buildSearchQueryString(params)}`);
      return data;
    },
  });
}

/**
 * Search documents (agreements) by status, party, date, or amount.
 */
export function useSearchDocuments(params: PropertySearchParams = {}) {
  return useQuery({
    queryKey: queryKeys.search.documents(params),
    queryFn: async () => {
      const { data } = await apiClient.get<{
        items: Record<string, unknown>[];
        total: number;
        page: number;
        limit: number;
      }>(`/search/documents${buildSearchQueryString(params)}`);
      return data;
    },
  });
}

/**
 * Autocomplete suggestions for the search bar.
 */
export function useSearchSuggest(q: string) {
  return useQuery({
    queryKey: queryKeys.search.suggest(q),
    queryFn: async () => {
      const { data } = await apiClient.get<string[]>(
        `/search/suggest?q=${encodeURIComponent(q)}`,
      );
      return data;
    },
    enabled: q.length >= 2,
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
 * Optimistically updates the detail cache; reverts on failure.
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
    onMutate: async (payload) => {
      await queryClient.cancelQueries({
        queryKey: queryKeys.properties.detail(id),
      });
      const previous = queryClient.getQueryData<Property>(
        queryKeys.properties.detail(id),
      );
      if (previous) {
        queryClient.setQueryData(queryKeys.properties.detail(id), {
          ...previous,
          ...payload,
        });
      }
      return { previous };
    },
    onError: (_err, _payload, context) => {
      if (context?.previous) {
        queryClient.setQueryData(
          queryKeys.properties.detail(id),
          context.previous,
        );
      }
    },
    onSettled: (updated) => {
      if (updated) {
        queryClient.setQueryData(queryKeys.properties.detail(id), updated);
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.properties.lists() });
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
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.properties.all });

      const previousLists = queryClient.getQueriesData<
        PaginatedResponse<Property>
      >({ queryKey: queryKeys.properties.lists() });

      queryClient.setQueriesData<PaginatedResponse<Property>>(
        { queryKey: queryKeys.properties.lists() },
        (old) =>
          old ? { ...old, data: old.data.filter((p) => p.id !== id) } : old,
      );

      return { previousLists };
    },
    onError: (_err, _id, context) => {
      if (context?.previousLists) {
        context.previousLists.forEach(([key, data]) => {
          queryClient.setQueryData(key, data);
        });
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.properties.all });
    },
  });
}

export function useStartPropertyListingWizard() {
  return useMutation({
    mutationFn: async (payload: StartWizardPayload = {}) => {
      const { data } = await apiClient.post<PropertyListingWizardDraft>(
        '/properties/property-listings/wizard/start',
        payload,
      );
      return data;
    },
  });
}

export function useWizardDraft(id: string | null) {
  return useQuery({
    queryKey: ['property-listing-wizard-draft', id],
    queryFn: async () => {
      const { data } = await apiClient.get<PropertyListingWizardDraft>(
        `/properties/property-listings/wizard/${id}/draft`,
      );
      return data;
    },
    enabled: Boolean(id),
  });
}

export function useUpdateWizardStep(id: string) {
  return useMutation({
    mutationFn: async (payload: UpdateWizardStepPayload) => {
      const { data } = await apiClient.patch<PropertyListingWizardDraft>(
        `/properties/property-listings/wizard/${id}/step`,
        payload,
      );
      return data;
    },
  });
}

export function usePublishWizardDraft(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data } = await apiClient.post<Property>(
        `/properties/property-listings/wizard/${id}/publish`,
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.properties.all });
    },
  });
}

export function useDeleteWizardDraft() {
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(
        `/properties/property-listings/wizard/${id}/draft`,
      );
      return id;
    },
  });
}

// ─── Image Upload ─────────────────────────────────────────────────────────────

interface UploadUrlResponse {
  url: string;
  key: string;
}

interface UploadPropertyImageResult {
  /** Publicly accessible URL of the uploaded image */
  url: string;
  /** Storage key returned by the backend */
  key: string;
}

/**
 * Upload a property image via the backend pre-signed S3 URL flow.
 *
 * Flow:
 *   1. POST /storage/upload-url  → get a pre-signed PUT URL + storage key
 *   2. PUT <presignedUrl>        → upload the raw file directly to S3
 *   3. GET /storage/download-url?key=<key> → resolve a public/download URL
 *
 * The returned `url` can be passed directly into `CreatePropertyPayload.images`.
 */
export function useUploadPropertyImage() {
  return useMutation({
    mutationFn: async (file: File): Promise<UploadPropertyImageResult> => {
      // Step 1 – request a pre-signed upload URL
      const { data: uploadMeta } = await apiClient.post<UploadUrlResponse>(
        '/storage/upload-url',
        {
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
        },
      );

      // Step 2 – upload the file directly to the pre-signed URL (no auth header)
      const uploadResponse = await fetch(uploadMeta.url, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });

      if (!uploadResponse.ok) {
        throw new Error(
          `Image upload failed: ${uploadResponse.status} ${uploadResponse.statusText}`,
        );
      }

      // Step 3 – get the public/download URL for the stored key
      const { data: downloadMeta } = await apiClient.get<{ url: string }>(
        `/storage/download-url?key=${encodeURIComponent(uploadMeta.key)}`,
      );

      return { url: downloadMeta.url, key: uploadMeta.key };
    },
  });
}
