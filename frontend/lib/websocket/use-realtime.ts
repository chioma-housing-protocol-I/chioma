'use client';

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import { useNotificationStore } from '@/store/notificationStore';
import * as ws from './manager';
import { queryKeys } from '@/lib/query/keys';
import type { Notification } from '@/components/notifications/types';

/**
 * Hook that bridges the WebSocket connection with Zustand stores and
 * React Query caches. Call once in the root layout — it will:
 *
 * 1. Connect/disconnect based on auth state.
 * 2. Push incoming notifications into the Zustand store.
 * 3. Invalidate relevant React Query caches on server events.
 */
export function useRealtime(): void {
  const accessToken = useAuthStore((s) => s.accessToken);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const addNotification = useNotificationStore((s) => s.addNotification);
  const queryClient = useQueryClient();
  const cleanupRef = useRef<Array<() => void>>([]);

  useEffect(() => {
    if (!isAuthenticated || !accessToken) {
      ws.disconnect();
      return;
    }

    ws.connect({ token: accessToken });

    const unsubs: Array<() => void> = [];

    // Incoming notification → update Zustand store + invalidate RQ cache
    unsubs.push(
      ws.on('notification', (raw: unknown) => {
        const notification = raw as Notification;
        addNotification(notification);
        queryClient.invalidateQueries({
          queryKey: queryKeys.notifications.all,
        });
      }),
    );

    // Property-related events → invalidate property caches
    unsubs.push(
      ws.on('property:updated', () => {
        queryClient.invalidateQueries({
          queryKey: queryKeys.properties.all,
        });
      }),
    );

    // Payment events → invalidate payment caches
    unsubs.push(
      ws.on('payment:completed', () => {
        queryClient.invalidateQueries({
          queryKey: queryKeys.payments.all,
        });
      }),
    );

    // Maintenance events → invalidate maintenance caches
    unsubs.push(
      ws.on('maintenance:updated', () => {
        queryClient.invalidateQueries({
          queryKey: queryKeys.maintenance.all,
        });
      }),
    );

    cleanupRef.current = unsubs;

    return () => {
      unsubs.forEach((fn) => fn());
      ws.disconnect();
    };
  }, [isAuthenticated, accessToken, addNotification, queryClient]);
}
