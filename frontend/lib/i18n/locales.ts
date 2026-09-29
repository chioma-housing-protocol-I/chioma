/**
 * Supported locales and their display names.
 * The FALLBACK_LOCALE is used whenever a key is missing in the active locale.
 */

export const SUPPORTED_LOCALES = ['en', 'es', 'fr'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const FALLBACK_LOCALE: SupportedLocale = 'en';

export const LOCALE_NAMES: Record<SupportedLocale, string> = {
  en: 'English',
  es: 'Español',
  fr: 'Français',
};

/** Detect locale from browser or a stored preference, defaulting to 'en'. */
export function detectLocale(): SupportedLocale {
  if (typeof window === 'undefined') return FALLBACK_LOCALE;

  // 1. Previously saved preference
  const stored = localStorage.getItem(
    'chioma_locale',
  ) as SupportedLocale | null;
  if (stored && SUPPORTED_LOCALES.includes(stored)) return stored;

  // 2. Browser language (first two chars)
  const browserLang = navigator.language.slice(0, 2) as SupportedLocale;
  if (SUPPORTED_LOCALES.includes(browserLang)) return browserLang;

  return FALLBACK_LOCALE;
}
