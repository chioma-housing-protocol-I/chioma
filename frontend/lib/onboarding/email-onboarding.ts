'use client';

export const EMAIL_ONBOARDING_SKIP_KEY = 'chioma_onboarding_email_skipped';

export function skipEmailOnboarding(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(EMAIL_ONBOARDING_SKIP_KEY, '1');
}

export function clearEmailOnboardingSkip(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(EMAIL_ONBOARDING_SKIP_KEY);
}

export function hasSkippedEmailOnboarding(): boolean {
  if (typeof window === 'undefined') return false;
  return sessionStorage.getItem(EMAIL_ONBOARDING_SKIP_KEY) === '1';
}
