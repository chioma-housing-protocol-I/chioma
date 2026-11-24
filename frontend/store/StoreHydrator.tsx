'use client';

import { useEffect } from 'react';
import { useAuthStore } from './authStore';
import { useUIStore } from './ui-store';
import { useI18nStore, LOCALE_OPTIONS, type SupportedLocale } from '@/lib/i18n';

/**
 * StoreHydrator — Bootstraps client-side state on mount.
 *
 * Responsibilities:
 * 1. Track online/offline status in the UI store.
 * 2. Register service worker for offline support.
 * 3. Setup automatic background sync.
 * 4. Sync user's locale preference from their profile when authenticated.
 *
 * The real-time WebSocket bridge lives in `components/realtime/RealtimeBridge`
 * and the offline modules are imported on demand, so neither socket.io nor
 * the IndexedDB sync layer ends up in the shared first-load bundle.
 *
 * Auth hydration itself lives in `AuthHydrator` -- render both once inside
 * the root layout's <body>, wrapped by QueryProvider.
 */
export function StoreHydrator() {
  const setOnlineStatus = useUIStore((s) => s.setOnlineStatus);
  const user = useAuthStore((s) => s.user);
  const setLocale = useI18nStore((s) => s.setLocale);

  // Sync locale preference from user profile once authenticated.
  // This ensures that if the user had saved a preference server-side,
  // it overrides the browser-detected or previously stored local preference.
  useEffect(() => {
    const isSupportedLocale = LOCALE_OPTIONS.some(
      (option) => option.code === user?.locale,
    );
    if (user?.locale && isSupportedLocale) {
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

  // Register service worker and setup offline support. Loaded on demand so
  // the offline sync layer is split into its own chunk.
  useEffect(() => {
    let cancelled = false;
    let cleanup: (() => void) | undefined;

    void import('@/lib/offline/register-sw').then(
      ({ registerServiceWorker }) => {
        if (!cancelled) void registerServiceWorker();
      },
    );
    void import('@/lib/offline/background-sync').then(({ setupAutoSync }) => {
      if (!cancelled) cleanup = setupAutoSync();
    });

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, []);

  return null;
}
