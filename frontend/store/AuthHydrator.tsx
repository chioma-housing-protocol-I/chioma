'use client';

import { useEffect } from 'react';
import { useAuthStore } from './authStore';

/**
 * AuthHydrator — Reads persisted auth state from localStorage on mount.
 *
 * Place this once inside the root layout's <body>. Unlike the old
 * AuthProvider (React Context), it does NOT wrap children — Zustand
 * stores are global singletons accessible from any component.
 */
export function AuthHydrator() {
  const hydrate = useAuthStore((s) => s.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return null;
}
