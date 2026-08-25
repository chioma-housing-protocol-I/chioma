import { enUS, es, fr, type Locale } from 'date-fns/locale';
import { useI18nStore, type SupportedLocale } from '../i18n';

const DATE_FNS_LOCALES: Record<SupportedLocale, Locale> = { en: enUS, es, fr };

/** Maps the app's locale code to the matching date-fns locale object. */
export function getDateFnsLocale(locale: SupportedLocale): Locale {
  return DATE_FNS_LOCALES[locale] ?? enUS;
}

/**
 * The active locale's date-fns `Locale`, for `{ locale }` options on
 * `format`, `formatDistanceToNow`, etc. Reactive: re-renders when the user
 * changes their language.
 */
export function useDateFnsLocale(): Locale {
  const locale = useI18nStore((s) => s.locale);
  return getDateFnsLocale(locale);
}
