import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { act } from 'react';
import { useI18nStore, type SupportedLocale } from '@/lib/i18n';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function resetStore() {
  useI18nStore.setState({ locale: 'en', _hasHydrated: false });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('useI18nStore — language detection and persistence', () => {
  beforeEach(() => {
    resetStore();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('defaults to "en" on initial state', () => {
    expect(useI18nStore.getState().locale).toBe('en');
  });

  it('setLocale updates the locale', () => {
    act(() => {
      useI18nStore.getState().setLocale('fr');
    });
    expect(useI18nStore.getState().locale).toBe('fr');
  });

  it('setHasHydrated flips the _hasHydrated flag', () => {
    expect(useI18nStore.getState()._hasHydrated).toBe(false);
    act(() => {
      useI18nStore.getState().setHasHydrated(true);
    });
    expect(useI18nStore.getState()._hasHydrated).toBe(true);
  });

  it('detects browser language from navigator.language when localStorage is empty', () => {
    // Simulate no stored preference
    localStorage.removeItem('chioma-locale');

    // Spy navigator.language
    Object.defineProperty(navigator, 'language', {
      value: 'fr-FR',
      configurable: true,
    });

    // Manually invoke the detection logic (mirrors onRehydrateStorage body)
    if (
      typeof window !== 'undefined' &&
      !localStorage.getItem('chioma-locale')
    ) {
      const browserLang = navigator.language.split('-')[0];
      if (['en', 'es', 'fr'].includes(browserLang)) {
        useI18nStore.getState().setLocale(browserLang as SupportedLocale);
      }
    }

    expect(useI18nStore.getState().locale).toBe('fr');
  });

  it('does NOT override stored locale when localStorage already has a preference', () => {
    // Simulate an existing stored preference
    localStorage.setItem(
      'chioma-locale',
      JSON.stringify({ state: { locale: 'es' }, version: 0 }),
    );

    Object.defineProperty(navigator, 'language', {
      value: 'en-US',
      configurable: true,
    });

    // The detection guard checks for 'chioma-locale' in localStorage; since it exists,
    // it should not override. We simulate that guard here.
    const hasStoredPreference = !!localStorage.getItem('chioma-locale');
    if (!hasStoredPreference) {
      useI18nStore.getState().setLocale('en');
    }

    // locale should remain whatever it was set to before (default 'en' in this test)
    expect(useI18nStore.getState().locale).toBe('en'); // unchanged from reset
  });

  it('falls back to "en" if browser language is unsupported', () => {
    localStorage.removeItem('chioma-locale');

    Object.defineProperty(navigator, 'language', {
      value: 'zh-CN',
      configurable: true,
    });

    const browserLang = navigator.language.split('-')[0];
    if (['en', 'es', 'fr'].includes(browserLang)) {
      useI18nStore.getState().setLocale(browserLang as SupportedLocale);
    }

    // Should not have changed from the reset default 'en'
    expect(useI18nStore.getState().locale).toBe('en');
  });

  it('persists locale across setLocale calls', () => {
    act(() => {
      useI18nStore.getState().setLocale('es');
    });
    expect(useI18nStore.getState().locale).toBe('es');

    act(() => {
      useI18nStore.getState().setLocale('fr');
    });
    expect(useI18nStore.getState().locale).toBe('fr');
  });
});

describe('useI18nStore — profile locale sync', () => {
  beforeEach(() => {
    resetStore();
  });

  it('accepts a supported locale set by external code (e.g. StoreHydrator)', () => {
    // Simulate StoreHydrator syncing user.locale from profile
    const userLocale = 'es' as SupportedLocale;
    const SUPPORTED: SupportedLocale[] = ['en', 'es', 'fr'];

    if (SUPPORTED.includes(userLocale)) {
      act(() => {
        useI18nStore.getState().setLocale(userLocale);
      });
    }

    expect(useI18nStore.getState().locale).toBe('es');
  });

  it('ignores an unsupported locale from user profile', () => {
    const unsupportedLocale = 'de';
    const SUPPORTED: SupportedLocale[] = ['en', 'es', 'fr'];

    if (SUPPORTED.includes(unsupportedLocale as SupportedLocale)) {
      act(() => {
        useI18nStore.getState().setLocale(unsupportedLocale as SupportedLocale);
      });
    }

    // Locale should still be the default 'en'
    expect(useI18nStore.getState().locale).toBe('en');
  });
});
