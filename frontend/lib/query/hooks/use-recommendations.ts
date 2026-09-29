'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/store/authStore';
import { queryKeys } from '../keys';

export interface Recommendation {
  propertyId: string;
  title: string;
  city: string;
  monthlyRent: number;
  currency?: string;
  bedrooms: number;
  amenities: string[];
  imageUrl?: string | null;
  score: number;
  reasons: string[];
}

interface RecommendationsResponse {
  recommendations: Recommendation[];
}

/** Scored recommendations built server-side from the user's own signals. */
export function useMyRecommendations(limit = 6) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return useQuery({
    queryKey: queryKeys.recommendations.me(limit),
    queryFn: async () => {
      const { data } = await apiClient.get<RecommendationsResponse>(
        `/ai/recommendations/me?limit=${limit}`,
      );
      return data.recommendations ?? [];
    },
    enabled: isAuthenticated,
    staleTime: 5 * 60_000,
  });
}
