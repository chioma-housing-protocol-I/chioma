import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { InternationalizationService } from '../services/internationalization.service';
import { LocalizationService } from '../services/localization.service';
import {
  SupportedLanguage,
  SupportedRegion,
  I18nContext,
  CurrencyFormat,
} from '../types/i18n.types';

export interface I18nRequest extends Request {
  i18n?: I18nContext;
}

@Injectable()
export class LocalizationMiddleware implements NestMiddleware {
  constructor(
    private i18nService: InternationalizationService,
    private localizationService: LocalizationService,
  ) {}

  use(req: I18nRequest, res: Response, next: NextFunction) {
    // Get language from various sources (priority order)
    const language = this.detectLanguage(req);
    const region = this.detectRegion(req);
    const timezone = this.detectTimezone(req);
    const currency = this.detectCurrency(req, region);
    
    const localeConfig = this.localizationService.getLocaleConfig(language);
    const direction = this.localizationService.getTextDirection(language);

    // Attach i18n context to request
    req.i18n = {
      language,
      region,
      timezone,
      locale: `${language}-${region}`,
      direction,
      currency,
    };

    // Set response headers for content language
    res.setHeader('Content-Language', language);
    res.setHeader('X-Text-Direction', direction);

    next();
  }

  private detectLanguage(req: Request): SupportedLanguage {
    // Priority: query param > cookie > header > default
    
    // 1. Check query parameter
    const queryLang = req.query.lang as string;
    if (queryLang && this.isValidLanguage(queryLang)) {
      return queryLang as SupportedLanguage;
    }

    // 2. Check cookie
    const cookieLang = req.cookies?.language;
    if (cookieLang && this.isValidLanguage(cookieLang)) {
      return cookieLang as SupportedLanguage;
    }

    // 3. Check custom header
    const headerLang = req.headers['x-language'] as string;
    if (headerLang && this.isValidLanguage(headerLang)) {
      return headerLang as SupportedLanguage;
    }

    // 4. Check Accept-Language header
    const acceptLanguage = req.headers['accept-language'];
    if (acceptLanguage) {
      const detected = this.i18nService.detectLanguageFromHeader(acceptLanguage);
      if (detected) {
        return detected;
      }
    }

    // 5. Default to English
    return SupportedLanguage.ENGLISH;
  }

  private detectRegion(req: Request): SupportedRegion {
    // Check custom header or cookie
    const headerRegion = req.headers['x-region'] as string;
    if (headerRegion && this.isValidRegion(headerRegion)) {
      return headerRegion as SupportedRegion;
    }

    const cookieRegion = req.cookies?.region;
    if (cookieRegion && this.isValidRegion(cookieRegion)) {
      return cookieRegion as SupportedRegion;
    }

    // Default to US
    return SupportedRegion.US;
  }

  private detectTimezone(req: Request): string {
    // Check custom header or cookie
    const headerTimezone = req.headers['x-timezone'] as string;
    if (headerTimezone) {
      return headerTimezone;
    }

    const cookieTimezone = req.cookies?.timezone;
    if (cookieTimezone) {
      return cookieTimezone;
    }

    // Default to UTC
    return 'UTC';
  }

  private detectCurrency(req: Request, region: SupportedRegion): CurrencyFormat {
    // Check custom header or cookie
    const headerCurrency = req.headers['x-currency'] as string;
    if (headerCurrency && this.isValidCurrency(headerCurrency)) {
      return headerCurrency as CurrencyFormat;
    }

    const cookieCurrency = req.cookies?.currency;
    if (cookieCurrency && this.isValidCurrency(cookieCurrency)) {
      return cookieCurrency as CurrencyFormat;
    }

    // Determine currency from region
    const regionToCurrency: Partial<Record<SupportedRegion, CurrencyFormat>> = {
      [SupportedRegion.US]: CurrencyFormat.USD,
      [SupportedRegion.UK]: CurrencyFormat.GBP,
      [SupportedRegion.EU]: CurrencyFormat.EUR,
      [SupportedRegion.JAPAN]: CurrencyFormat.JPY,
      [SupportedRegion.CHINA]: CurrencyFormat.CNY,
      [SupportedRegion.INDIA]: CurrencyFormat.INR,
      [SupportedRegion.BRAZIL]: CurrencyFormat.BRL,
      [SupportedRegion.RUSSIA]: CurrencyFormat.RUB,
      [SupportedRegion.MIDDLE_EAST]: CurrencyFormat.AED,
      [SupportedRegion.CANADA]: CurrencyFormat.CAD,
      [SupportedRegion.AUSTRALIA]: CurrencyFormat.AUD,
    };

    return regionToCurrency[region] || CurrencyFormat.USD;
  }

  private isValidLanguage(lang: string): boolean {
    return Object.values(SupportedLanguage).includes(lang as SupportedLanguage);
  }

  private isValidRegion(region: string): boolean {
    return Object.values(SupportedRegion).includes(region as SupportedRegion);
  }

  private isValidCurrency(currency: string): boolean {
    return Object.values(CurrencyFormat).includes(currency as CurrencyFormat);
  }
}
