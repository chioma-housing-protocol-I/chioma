'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/store/authStore';
import { queryKeys } from '../keys';
import type { PaginatedResponse, Property } from '@/types';

export interface FavoriteItem {
  id?: string;
  propertyId: string;
  property?: Property;
  collectionId?: string | null;
  createdAt?: string;
}

export const UNCATEGORIZED_COLLECTION_ID = 'uncategorized';

export interface FavoriteCollection {
  id: string;
  name: string;
  favoriteCount: number;
  createdAt?: string;
}

export interface FavoriteStatus {
  isFavorited: boolean;
  favoriteCount: number;
}

type FavoritesResponse = FavoriteItem[] | PaginatedResponse<FavoriteItem>;

function normalizeFavorites(response: FavoritesResponse): FavoriteItem[] {
  return Array.isArray(response) ? response : response.data;
}

/**
 * Favorites are per-user, so every read here is pointless for a signed-out
 * visitor — on a public listing page that meant one 404 per property card.
 */
function useFavoritesEnabled(): boolean {
  return useAuthStore((state) => state.isAuthenticated);
}

/**
 * The favorites service is optional: when it is not deployed the API answers
 * 404. Treat that as "no favorites" rather than an error, so listing pages
 * degrade quietly instead of filling the console with failures.
 */
function isNotFound(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    (error as { status?: number }).status === 404
  );
}

export function useFavorites(collectionId?: string) {
  const isEnabled = useFavoritesEnabled();

  return useQuery({
    queryKey: queryKeys.favorites.list(collectionId),
    queryFn: async () => {
      try {
        const { data } = await apiClient.get<FavoritesResponse>(
          collectionId
            ? `/favorites?collectionId=${encodeURIComponent(collectionId)}&limit=100`
            : '/favorites',
        );
        return normalizeFavorites(data);
      } catch (error) {
        if (isNotFound(error)) return [];
        throw error;
      }
    },
    enabled: isEnabled,
    staleTime: 30_000,
  });
}

export function useFavoriteStatus(propertyId: string | number | null) {
  const id = propertyId ? String(propertyId) : '';
  const isEnabled = useFavoritesEnabled();

  return useQuery({
    queryKey: queryKeys.favorites.status(id),
    queryFn: async () => {
      try {
        const { data } = await apiClient.get<FavoriteStatus>(
          `/favorites/${id}`,
        );
        return data;
      } catch (error) {
        if (isNotFound(error)) {
          return {
            isFavorited: false,
            favoriteCount: 0,
          } satisfies FavoriteStatus;
        }
        throw error;
      }
    },
    enabled: isEnabled && Boolean(id),
    staleTime: 30_000,
  });
}

export function useFavoriteCount(propertyId: string | number | null) {
  const id = propertyId ? String(propertyId) : '';
  const isEnabled = useFavoritesEnabled();

  return useQuery({
    queryKey: queryKeys.favorites.count(id),
    queryFn: async () => {
      try {
        const { data } = await apiClient.get<{ favoriteCount: number }>(
          `/favorites/${id}/count`,
        );
        return data.favoriteCount;
      } catch (error) {
        if (isNotFound(error)) return 0;
        throw error;
      }
    },
    enabled: isEnabled && Boolean(id),
    staleTime: 30_000,
  });
}

export function useAddFavorite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (propertyId: string) => {
      const { data } = await apiClient.post<FavoriteItem>('/favorites', {
        propertyId,
      });
      return data;
    },
    onMutate: async (propertyId) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.favorites.all });
      const previousStatus = queryClient.getQueryData<FavoriteStatus>(
        queryKeys.favorites.status(propertyId),
      );

      queryClient.setQueryData<FavoriteStatus>(
        queryKeys.favorites.status(propertyId),
        (old) => ({
          isFavorited: true,
          favoriteCount:
            old?.favoriteCount ?? previousStatus?.favoriteCount ?? 0,
        }),
      );

      return { previousStatus };
    },
    onError: (_err, propertyId, context) => {
      queryClient.setQueryData(
        queryKeys.favorites.status(propertyId),
        context?.previousStatus,
      );
    },
    onSettled: (_data, _err, propertyId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.favorites.all });
      queryClient.invalidateQueries({
        queryKey: queryKeys.favorites.status(propertyId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.favorites.count(propertyId),
      });
    },
  });
}

