'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { queryKeys } from '../keys';
import type { UserActivity, PaginatedResponse, ActivityType } from '@/types';

export interface UserActivityFilters {
  page?: number;
  limit?: number;
  type?: ActivityType | '';
}

function buildQueryString(params: UserActivityFilters): string {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      qs.append(key, String(value));
    }
  });
  const str = qs.toString();
  return str ? `?${str}` : '';
}

export function useUserActivities(
  userId: string,
  filters: UserActivityFilters = {},
) {
  return useQuery({
    queryKey: queryKeys.users.activities(userId, filters),
    queryFn: async () => {
      try {
        const { data } = await apiClient.get<PaginatedResponse<UserActivity>>(
          `/admin/users/${userId}/activities${buildQueryString(filters)}`,
        );
        return data;
      } catch {
        // Provide mock fallback data if the endpoint is not yet implemented
        return getMockActivities(userId, filters);
      }
    },
  });
}

function getMockActivities(
  userId: string,
  filters: UserActivityFilters,
): PaginatedResponse<UserActivity> {
  const types: ActivityType[] = [
    'login',
    'property_view',
    'system_event',
    'profile_update',
    'kyc_submission',
  ];
  const allActivities: UserActivity[] = Array.from({ length: 45 })
    .map((_, i) => {
      const activityType = types[i % types.length];

      let description = '';
      switch (activityType) {
        case 'login':
          description = 'User logged into the system';
          break;
        case 'property_view':
          description = `Viewed property "Luxury Apartment ${i}"`;
          break;
        case 'system_event':
          description = 'Password was changed successfully';
          break;
        case 'profile_update':
          description = 'Updated profile picture';
          break;
        case 'kyc_submission':
          description = 'Submitted KYC documents for verification';
          break;
      }

      return {
        id: `act-${userId}-${i}`,
        userId,
        type: activityType,
        description,
        metadata: { browser: 'Chrome', os: 'Windows' },
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0 Chrome',
        createdAt: new Date(
          Date.now() - Math.random() * 3600000 * Math.max(1, i * 4),
        ).toISOString(),
      };
    })
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

  let filtered = allActivities;
  if (filters.type) {
    filtered = allActivities.filter((a) => a.type === filters.type);
  }

  const page = filters.page || 1;
  const limit = filters.limit || 10;
  const start = (page - 1) * limit;
  const paginated = filtered.slice(start, start + limit);

  return {
    data: paginated,
    total: filtered.length,
    page,
    limit,
    totalPages: Math.ceil(filtered.length / limit),
  };
}
