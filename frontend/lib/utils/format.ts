import { useI18nStore, type SupportedLocale } from '../i18n';

function resolveLocale(locale?: SupportedLocale): SupportedLocale {
  if (locale === 'en' || locale === 'es' || locale === 'fr') {
    return locale;
  }
  try {
    return useI18nStore.getState().locale || 'en';
  } catch {
    return 'en';
  }
}

/**
 * Format a date according to the specified or active locale
 */
export function formatDate(
  date: Date | string | number | null | undefined,
  localeOrOptions?: SupportedLocale | Intl.DateTimeFormatOptions,
  options?: Intl.DateTimeFormatOptions,
): string {
  if (date === null || date === undefined || date === '') return '';
  const d =
    typeof date === 'string' || typeof date === 'number'
      ? new Date(date)
      : date;
  if (isNaN(d.getTime())) return '';

  let locale: SupportedLocale;
  let opts: Intl.DateTimeFormatOptions | undefined;

  if (typeof localeOrOptions === 'string') {
    locale = resolveLocale(localeOrOptions as SupportedLocale);
    opts = options;
  } else {
    locale = resolveLocale();
    opts = localeOrOptions;
  }

  return new Intl.DateTimeFormat(locale, opts).format(d);
}

/**
 * Format a number according to the specified or active locale
 */
export function formatNumber(
  num: number | string | null | undefined,
  localeOrOptions?: SupportedLocale | Intl.NumberFormatOptions,
  options?: Intl.NumberFormatOptions,
): string {
  if (num === null || num === undefined || num === '') return '';
  const n = typeof num === 'string' ? Number(num) : num;
  if (isNaN(n)) return '';

  let locale: SupportedLocale;
  let opts: Intl.NumberFormatOptions | undefined;

  if (typeof localeOrOptions === 'string') {
    locale = resolveLocale(localeOrOptions as SupportedLocale);
    opts = options;
  } else {
    locale = resolveLocale();
    opts = localeOrOptions;
  }

  return new Intl.NumberFormat(locale, opts).format(n);
}

/**
 * Format a currency amount according to the specified or active locale
 * Supports standard ISO codes (USD, EUR, GBP, NGN, etc.) and fallback for crypto/Stellar (XLM, USDC, etc.)
 */
export function formatCurrency(
  amount: number | string | null | undefined,
  currency: string = 'USD',
  localeOrOptions?: SupportedLocale | Intl.NumberFormatOptions,
  options?: Intl.NumberFormatOptions,
): string {
  if (amount === null || amount === undefined || amount === '') return '';
  const n = typeof amount === 'string' ? Number(amount) : amount;
  if (isNaN(n)) return '';

  let locale: SupportedLocale;
  let opts: Intl.NumberFormatOptions | undefined;

  if (typeof localeOrOptions === 'string') {
    locale = resolveLocale(localeOrOptions as SupportedLocale);
    opts = options;
  } else {
    locale = resolveLocale();
    opts = localeOrOptions;
  }

  const uppercaseCurrency = currency.toUpperCase();

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: uppercaseCurrency,
      ...opts,
    }).format(n);
  } catch {
    const formattedNum = new Intl.NumberFormat(locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      ...opts,
    }).format(n);
    return `${formattedNum} ${uppercaseCurrency}`;
  }
}

/**
 * Format a crypto/Stellar amount (7 decimal places) according to specified or active locale
 */
export function formatCrypto(
  amount: number | string | null | undefined,
  symbolOrLocale?: string | SupportedLocale,
  localeOrOptions?: SupportedLocale | Intl.NumberFormatOptions,
  options?: Intl.NumberFormatOptions,
): string {
  if (amount === null || amount === undefined || amount === '') return '';
  const n = typeof amount === 'string' ? Number(amount) : amount;
  if (isNaN(n)) return '';

  let symbol: string | undefined;
  let locale: SupportedLocale;
  let opts: Intl.NumberFormatOptions | undefined;

  const isLocaleStr = (str?: string): str is SupportedLocale =>
    str === 'en' || str === 'es' || str === 'fr';

  if (isLocaleStr(symbolOrLocale as string)) {
    locale = resolveLocale(symbolOrLocale as SupportedLocale);
    if (typeof localeOrOptions === 'string') {
      symbol = localeOrOptions;
      opts = options;
    } else {
      opts = localeOrOptions;
    }
  } else {
    symbol = symbolOrLocale as string | undefined;
    if (isLocaleStr(localeOrOptions as string)) {
      locale = resolveLocale(localeOrOptions as SupportedLocale);
      opts = options;
    } else {
      locale = resolveLocale();
      opts = localeOrOptions as Intl.NumberFormatOptions;
    }
  }

  const formatted = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 7,
    ...opts,
  }).format(n);

  return symbol ? `${formatted} ${symbol}` : formatted;
}
