import { Injectable, Logger } from '@nestjs/common';
import {
  SupportedLanguage,
  SupportedRegion,
  CurrencyFormat,
  LocaleConfig,
  DEFAULT_LOCALE_CONFIG,
  RTL_LANGUAGES,
  TextDirection,
} from '../types/i18n.types';

@Injectable()
export class LocalizationService {
  private readonly logger = new Logger(LocalizationService.name);
  private localeConfigs: Map<string, LocaleConfig> = new Map();

  constructor() {
    this.initializeDefaultConfigs();
  }

  private initializeDefaultConfigs(): void {
    // Initialize common locale configurations
    const configs: Partial<Record<SupportedLanguage, Partial<LocaleConfig>>> = {
      [SupportedLanguage.ENGLISH]: {
        language: SupportedLanguage.ENGLISH,
        region: SupportedRegion.US,
        currency: CurrencyFormat.USD,
        dateFormat: 'MM/DD/YYYY',
        timeFormat: '12h',
      },
      [SupportedLanguage.SPANISH]: {
        language: SupportedLanguage.SPANISH,
        region: SupportedRegion.MEXICO,
        currency: CurrencyFormat.USD,
        dateFormat: 'DD/MM/YYYY',
        timeFormat: '24h',
      },
      [SupportedLanguage.FRENCH]: {
        language: SupportedLanguage.FRENCH,
        region: SupportedRegion.EU,
        currency: CurrencyFormat.EUR,
        dateFormat: 'DD/MM/YYYY',
        timeFormat: '24h',
      },
      [SupportedLanguage.GERMAN]: {
        language: SupportedLanguage.GERMAN,
        region: SupportedRegion.EU,
        currency: CurrencyFormat.EUR,
        dateFormat: 'DD.MM.YYYY',
        timeFormat: '24h',
      },
      [SupportedLanguage.JAPANESE]: {
        language: SupportedLanguage.JAPANESE,
        region: SupportedRegion.JAPAN,
        currency: CurrencyFormat.JPY,
        dateFormat: 'YYYY/MM/DD',
        timeFormat: '24h',
      },
      [SupportedLanguage.CHINESE_SIMPLIFIED]: {
        language: SupportedLanguage.CHINESE_SIMPLIFIED,
        region: SupportedRegion.CHINA,
        currency: CurrencyFormat.CNY,
        dateFormat: 'YYYY-MM-DD',
        timeFormat: '24h',
      },
      [SupportedLanguage.ARABIC]: {
        language: SupportedLanguage.ARABIC,
        region: SupportedRegion.MIDDLE_EAST,
        currency: CurrencyFormat.AED,
        dateFormat: 'DD/MM/YYYY',
        timeFormat: '12h',
        rtl: true,
      },
    };

    Object.entries(configs).forEach(([lang, config]) => {
      const fullConfig = { ...DEFAULT_LOCALE_CONFIG, ...config };
      this.localeConfigs.set(lang, fullConfig);
    });

    this.logger.log('Initialized locale configurations');
  }

  getLocaleConfig(language: SupportedLanguage): LocaleConfig {
    return (
      this.localeConfigs.get(language) ||
      this.localeConfigs.get(SupportedLanguage.ENGLISH) ||
      DEFAULT_LOCALE_CONFIG
    );
  }

