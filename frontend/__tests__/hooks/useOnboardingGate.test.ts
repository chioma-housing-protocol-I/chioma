import { describe, expect, it, beforeEach, vi } from 'vitest';
import {
  needsEmailOnboarding,
  skipEmailOnboarding,
  clearEmailOnboardingSkip,
} from '@/hooks/useOnboardingGate';

// --- needsEmailOnboarding ---------------------------------------------------

describe('needsEmailOnboarding', () => {
  it('returns false for null user', () => {
    expect(needsEmailOnboarding(null)).toBe(false);
  });

  it('returns false when emailCollectedAt is set (canonical server signal)', () => {
    expect(
      needsEmailOnboarding({ email: null, emailCollectedAt: '2024-01-01T00:00:00Z' }),
    ).toBe(false);
  });

  it('returns true when emailCollectedAt is null', () => {
    expect(
      needsEmailOnboarding({ email: null, emailCollectedAt: null }),
    ).toBe(true);
  });

  it('returns true when emailCollectedAt is undefined (field present but unset)', () => {
    // The `in` check guards against this case — undefined emailCollectedAt
    // is still falsy so the gate fires.
    expect(
      needsEmailOnboarding({ email: 'a@b.com', emailCollectedAt: undefined }),
    ).toBe(true);
  });

  it('falls back to email check for pre-migration sessions (no emailCollectedAt field)', () => {
    // Object does NOT have the emailCollectedAt key at all → legacy path.
    expect(needsEmailOnboarding({ email: 'a@b.com' })).toBe(false);
    expect(needsEmailOnboarding({ email: null })).toBe(true);
    expect(needsEmailOnboarding({ email: '' })).toBe(true);
  });
});

// --- sessionStorage skip flag -----------------------------------------------

describe('skipEmailOnboarding / clearEmailOnboardingSkip', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it('sets the skip flag', () => {
    skipEmailOnboarding();
    expect(sessionStorage.getItem('chioma_onboarding_email_skipped')).toBe('1');
  });

  it('clears the skip flag', () => {
    skipEmailOnboarding();
    clearEmailOnboardingSkip();
    expect(sessionStorage.getItem('chioma_onboarding_email_skipped')).toBeNull();
  });

  it('clearEmailOnboardingSkip is a no-op when the flag was never set', () => {
    expect(() => clearEmailOnboardingSkip()).not.toThrow();
    expect(sessionStorage.getItem('chioma_onboarding_email_skipped')).toBeNull();
  });

  it('does not throw in SSR-like environment (window undefined)', () => {
    // Temporarily hide window.sessionStorage by making the SSR guard trigger.
    const original = global.window;
    // @ts-expect-error – simulate SSR by setting window to undefined
    global.window = undefined;
    expect(() => skipEmailOnboarding()).not.toThrow();
    expect(() => clearEmailOnboardingSkip()).not.toThrow();
    global.window = original;
  });
});
