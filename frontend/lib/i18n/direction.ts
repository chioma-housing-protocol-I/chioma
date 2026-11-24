/**
 * Text-direction helpers for right-to-left (RTL) language support.
 *
 * The list covers RTL scripts in common use (Arabic, Hebrew, Persian, Urdu,
 * …) so a locale added later picks up the correct direction automatically,
 * even before it gets an explicit entry in `LOCALE_OPTIONS`.
 */

export type TextDirection = 'ltr' | 'rtl';

export const RTL_LANGUAGES = [
  'ar', // Arabic
  'arc', // Aramaic
  'ckb', // Central Kurdish (Sorani)
  'dv', // Divehi
  'fa', // Persian
  'he', // Hebrew
  'ks', // Kashmiri
  'ps', // Pashto
  'sd', // Sindhi
  'ug', // Uyghur
  'ur', // Urdu
  'yi', // Yiddish
] as const;

/** Extracts the primary language subtag, e.g. "ar-EG" → "ar". */
function primaryLanguage(locale: string): string {
  return locale.trim().toLowerCase().split(/[-_]/)[0] ?? '';
}

/** True when the given locale / BCP 47 tag is written right-to-left. */
export function isRtlLocale(locale: string | null | undefined): boolean {
  if (!locale) return false;
  return (RTL_LANGUAGES as readonly string[]).includes(
    primaryLanguage(locale),
  );
}

/** Returns the `dir` attribute value for a locale. */
export function getLocaleDirection(
  locale: string | null | undefined,
): TextDirection {
  return isRtlLocale(locale) ? 'rtl' : 'ltr';
}
