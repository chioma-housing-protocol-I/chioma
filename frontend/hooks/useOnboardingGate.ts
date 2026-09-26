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
 * Wallet-first sign-in mints a session with no email attached (see
 * stellar-auth.service). Those users get routed through complete-profile
 * before the dashboard; everyone else passes straight through.
 */
export function needsEmailOnboarding(
  user: {
    email?: string | null;
  } | null,
): boolean {
  if (!user) return false;
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
