'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { queryKeys } from '../keys';
import type { PaginatedResponse, Property } from '@/types';

export interface FavoriteItem {
  id?: string;
  propertyId: string;
  property?: Property;
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

export function useFavorites() {
  return useQuery({
    queryKey: queryKeys.favorites.list(),
    queryFn: async () => {
      const { data } = await apiClient.get<FavoritesResponse>('/favorites');
      return normalizeFavorites(data);
    },
    staleTime: 30_000,
  });
}

export function useFavoriteStatus(propertyId: string | number | null) {
  const id = propertyId ? String(propertyId) : '';

  return useQuery({
    queryKey: queryKeys.favorites.status(id),
    queryFn: async () => {
      const { data } = await apiClient.get<FavoriteStatus>(`/favorites/${id}`);
      return data;
    },
    enabled: Boolean(id),
    staleTime: 30_000,
  });
}

export function useFavoriteCount(propertyId: string | number | null) {
  const id = propertyId ? String(propertyId) : '';

  return useQuery({
    queryKey: queryKeys.favorites.count(id),
    queryFn: async () => {
      const { data } = await apiClient.get<{ favoriteCount: number }>(
        `/favorites/${id}/count`,
      );
      return data.favoriteCount;
    },
    enabled: Boolean(id),
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
          favoriteCount: old?.favoriteCount ?? previousStatus?.favoriteCount ?? 0,
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
      queryClient.setQueryData<FavoriteItem[]>(queryKeys.favorites.list(), (old) =>
        old?.filter((favorite) => favorite.propertyId !== propertyId),
      );

      return { previousStatus, previousList };
    },
    onError: (_err, propertyId, context) => {
      queryClient.setQueryData(
        queryKeys.favorites.status(propertyId),
        context?.previousStatus,
      );
      queryClient.setQueryData(queryKeys.favorites.list(), context?.previousList);
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
