import { Injectable } from '@nestjs/common';
import { en } from './data/en';
import { fr } from './data/fr';
import { es } from './data/es';
import { ar } from './data/ar';
import { FormatUtils } from '../../common/utils';

export const SUPPORTED_LANGUAGES = ['en', 'fr', 'es', 'ar'] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

type TranslationTree = Record<string, unknown>;

@Injectable()
export class I18nService {
  private readonly defaultLanguage: SupportedLanguage = 'en';

  private readonly translations: Record<SupportedLanguage, TranslationTree> = {
    en,
    fr,
    es,
    ar,
  };

  getSupportedLanguages(): SupportedLanguage[] {
    return Object.keys(this.translations) as SupportedLanguage[];
  }

  /**
   * Resolves the effective language for a request/operation.
   *
   * `candidate` is the per-request signal (a `?lang=` query param or
   * `Accept-Language`/`x-language` header). When it is absent or
   * unsupported, `fallback` — typically the user's stored
   * {@link User.preferredLanguage} preference — is tried next, so outbound
   * emails and API responses can honour a durable choice without the client
   * passing `lang` on every request. If neither yields a supported locale,
   * the service default (`en`) is used.
   */
  resolveLanguage(candidate?: string, fallback?: string): SupportedLanguage {
    return (
      this.normalizeLanguage(candidate) ??
      this.normalizeLanguage(fallback) ??
      this.defaultLanguage
    );
  }

  private normalizeLanguage(
    candidate?: string | null,
  ): SupportedLanguage | undefined {
    if (!candidate) {
      return undefined;
    }

    const normalized = candidate
      .toLowerCase()
      .split('-')[0] as SupportedLanguage;
    return this.getSupportedLanguages().includes(normalized)
      ? normalized
      : undefined;
  }

  t(
    key: string,
    language?: string,
    params?: Record<string, string | number>,
  ): string {
    const lang = this.resolveLanguage(language);
    const value =
      this.getNested(this.translations[lang], key) ??
      this.getNested(this.translations.en, key);
    if (!value || typeof value !== 'string') {
      return key;
    }

    if (!params) {
      return value;
    }

    return Object.entries(params).reduce((result, [paramKey, paramValue]) => {
      return result.replace(
        new RegExp(`\\{${paramKey}\\}`, 'g'),
        String(paramValue),
      );
    }, value);
  }

  translationCoverage(language: SupportedLanguage): {
    total: number;
    translated: number;
    percent: number;
  } {
    const baseKeys = this.flattenKeys(this.translations.en);
    const targetKeys = new Set(this.flattenKeys(this.translations[language]));

    const translated = baseKeys.filter((k) => targetKeys.has(k)).length;
    const total = baseKeys.length;
    const percent = total === 0 ? 100 : Math.round((translated / total) * 100);

    return { total, translated, percent };
  }

  /**
   * Format a date according to the specified locale
   */
  formatDate(
    date: Date | string | number,
    language?: string,
    options?: Intl.DateTimeFormatOptions,
  ): string {
    const lang = this.resolveLanguage(language);
    return FormatUtils.formatDate(date, lang, options);
  }

  /**
   * Format a number according to the specified locale
   */
  formatNumber(
    num: number | string,
    language?: string,
    options?: Intl.NumberFormatOptions,
  ): string {
    const lang = this.resolveLanguage(language);
    return FormatUtils.formatNumber(num, lang, options);
  }

  /**
   * Format a currency amount according to the specified locale
   */
  formatCurrency(
    amount: number | string,
    currency: string,
    language?: string,
    options?: Intl.NumberFormatOptions,
  ): string {
    const lang = this.resolveLanguage(language);
    return FormatUtils.formatCurrency(amount, currency, lang, options);
  }

  /**
   * Format a crypto/Stellar amount (7 decimal places)
   */
  formatCrypto(
    amount: number | string,
    symbol?: string,
    language?: string,
    options?: Intl.NumberFormatOptions,
  ): string {
    const lang = this.resolveLanguage(language);
    return FormatUtils.formatCrypto(amount, lang, symbol, options);
  }

  private getNested(tree: TranslationTree, path: string): string | undefined {
    const value = path.split('.').reduce<unknown>((acc, part) => {
      if (!this.isRecord(acc)) {
        return undefined;
      }
      return acc[part];
    }, tree);

    return typeof value === 'string' ? value : undefined;
  }

  private flattenKeys(tree: TranslationTree, prefix = ''): string[] {
    const keys: string[] = [];

    for (const [key, value] of Object.entries(tree)) {
      const currentKey = prefix ? `${prefix}.${key}` : key;
      if (typeof value === 'string') {
        keys.push(currentKey);
      } else if (this.isRecord(value)) {
        keys.push(...this.flattenKeys(value, currentKey));
      }
    }

    return keys;
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }
}