  formatCurrency(
    amount: number,
    currency: CurrencyFormat,
    language: SupportedLanguage,
  ): string {
    const locale = this.getLocaleString(language);

    try {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
      }).format(amount);
    } catch (error) {
      this.logger.warn(
        `Failed to format currency: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return `${currency} ${amount.toFixed(2)}`;
    }
  }

  formatDate(
    date: Date | number,
    language: SupportedLanguage,
    options?: Intl.DateTimeFormatOptions,
  ): string {
    const locale = this.getLocaleString(language);
    const dateObj = typeof date === 'number' ? new Date(date) : date;

    try {
      return new Intl.DateTimeFormat(locale, options).format(dateObj);
    } catch (error) {
      this.logger.warn(
        `Failed to format date: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return dateObj.toISOString();
    }
  }

  formatNumber(
    number: number,
    language: SupportedLanguage,
    options?: Intl.NumberFormatOptions,
  ): string {
    const locale = this.getLocaleString(language);

    try {
      return new Intl.NumberFormat(locale, options).format(number);
    } catch (error) {
      this.logger.warn(
        `Failed to format number: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return number.toString();
    }
  }

  formatRelativeTime(
    timestamp: number,
    language: SupportedLanguage,
  ): string {
    const locale = this.getLocaleString(language);
    const now = Date.now();
    const diff = timestamp - now;
    const seconds = Math.floor(Math.abs(diff) / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const months = Math.floor(days / 30);
    const years = Math.floor(days / 365);

    try {
      const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

      if (years > 0) {
        return rtf.format(diff > 0 ? years : -years, 'year');
      }
      if (months > 0) {
        return rtf.format(diff > 0 ? months : -months, 'month');
      }
      if (days > 0) {
        return rtf.format(diff > 0 ? days : -days, 'day');
      }
      if (hours > 0) {
        return rtf.format(diff > 0 ? hours : -hours, 'hour');
      }
      if (minutes > 0) {
        return rtf.format(diff > 0 ? minutes : -minutes, 'minute');
      }
      return rtf.format(diff > 0 ? seconds : -seconds, 'second');
    } catch (error) {
      this.logger.warn(
        `Failed to format relative time: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return this.formatDate(timestamp, language);
    }
  }

  formatList(
    items: string[],
    language: SupportedLanguage,
    type: 'conjunction' | 'disjunction' = 'conjunction',
  ): string {
    const locale = this.getLocaleString(language);

    try {
      return new Intl.ListFormat(locale, { type }).format(items);
    } catch (error) {
      this.logger.warn(
        `Failed to format list: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return items.join(', ');
    }
  }

  formatPercentage(
    value: number,
    language: SupportedLanguage,
    decimals: number = 2,
  ): string {
    const locale = this.getLocaleString(language);

    try {
      return new Intl.NumberFormat(locale, {
        style: 'percent',
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }).format(value);
    } catch (error) {
      this.logger.warn(
        `Failed to format percentage: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return `${(value * 100).toFixed(decimals)}%`;
    }
  }

  getTextDirection(language: SupportedLanguage): TextDirection {
    return RTL_LANGUAGES.includes(language)
      ? TextDirection.RTL
      : TextDirection.LTR;
  }

  isRTL(language: SupportedLanguage): boolean {
    return RTL_LANGUAGES.includes(language);
  }

  private getLocaleString(language: SupportedLanguage): string {
    // Map language to appropriate locale string
    const localeMap: Record<SupportedLanguage, string> = {
      [SupportedLanguage.ENGLISH]: 'en-US',
      [SupportedLanguage.SPANISH]: 'es-ES',
      [SupportedLanguage.FRENCH]: 'fr-FR',
      [SupportedLanguage.GERMAN]: 'de-DE',
      [SupportedLanguage.ITALIAN]: 'it-IT',
      [SupportedLanguage.PORTUGUESE]: 'pt-BR',
      [SupportedLanguage.RUSSIAN]: 'ru-RU',
      [SupportedLanguage.CHINESE_SIMPLIFIED]: 'zh-CN',
      [SupportedLanguage.CHINESE_TRADITIONAL]: 'zh-TW',
      [SupportedLanguage.JAPANESE]: 'ja-JP',
      [SupportedLanguage.KOREAN]: 'ko-KR',
      [SupportedLanguage.ARABIC]: 'ar-SA',
      [SupportedLanguage.HEBREW]: 'he-IL',
      [SupportedLanguage.HINDI]: 'hi-IN',
      [SupportedLanguage.TURKISH]: 'tr-TR',
    };

    return localeMap[language] || 'en-US';
  }

  convertTimezone(
    date: Date | number,
    fromTimezone: string,
    toTimezone: string,
  ): Date {
    // Convert date between timezones
    const dateObj = typeof date === 'number' ? new Date(date) : date;

    try {
      // Get time in target timezone
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: toTimezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      });

      const parts = formatter.formatToParts(dateObj);
      const values: Record<string, string> = {};
      parts.forEach((part) => {
        if (part.type !== 'literal') {
          values[part.type] = part.value;
        }
      });

      return new Date(
        `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}:${values.second}`,
      );
    } catch (error) {
      this.logger.warn(
        `Failed to convert timezone: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return dateObj;
    }
  }

  getCountryFromRegion(region: SupportedRegion): string {
    const countryMap: Record<SupportedRegion, string> = {
      [SupportedRegion.US]: 'United States',
      [SupportedRegion.UK]: 'United Kingdom',
      [SupportedRegion.EU]: 'European Union',
      [SupportedRegion.CANADA]: 'Canada',
      [SupportedRegion.AUSTRALIA]: 'Australia',
      [SupportedRegion.BRAZIL]: 'Brazil',
      [SupportedRegion.MEXICO]: 'Mexico',
      [SupportedRegion.RUSSIA]: 'Russia',
      [SupportedRegion.CHINA]: 'China',
      [SupportedRegion.JAPAN]: 'Japan',
      [SupportedRegion.KOREA]: 'South Korea',
      [SupportedRegion.INDIA]: 'India',
      [SupportedRegion.MIDDLE_EAST]: 'Middle East',
    };

    return countryMap[region] || 'Unknown';
  }

  getCurrencySymbol(currency: CurrencyFormat): string {
    const symbolMap: Record<CurrencyFormat, string> = {
      [CurrencyFormat.USD]: '$',
      [CurrencyFormat.EUR]: '€',
      [CurrencyFormat.GBP]: '£',
      [CurrencyFormat.JPY]: '¥',
      [CurrencyFormat.CNY]: '¥',
      [CurrencyFormat.INR]: '₹',
      [CurrencyFormat.BRL]: 'R$',
      [CurrencyFormat.RUB]: '₽',
      [CurrencyFormat.AED]: 'د.إ',
      [CurrencyFormat.CAD]: 'C$',
      [CurrencyFormat.AUD]: 'A$',
    };

    return symbolMap[currency] || currency;
  }

  parseDate(
    dateString: string,
    language: SupportedLanguage,
  ): Date | null {
    const config = this.getLocaleConfig(language);
    const format = config.dateFormat;

    try {
      // Simple date parsing based on format
      // In production, use a library like date-fns or moment
      const date = new Date(dateString);
      return isNaN(date.getTime()) ? null : date;
    } catch (error) {
      this.logger.warn(
        `Failed to parse date: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return null;
    }
  }
}
