'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { queryKeys } from '../keys';

/**
 * A single day in a property's availability calendar, as returned by
 * `GET /properties/:propertyId/availability`. Shared between the guest
 * booking flow and the host calendar.
 */
export interface AvailabilityDay {
  /** ISO date (YYYY-MM-DD). */
  date: string;
  /** Whether the date can be booked. `false` means blocked/unavailable. */
  available: boolean;
  /** Host-set nightly override for this date, or `null` to use base price. */
  customPrice: number | null;
  notes: string | null;
  blockedByBookingId: string | null;
}

/**
 * Fetch the availability (and per-night pricing) calendar for a property over
 * an inclusive date range. Used up front in the booking flow so guests see
 * blocked dates and the computed price before submitting — the server-side
 * overlap check in `bookings.service` remains the source of truth.
 */
export function useAvailability(
  propertyId: string | null | undefined,
  startDate: string,
  endDate: string,
) {
  const id = propertyId ? String(propertyId) : '';

  return useQuery({
    queryKey: queryKeys.availability.calendar(id, startDate, endDate),
    queryFn: async () => {
      const query = new URLSearchParams({ startDate, endDate }).toString();
      const { data } = await apiClient.get<AvailabilityDay[]>(
        `/properties/${id}/availability?${query}`,
      );
      return data;
    },
    enabled: Boolean(id) && Boolean(startDate) && Boolean(endDate),
    staleTime: 60_000,
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
          queryKey: queryKeys.availability.all,
        });
      }
    },
  });
}
