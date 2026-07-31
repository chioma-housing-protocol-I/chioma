'use client';

import { useAuth } from '@/store/authStore';

/** Route that collects the missing email for wallet-only accounts. */
export const COMPLETE_PROFILE_ROUTE = '/complete-profile';

/**
 * sessionStorage key backing "Skip for now". Deliberately session-scoped: the
 * prompt should come back on the next visit rather than being dismissed for
 * good, since we still need an email for receipts and account recovery.
 */
const SKIP_KEY = 'chioma_onboarding_email_skipped';

export function skipEmailOnboarding(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(SKIP_KEY, '1');
}

export function clearEmailOnboardingSkip(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(SKIP_KEY);
}

function hasSkipped(): boolean {
  if (typeof window === 'undefined') return false;
  return sessionStorage.getItem(SKIP_KEY) === '1';
}

/**
 * Single source of truth for "this account still owes us an email".
 *
 * Wallet-first sign-in mints a session with no email attached (see
 * stellar-auth.service). Those users get routed through complete-profile
 * before the dashboard; everyone else passes straight through.
 */
export function needsEmailOnboarding(user: {
  email?: string | null;
} | null): boolean {
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
    shouldPrompt: needsEmail && !hasSkipped(),
    loading,
  };
}
