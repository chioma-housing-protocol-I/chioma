import { Injectable } from '@nestjs/common';
import { I18nService, SupportedLanguage } from './i18n.service';

@Injectable()
export class LocalizedContentService {
  constructor(private readonly i18n: I18nService) {}

  formatCurrency(amount: number, currency: string, language?: string): string {
    const locale = this.toLocale(language);
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  }

  formatDate(date: Date, language?: string, timezone = 'UTC'): string {
    const locale = this.toLocale(language);
    return new Intl.DateTimeFormat(locale, {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: timezone,
    }).format(date);
  }

  formatNumber(value: number, language?: string): string {
    const locale = this.toLocale(language);
    return new Intl.NumberFormat(locale).format(value);
  }

  isRtl(language?: string): boolean {
    const resolved = this.i18n.resolveLanguage(language);
    return resolved === 'ar';
  }

  private toLocale(language?: string): string {
    const resolved = this.i18n.resolveLanguage(language);
    const localeMap: Record<SupportedLanguage, string> = {
      en: 'en-US',
      fr: 'fr-FR',
      es: 'es-ES',
      ar: 'ar-SA',
    };

    return localeMap[resolved];
  }
}
