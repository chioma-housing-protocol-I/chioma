'use client';

import { createContext, useContext, type ReactNode } from 'react';
import type { AuthHint } from './authStore';

/**
 * Auth hint read server-side from the `chioma_auth_hint` cookie and passed
 * into the tree so the first paint (SSR + client hydration) can already show
 * the signed-in UI, instead of always starting signed-out and correcting
 * once the Zustand store hydrates from localStorage on mount.
 */
const InitialAuthContext = createContext<AuthHint | null>(null);

export function InitialAuthProvider({
  value,
  children,
}: {
  value: AuthHint | null;
  children: ReactNode;
}) {
  return (
    <InitialAuthContext.Provider value={value}>
      {children}
    </InitialAuthContext.Provider>
  );
}

/** Server-derived auth hint for the first paint, before the store hydrates. */
export function useInitialAuthHint(): AuthHint | null {
  return useContext(InitialAuthContext);
}
