'use client';

/**
 * useTranslation — lightweight React hook for accessing translations.
 *
 * Usage:
 *   const { t, locale, setLocale, ready } = useTranslation();
 *   t('common.search')            // → "Search" | "Buscar" | "Rechercher"
 *   t('booking.nights', { count: 3 }) // → "3 nights" with interpolation
 *
 * Fallback behaviour (verified by tests):
 *   If a key is missing in the active locale, the English value is used.
 *   If the key is missing in English too, the key string is returned.
 */

import { useState, useEffect, useCallback } from 'react';
import { detectLocale, FALLBACK_LOCALE, SUPPORTED_LOCALES } from './locales';
import type { SupportedLocale } from './locales';
import { loadLocale, clearLocaleCache } from './translation-loader';
import type { TranslationDict } from './translation-loader';
import { translate } from './translate';

interface UseTranslationResult {
  /** Translate a dot-separated key with optional interpolation vars. */
  t: (key: string, vars?: Record<string, string | number>) => string;
  /** Currently active locale code. */
  locale: SupportedLocale;
  /** Change the active locale. Persists to localStorage. */
  setLocale: (locale: SupportedLocale) => void;
  /** True once the locale bundle has loaded. */
  ready: boolean;
}

export function useTranslation(): UseTranslationResult {
  const [locale, setLocaleState] = useState<SupportedLocale>(FALLBACK_LOCALE);
  const [activeDict, setActiveDict] = useState<TranslationDict>({});
  const [fallbackDict, setFallbackDict] = useState<TranslationDict>({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const detected = detectLocale();
    setLocaleState(detected);
  }, []);

  useEffect(() => {
    setReady(false);
    let cancelled = false;

    async function load() {
      try {
        // Always load English as the fallback dict
        const [active, fallback] = await Promise.all([
          loadLocale(locale),
          locale !== FALLBACK_LOCALE
            ? loadLocale(FALLBACK_LOCALE)
            : Promise.resolve({} as TranslationDict),
        ]);

        if (!cancelled) {
          setActiveDict(active);
          setFallbackDict(locale !== FALLBACK_LOCALE ? fallback : active);
          setReady(true);
        }
      } catch (err) {
        console.error('[i18n] Failed to load locale:', err);
        if (!cancelled) setReady(true); // still mark ready so UI doesn't hang
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [locale]);

  const setLocale = useCallback((next: SupportedLocale) => {
    if (!SUPPORTED_LOCALES.includes(next)) {
      console.warn(`[i18n] Unsupported locale "${next}". Ignoring.`);
      return;
    }
    if (typeof window !== 'undefined') {
      localStorage.setItem('chioma_locale', next);
    }
    setLocaleState(next);
  }, []);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) =>
      translate(key, activeDict, fallbackDict, vars),
    [activeDict, fallbackDict],
  );

  return { t, locale, setLocale, ready };
}

export type { SupportedLocale };
export { clearLocaleCache };
