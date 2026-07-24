'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { en, es, fr, type TranslationKeys } from './translations';
import {
  formatDate,
  formatNumber,
  formatCurrency,
  formatCrypto,
} from '../utils/format';

// ─── Types ───────────────────────────────────────────────────────────────────

export type SupportedLocale = 'en' | 'es' | 'fr';

export interface LocaleOption {
  code: SupportedLocale;
  label: string;
  nativeLabel: string;
  dir: 'ltr' | 'rtl';
}

export const LOCALE_OPTIONS: LocaleOption[] = [
  { code: 'en', label: 'English', nativeLabel: 'English', dir: 'ltr' },
  { code: 'es', label: 'Spanish', nativeLabel: 'Español', dir: 'ltr' },
  { code: 'fr', label: 'French', nativeLabel: 'Français', dir: 'ltr' },
];

const TRANSLATIONS: Record<SupportedLocale, TranslationKeys> = { en, es, fr };

// ─── Store ───────────────────────────────────────────────────────────────────

interface I18nState {
  locale: SupportedLocale;
  _hasHydrated: boolean;
}

interface I18nActions {
  setLocale: (locale: SupportedLocale) => void;
  setHasHydrated: (state: boolean) => void;
}

type I18nStore = I18nState & I18nActions;

export const useI18nStore = create<I18nStore>()(
  persist(
    (set) => ({
      locale: 'en',
      _hasHydrated: false,
      setLocale: (locale) => set({ locale }),
      setHasHydrated: (state) => set({ _hasHydrated: state }),
    }),
    {
      name: 'chioma-locale',
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.setHasHydrated(true);

          // Language detection on first load (if localStorage was empty)
          // `zustand/persist` merges the stored state. If it wasn't there, it stays default 'en'.
          // We can check if chioma-locale exists in localStorage before it rehydrated,
          // but easier: if it's running in browser, we can just detect if it wasn't set.
          // Since onRehydrateStorage runs after hydration, if the locale is still 'en'
          // and they actually have a different browser language, we might not want to override
          // if they genuinely chose 'en', but checking localStorage is safer.
          if (
            typeof window !== 'undefined' &&
            !localStorage.getItem('chioma-locale')
          ) {
            const browserLang = navigator.language.split('-')[0];
            if (['en', 'es', 'fr'].includes(browserLang)) {
              state.setLocale(browserLang as SupportedLocale);
            }
          }
        }
      },
    },
  ),
);

// ─── Hook ────────────────────────────────────────────────────────────────────

type NestedKeyOf<T> = T extends object
  ? {
      [K in keyof T]: K extends string
        ? T[K] extends object
          ? `${K}.${NestedKeyOf<T[K]>}`
          : K
        : never;
    }[keyof T]
  : never;

type TranslationPath = NestedKeyOf<TranslationKeys>;

function getNestedValue(obj: Record<string, unknown>, path: string): string {
  const parts = path.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return path;
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === 'string' ? current : path;
}

/**
 * Primary i18n hook. Returns a `t()` function, locale helpers, and formatting functions.
 *
 * @example
 * const { t, locale, setLocale, formatDate, formatNumber, formatCurrency, formatCrypto } = useTranslation();
 * <p>{formatDate(new Date())}</p>
 */
export function useTranslation() {
  const { locale, setLocale, _hasHydrated } = useI18nStore();

  // During SSR and first client render (before hydration), use 'en'
  // to avoid hydration mismatch with server-rendered text.
  const activeLocale = _hasHydrated ? locale : 'en';

  const dict = TRANSLATIONS[activeLocale] as unknown as Record<string, unknown>;

  function t(key: TranslationPath): string {
    return getNestedValue(dict, key);
  }

  return {
    t,
    locale: activeLocale,
    setLocale,
    localeOptions: LOCALE_OPTIONS,
    formatDate: (
      date: Date | string | number | null | undefined,
      options?: Intl.DateTimeFormatOptions,
    ) => formatDate(date, activeLocale, options),
    formatNumber: (
      num: number | string | null | undefined,
      options?: Intl.NumberFormatOptions,
    ) => formatNumber(num, activeLocale, options),
    formatCurrency: (
      amount: number | string | null | undefined,
      currency: string = 'USD',
      options?: Intl.NumberFormatOptions,
    ) => formatCurrency(amount, currency, activeLocale, options),
    formatCrypto: (
      amount: number | string | null | undefined,
      symbol?: string,
      options?: Intl.NumberFormatOptions,
    ) => formatCrypto(amount, symbol, activeLocale, options),
    isHydrated: _hasHydrated,
  };
}
