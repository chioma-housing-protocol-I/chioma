'use client';

import { useEffect } from 'react';
import { useAuthStore } from './authStore';
import { useUIStore } from './ui-store';
import { useRealtime } from '@/lib/websocket/use-realtime';
import { registerServiceWorker } from '@/lib/offline/register-sw';
import { setupAutoSync } from '@/lib/offline/background-sync';
import { useI18nStore, type SupportedLocale } from '@/lib/i18n';

/**
 * StoreHydrator — Bootstraps client-side state on mount.
 *
 * Responsibilities:
 * 1. Hydrate auth state from localStorage.
 * 2. Track online/offline status in the UI store.
 * 3. Establish real-time WebSocket connection when authenticated.
 * 4. Register service worker for offline support.
 * 5. Setup automatic background sync.
 * 6. Sync user's locale preference from their profile when authenticated.
 *
 * Place this once inside the root layout's <body>, wrapped by QueryProvider.
 */
export function StoreHydrator() {
  const hydrate = useAuthStore((s) => s.hydrate);
  const setOnlineStatus = useUIStore((s) => s.setOnlineStatus);
  const user = useAuthStore((s) => s.user);
  const setLocale = useI18nStore((s) => s.setLocale);

  // Hydrate auth from localStorage
  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // Sync locale preference from user profile once authenticated.
  // This ensures that if the user had saved a preference server-side,
  // it overrides the browser-detected or previously stored local preference.
  useEffect(() => {
    const SUPPORTED = ['en', 'es', 'fr'] as const;
    if (user?.locale && SUPPORTED.includes(user.locale as SupportedLocale)) {
      setLocale(user.locale as SupportedLocale);
    }
  }, [user?.locale, setLocale]);

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

  // Register service worker and setup offline support
  useEffect(() => {
    registerServiceWorker();
    const cleanup = setupAutoSync();
    return cleanup;
  }, []);

  // Bridge WebSocket events to stores and React Query caches
  useRealtime();

  return null;
}