export function useRemoveFavorite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (propertyId: string) => {
      await apiClient.delete(`/favorites/${propertyId}`);
      return propertyId;
    },
    onMutate: async (propertyId) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.favorites.all });
      const previousStatus = queryClient.getQueryData<FavoriteStatus>(
        queryKeys.favorites.status(propertyId),
      );
      const previousList = queryClient.getQueryData<FavoriteItem[]>(
        queryKeys.favorites.list(),
      );

      queryClient.setQueryData<FavoriteStatus>(
        queryKeys.favorites.status(propertyId),
        (old) => ({
          isFavorited: false,
          favoriteCount: Math.max(0, old?.favoriteCount ?? 0),
        }),
      );
      queryClient.setQueryData<FavoriteItem[]>(
        queryKeys.favorites.list(),
        (old) => old?.filter((favorite) => favorite.propertyId !== propertyId),
      );

      return { previousStatus, previousList };
    },
    onError: (_err, propertyId, context) => {
      queryClient.setQueryData(
        queryKeys.favorites.status(propertyId),
        context?.previousStatus,
      );
      queryClient.setQueryData(
        queryKeys.favorites.list(),
        context?.previousList,
      );
    },
    onSettled: (_data, _err, propertyId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.favorites.all });
      queryClient.invalidateQueries({
        queryKey: queryKeys.favorites.status(propertyId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.favorites.count(propertyId),
      });
    },
  });
}

export function useToggleFavorite(propertyId: string | number) {
  const addFavorite = useAddFavorite();
  const removeFavorite = useRemoveFavorite();

  return {
    isPending: addFavorite.isPending || removeFavorite.isPending,
    toggleFavorite: (isFavorited: boolean) => {
      const id = String(propertyId);
      return isFavorited
        ? removeFavorite.mutateAsync(id)
        : addFavorite.mutateAsync(id);
    },
  };
}

export function useFavoriteCollections() {
  const isEnabled = useFavoritesEnabled();

  return useQuery({
    queryKey: queryKeys.favorites.collections(),
    queryFn: async () => {
      try {
        const { data } = await apiClient.get<FavoriteCollection[]>(
          '/favorites/collections',
        );
        return data;
      } catch (error) {
        if (isNotFound(error)) return [];
        throw error;
      }
    },
    enabled: isEnabled,
    staleTime: 30_000,
  });
}

function useInvalidateFavorites() {
  const queryClient = useQueryClient();
  return () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.favorites.all });
}

export function useCreateFavoriteCollection() {
  const invalidate = useInvalidateFavorites();
  return useMutation({
    mutationFn: async (name: string) => {
      const { data } = await apiClient.post<FavoriteCollection>(
        '/favorites/collections',
        { name },
      );
      return data;
    },
    onSettled: invalidate,
  });
}

export function useRenameFavoriteCollection() {
  const invalidate = useInvalidateFavorites();
  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { data } = await apiClient.patch<FavoriteCollection>(
        `/favorites/collections/${id}`,
        { name },
      );
      return data;
    },
    onSettled: invalidate,
  });
}

export function useDeleteFavoriteCollection() {
  const invalidate = useInvalidateFavorites();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/favorites/collections/${id}`);
    },
    onSettled: invalidate,
  });
}

export function useMoveFavorite() {
  const invalidate = useInvalidateFavorites();
  return useMutation({
    mutationFn: async ({
      propertyId,
      collectionId,
    }: {
      propertyId: string;
      collectionId: string | null;
    }) => {
      const { data } = await apiClient.patch<FavoriteItem>(
        `/favorites/${propertyId}/collection`,
        { collectionId },
      );
      return data;
    },
    onSettled: invalidate,
  });
}
