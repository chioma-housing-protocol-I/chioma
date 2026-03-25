'use client';

import { useEffect } from 'react';
import { useAuthStore } from './authStore';
import { useUIStore } from './ui-store';
import { useRealtime } from '@/lib/websocket/use-realtime';

/**
 * StoreHydrator — Bootstraps client-side state on mount.
 *
 * Responsibilities:
 * 1. Hydrate auth state from localStorage.
 * 2. Track online/offline status in the UI store.
 * 3. Establish real-time WebSocket connection when authenticated.
 *
 * Place this once inside the root layout's <body>, wrapped by QueryProvider.
 */
export function StoreHydrator() {
  const hydrate = useAuthStore((s) => s.hydrate);
  const setOnlineStatus = useUIStore((s) => s.setOnlineStatus);

  // Hydrate auth from localStorage
  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // Track browser online/offline status
  useEffect(() => {
    const handleOnline = () => setOnlineStatus(true);
    const handleOffline = () => setOnlineStatus(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [setOnlineStatus]);

  // Bridge WebSocket events to stores and React Query caches
  useRealtime();

  return null;
}
