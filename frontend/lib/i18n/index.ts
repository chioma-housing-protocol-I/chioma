'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { en, es, fr, ar, he, type TranslationKeys } from './translations';
import {
  formatDate,
  formatNumber,
  formatCurrency,
  formatCrypto,
} from '../utils/format';
import { createVersionedPersistConfig } from '@/store/persistence';
import { getLocaleDirection, type TextDirection } from './direction';

export {
  RTL_LANGUAGES,
  isRtlLocale,
  getLocaleDirection,
  type TextDirection,
} from './direction';

// ─── Types ───────────────────────────────────────────────────────────────────

export type SupportedLocale = 'en' | 'es' | 'fr' | 'ar' | 'he';

export interface LocaleOption {
  code: SupportedLocale;
  label: string;
  nativeLabel: string;
  dir: TextDirection;
}

export const LOCALE_OPTIONS: LocaleOption[] = [
  { code: 'en', label: 'English', nativeLabel: 'English', dir: 'ltr' },
  { code: 'es', label: 'Spanish', nativeLabel: 'Español', dir: 'ltr' },
  { code: 'fr', label: 'French', nativeLabel: 'Français', dir: 'ltr' },
  // RTL verification locale — see translations/ar.ts.
  { code: 'ar', label: 'Arabic', nativeLabel: 'العربية', dir: 'rtl' },
  { code: 'he', label: 'Hebrew', nativeLabel: 'עברית', dir: 'rtl' },
];

const SUPPORTED_LOCALE_CODES: SupportedLocale[] = LOCALE_OPTIONS.map(
  (o) => o.code,
);

/** Type guard for values read from storage / the browser. */
export function isSupportedLocale(value: unknown): value is SupportedLocale {
/** All locale codes the app ships translations for. */
export const SUPPORTED_LOCALE_CODES: SupportedLocale[] = LOCALE_OPTIONS.map(
  (option) => option.code,
);

function isSupportedLocaleCode(value: unknown): value is SupportedLocale {
  return (
    typeof value === 'string' &&
    (SUPPORTED_LOCALE_CODES as string[]).includes(value)
  );
}

/** localStorage key the selected locale is persisted under. */
export const I18N_STORAGE_KEY = 'chioma-locale';
/** Text direction for a supported locale (falls back to script detection). */
export function getDirectionForLocale(locale: SupportedLocale): TextDirection {
  return (
    LOCALE_OPTIONS.find((option) => option.code === locale)?.dir ??
    getLocaleDirection(locale)
  );
}

const TRANSLATIONS: Record<SupportedLocale, TranslationKeys> = {
  en,
  es,
  fr,
  ar,
  he,
};

/** Bump when persisted locale state shape changes. */
export const I18N_STORE_VERSION = 1;

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
    createVersionedPersistConfig<I18nStore, Pick<I18nStore, 'locale'>>({
      name: I18N_STORAGE_KEY,
      version: I18N_STORE_VERSION,
      partialize: (state: I18nStore) => ({ locale: state.locale }),
      migrations: {
        1: (state) => {
          const legacy = state as Record<string, unknown>;
          const locale = isSupportedLocale(legacy.locale)
          const locale = isSupportedLocaleCode(legacy.locale)
            ? legacy.locale
            : 'en';
          return { locale };
        },
      },
      onRehydrateStorage: () => (state: I18nStore | undefined) => {
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
            !localStorage.getItem(I18N_STORAGE_KEY)
          ) {
            const browserLang = navigator.language.split('-')[0];
            if (isSupportedLocale(browserLang)) {
            if (isSupportedLocaleCode(browserLang)) {
              state.setLocale(browserLang);
            }
          }
        }
      },
    }),
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

/** Every valid dot-separated translation key, e.g. `'common.save'`. */
export type TranslationPath = NestedKeyOf<TranslationKeys>;

/** Interpolation values for `{{name}}` placeholders. */
export type TranslationVars = Record<string, string | number>;

function getNestedValue(
  obj: Record<string, unknown>,
  path: string,
): string | undefined {
  const parts = path.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === 'string' ? current : undefined;
}

function interpolate(template: string, vars?: TranslationVars): string {
  if (!vars) return template;
  return template.replace(/\{\{(\w+)\}\}/g, (match, name: string) =>
    vars[name] !== undefined ? String(vars[name]) : match,
  );
}

/**
 * Resolve a key for a locale without React. Falls back to English, then to
 * the key itself, so the UI never renders `undefined`.
 */
export function translate(
  locale: SupportedLocale,
  key: TranslationPath,
  vars?: TranslationVars,
): string {
  const dict = TRANSLATIONS[locale] as unknown as Record<string, unknown>;
  const value =
    getNestedValue(dict, key) ??
    getNestedValue(TRANSLATIONS.en as unknown as Record<string, unknown>, key);
  return interpolate(value ?? key, vars);
}

/**
 * Primary i18n hook. Returns a `t()` function, locale helpers, and formatting functions.
 *
 * @example
 * const { t, locale, setLocale, formatDate, formatNumber, formatCurrency, formatCrypto } = useTranslation();
 * <p>{t('common.save')}</p>
 * <p>{t('footer.copyright', { year: 2026 })}</p>
 * <p>{formatDate(new Date())}</p>
 */
export function useTranslation() {
  const { locale, setLocale, _hasHydrated } = useI18nStore();

  // During SSR and first client render (before hydration), use 'en'
  // to avoid hydration mismatch with server-rendered text.
  const activeLocale = _hasHydrated ? locale : 'en';

  function t(key: TranslationPath, vars?: TranslationVars): string {
    return translate(activeLocale, key, vars);
  const dict = TRANSLATIONS[activeLocale] as unknown as Record<string, unknown>;
  const dir = getDirectionForLocale(activeLocale);

  function t(key: TranslationPath): string {
    return getNestedValue(dict, key);
  }

  return {
    t,
    locale: activeLocale,
    dir,
    isRtl: dir === 'rtl',
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
