'use client';

import { useAuth } from '@/store/authStore';
import { hasSkippedEmailOnboarding } from '@/lib/onboarding/email-onboarding';

/** Route that collects the missing email for wallet-only accounts. */
export const COMPLETE_PROFILE_ROUTE = '/complete-profile';

export {
  clearEmailOnboardingSkip,
  skipEmailOnboarding,
} from '@/lib/onboarding/email-onboarding';

/**
 * Single source of truth for "this account still owes us an email".
 *
 * Uses the server-minted `emailCollectedAt` timestamp (present on the JWT
 * payload and stored in the auth store) as the authoritative signal.  Falling
 * back to the `email` string preserves backward compatibility with sessions
 * established before the #1832 migration ran.
 *
 * Wallet-first sign-in mints a session with no email attached (see
 * stellar-auth.service). Those users get routed through complete-profile
 * before the dashboard; everyone else passes straight through.
 */
export function needsEmailOnboarding(
  user: {
    email?: string | null;
    emailCollectedAt?: string | null;
  } | null,
): boolean {
  if (!user) return false;
  // emailCollectedAt is the canonical server-side signal (issue #1832).
  // Fall back to email presence for sessions predating the migration.
  if ('emailCollectedAt' in user) {
    return !user.emailCollectedAt;
  }
  return !user.email;
}

export interface OnboardingGate {
  /** True once auth has hydrated and the user still needs to supply an email. */
  needsEmail: boolean;
  /** needsEmail, but false when the user chose "Skip for now" this session. */
  shouldPrompt: boolean;
  /** Auth is still hydrating — callers should not redirect yet. */
  loading: boolean;
}

export function useOnboardingGate(): OnboardingGate {
  const { user, isAuthenticated, loading } = useAuth();

  const needsEmail =
    !loading && isAuthenticated && needsEmailOnboarding(user ?? null);

  return {
    needsEmail,
    shouldPrompt: needsEmail && !hasSkippedEmailOnboarding(),
    loading,
  };
}
