'use client';

import { useEffect } from 'react';
import { useAuthStore } from './authStore';

/**
 * AuthHydrator -- Reads persisted auth state from localStorage on mount.
 *
 * Place this once inside the root layout's <body>. Unlike the old
 * AuthProvider (React Context), it does NOT wrap children -- Zustand
 * stores are global singletons accessible from any component.
 */
export function AuthHydrator() {
  const hydrate = useAuthStore((s) => s.hydrate);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const refreshSession = useAuthStore((s) => s.refreshSession);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!isAuthenticated) return;

    void refreshSession();
  }, [isAuthenticated, refreshSession]);

  return null;
}
