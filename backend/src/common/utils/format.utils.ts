
import { SupportedLanguage } from '../../modules/i18n/i18n.service';

export class FormatUtils {
  /**
   * Format a date according to the specified locale
   */
  static formatDate(
    date: Date | string | number,
    locale: SupportedLanguage,
    options?: Intl.DateTimeFormatOptions
  ): string {
    const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
    return new Intl.DateTimeFormat(locale, options).format(d);
  }

  /**
   * Format a number according to the specified locale
   */
  static formatNumber(
    num: number | string,
    locale: SupportedLanguage,
    options?: Intl.NumberFormatOptions
  ): string {
    const n = typeof num === 'string' ? Number(num) : num;
    return new Intl.NumberFormat(locale, options).format(n);
  }

  /**
   * Format a currency amount according to the specified locale
   */
  static formatCurrency(
    amount: number | string,
    currency: string,
    locale: SupportedLanguage,
    options?: Intl.NumberFormatOptions
  ): string {
    const n = typeof amount === 'string' ? Number(amount) : amount;
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      ...options,
    }).format(n);
  }

  /**
   * Format a crypto/Stellar amount (7 decimal places)
   */
  static formatCrypto(
    amount: number | string,
    locale: SupportedLanguage,
    symbol?: string,
    options?: Intl.NumberFormatOptions
  ): string {
    const n = typeof amount === 'string' ? Number(amount) : amount;
    const formatted = new Intl.NumberFormat(locale, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 7,
      ...options,
    }).format(n);
    return symbol ? `${formatted} ${symbol}` : formatted;
  }
}
