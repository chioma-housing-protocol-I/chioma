'use client';

import { useAuth } from './authStore';
import { useInitialAuthHint } from './InitialAuthContext';

/**
 * Auth state for first-paint display. While the store is still hydrating
 * from localStorage (`loading === true`), falls back to the server-derived
 * cookie hint so the signed-in shell renders immediately instead of
 * flashing signed-out and correcting a moment later. Once the store
 * finishes hydrating, its (authoritative, fuller) data takes over.
 */
export function useAuthDisplay() {
  const { user, isAuthenticated, loading } = useAuth();
  const hint = useInitialAuthHint();

  const showAuthenticated = loading ? Boolean(hint) : isAuthenticated;

  return {
    isAuthenticated: showAuthenticated,
    loading: loading && !hint,
    firstName: user?.firstName ?? hint?.firstName ?? '',
    lastName: user?.lastName ?? hint?.lastName ?? '',
    avatar: user?.avatar ?? hint?.avatar,
    role: user?.role ?? hint?.role,
    /** Full user record, only available once the store has hydrated. */
    user,
  };
}
