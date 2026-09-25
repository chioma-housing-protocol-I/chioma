'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export interface AvailabilityDay {
  date: string;
  available: boolean;
  customPrice: number | string | null;
  notes: string | null;
  blockedByBookingId: string | null;
}

export const availabilityKeys = {
  all: ['availability'] as const,
  range: (propertyId: string, startDate: string, endDate: string) =>
    [...availabilityKeys.all, propertyId, startDate, endDate] as const,
  property: (propertyId: string) =>
    [...availabilityKeys.all, propertyId] as const,
};

export function useAvailability(
  propertyId: string | null,
  startDate: string,
  endDate: string,
) {
  return useQuery({
    queryKey: availabilityKeys.range(propertyId ?? '', startDate, endDate),
    queryFn: async () => {
      const { data } = await apiClient.get<AvailabilityDay[]>(
        `/properties/${propertyId}/availability?startDate=${startDate}&endDate=${endDate}`,
      );
      return data;
    },
    enabled: !!propertyId,
  });
}

type DayAction =
  | { type: 'block'; date: string }
  | { type: 'unblock'; date: string }
  | { type: 'price'; date: string; price: number };

export function useUpdateAvailabilityDay(propertyId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (action: DayAction) => {
      const base = `/properties/${propertyId}/availability`;
      if (action.type === 'price') {
        const { data } = await apiClient.post(`${base}/price`, {
          date: action.date,
          price: action.price,
        });
        return data;
      }
      const { data } = await apiClient.post(`${base}/${action.type}`, {
        dates: [action.date],
      });
      return data;
    },
    onSuccess: () => {
      if (propertyId) {
        queryClient.invalidateQueries({
          queryKey: availabilityKeys.property(propertyId),
        });
      }
    },
  });
}
