import { Test, TestingModule } from '@nestjs/testing';
import { LocalizationService } from './localization.service';
import { SupportedLanguage, CurrencyFormat } from '../types/i18n.types';

describe('LocalizationService', () => {
  let service: LocalizationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LocalizationService],
    }).compile();

    service = module.get<LocalizationService>(LocalizationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('formatCurrency', () => {
    it('should format USD currency in English', () => {
      const result = service.formatCurrency(1234.56, CurrencyFormat.USD, SupportedLanguage.ENGLISH);
      expect(result).toBe('$1,234.56');
    });

    it('should format EUR currency in French', () => {
      const result = service.formatCurrency(
        1234.56,
        CurrencyFormat.EUR,
        SupportedLanguage.FRENCH,
      );
      expect(result).toContain('1');
      expect(result).toContain('234');
      expect(result).toContain('56');
    });

    it('should format GBP currency in English', () => {
      const result = service.formatCurrency(1234.56, CurrencyFormat.GBP, SupportedLanguage.ENGLISH);
      expect(result).toBe('£1,234.56');
    });

    it('should format JPY currency (no decimals)', () => {
      const result = service.formatCurrency(1234, CurrencyFormat.JPY, SupportedLanguage.JAPANESE);
      expect(result).toContain('1,234');
      expect(result).not.toContain('.00');
    });

    it('should handle zero amount', () => {
      const result = service.formatCurrency(0, CurrencyFormat.USD, SupportedLanguage.ENGLISH);
      expect(result).toBe('$0.00');
    });

    it('should handle negative amounts', () => {
      const result = service.formatCurrency(-100, CurrencyFormat.USD, SupportedLanguage.ENGLISH);
      expect(result).toContain('-');
      expect(result).toContain('100');
    });
  });

  describe('formatDate', () => {
    const testDate = new Date('2024-01-15T10:30:00Z').getTime();

    it('should format date in English', () => {
      const result = service.formatDate(testDate, SupportedLanguage.ENGLISH);
      expect(result).toContain('2024');
      expect(result).toContain('Jan');
    });

    it('should format date in Spanish', () => {
      const result = service.formatDate(testDate, SupportedLanguage.SPANISH);
      expect(result).toContain('2024');
    });

    it('should handle short format', () => {
      const result = service.formatDate(testDate, SupportedLanguage.ENGLISH, 'short');
      expect(result).toContain('1/15');
    });

    it('should handle long format', () => {
      const result = service.formatDate(testDate, SupportedLanguage.ENGLISH, 'long');
      expect(result).toContain('January');
      expect(result).toContain('2024');
    });

    it('should handle current date', () => {
      const now = Date.now();
      const result = service.formatDate(now, SupportedLanguage.ENGLISH);
      expect(result).toBeTruthy();
    });
  });

  describe('formatNumber', () => {
    it('should format number in English', () => {
      const result = service.formatNumber(1234567.89, SupportedLanguage.ENGLISH);
      expect(result).toBe('1,234,567.89');
    });

    it('should format number in German', () => {
      const result = service.formatNumber(1234567.89, SupportedLanguage.GERMAN);
      expect(result).toContain('1');
      expect(result).toContain('234');
      expect(result).toContain('567');
    });

    it('should handle integers', () => {
      const result = service.formatNumber(1000, SupportedLanguage.ENGLISH);
      expect(result).toBe('1,000');
    });

    it('should handle zero', () => {
      const result = service.formatNumber(0, SupportedLanguage.ENGLISH);
      expect(result).toBe('0');
    });

    it('should handle negative numbers', () => {
      const result = service.formatNumber(-1234.56, SupportedLanguage.ENGLISH);
      expect(result).toContain('-1,234.56');
    });

    it('should respect decimal places', () => {
      const result = service.formatNumber(1234.56789, SupportedLanguage.ENGLISH, 2);
      expect(result).toBe('1,234.57');
    });
  });

  describe('formatRelativeTime', () => {
    const now = Date.now();

    it('should format seconds ago', () => {
      const timestamp = now - 30 * 1000;
      const result = service.formatRelativeTime(timestamp, SupportedLanguage.ENGLISH);
      expect(result).toContain('30');
      expect(result.toLowerCase()).toContain('second');
    });

    it('should format minutes ago', () => {
      const timestamp = now - 5 * 60 * 1000;
      const result = service.formatRelativeTime(timestamp, SupportedLanguage.ENGLISH);
      expect(result).toContain('5');
      expect(result.toLowerCase()).toContain('minute');
    });

    it('should format hours ago', () => {
      const timestamp = now - 3 * 60 * 60 * 1000;
      const result = service.formatRelativeTime(timestamp, SupportedLanguage.ENGLISH);
      expect(result).toContain('3');
      expect(result.toLowerCase()).toContain('hour');
    });

    it('should format days ago', () => {
      const timestamp = now - 2 * 24 * 60 * 60 * 1000;
      const result = service.formatRelativeTime(timestamp, SupportedLanguage.ENGLISH);
      expect(result).toContain('2');
      expect(result.toLowerCase()).toContain('day');
    });

    it('should format future time', () => {
      const timestamp = now + 2 * 60 * 60 * 1000;
      const result = service.formatRelativeTime(timestamp, SupportedLanguage.ENGLISH);
      expect(result).toContain('2');
      expect(result.toLowerCase()).toContain('hour');
    });
  });

  describe('formatList', () => {
    it('should format list with "and" conjunction', () => {
      const items = ['Apple', 'Banana', 'Orange'];
      const result = service.formatList(items, SupportedLanguage.ENGLISH, 'conjunction');
      expect(result).toBe('Apple, Banana, and Orange');
    });

    it('should format list with "or" disjunction', () => {
      const items = ['Red', 'Blue', 'Green'];
      const result = service.formatList(items, SupportedLanguage.ENGLISH, 'disjunction');
      expect(result).toBe('Red, Blue, or Green');
    });

    it('should handle two items', () => {
      const items = ['First', 'Second'];
      const result = service.formatList(items, SupportedLanguage.ENGLISH);
      expect(result).toBe('First and Second');
    });

    it('should handle single item', () => {
      const items = ['Only'];
      const result = service.formatList(items, SupportedLanguage.ENGLISH);
      expect(result).toBe('Only');
    });

    it('should handle empty array', () => {
      const result = service.formatList([], SupportedLanguage.ENGLISH);
      expect(result).toBe('');
    });
  });

  describe('formatPercentage', () => {
    it('should format percentage', () => {
      const result = service.formatPercentage(0.1234, SupportedLanguage.ENGLISH);
      expect(result).toBe('12.34%');
    });

    it('should handle whole percentages', () => {
      const result = service.formatPercentage(0.5, SupportedLanguage.ENGLISH);
      expect(result).toContain('50');
    });

    it('should handle custom decimal places', () => {
      const result = service.formatPercentage(0.123456, SupportedLanguage.ENGLISH, 1);
      expect(result).toBe('12.3%');
    });

    it('should handle zero', () => {
      const result = service.formatPercentage(0, SupportedLanguage.ENGLISH);
      expect(result).toContain('0');
    });
  });

  describe('isRTL', () => {
    it('should return true for Arabic', () => {
      expect(service.isRTL(SupportedLanguage.ARABIC)).toBe(true);
    });

    it('should return true for Hebrew', () => {
      expect(service.isRTL(SupportedLanguage.HEBREW)).toBe(true);
    });

    it('should return false for English', () => {
      expect(service.isRTL(SupportedLanguage.ENGLISH)).toBe(false);
    });

    it('should return false for Spanish', () => {
      expect(service.isRTL(SupportedLanguage.SPANISH)).toBe(false);
    });
  });

  describe('getTextDirection', () => {
    it('should return rtl for Arabic', () => {
      expect(service.getTextDirection(SupportedLanguage.ARABIC)).toBe('rtl');
    });

    it('should return rtl for Hebrew', () => {
      expect(service.getTextDirection(SupportedLanguage.HEBREW)).toBe('rtl');
    });

    it('should return ltr for English', () => {
      expect(service.getTextDirection(SupportedLanguage.ENGLISH)).toBe('ltr');
    });
  });

  describe('getCurrencySymbol', () => {
    it('should return correct symbol for USD', () => {
      expect(service.getCurrencySymbol(CurrencyFormat.USD)).toBe('$');
    });

    it('should return correct symbol for EUR', () => {
      expect(service.getCurrencySymbol(CurrencyFormat.EUR)).toBe('€');
    });

    it('should return correct symbol for GBP', () => {
      expect(service.getCurrencySymbol(CurrencyFormat.GBP)).toBe('£');
    });

    it('should return correct symbol for JPY', () => {
      expect(service.getCurrencySymbol(CurrencyFormat.JPY)).toBe('¥');
    });
  });

  describe('convertTimezone', () => {
    const testDate = new Date('2024-01-15T12:00:00Z');

    it('should convert to different timezone', () => {
      const result = service.convertTimezone(testDate, 'America/New_York');
      expect(result).toBeTruthy();
      expect(result).toContain('2024');
    });

    it('should handle UTC timezone', () => {
      const result = service.convertTimezone(testDate, 'UTC');
      expect(result).toContain('12:00');
    });

    it('should handle Asian timezone', () => {
      const result = service.convertTimezone(testDate, 'Asia/Tokyo');
      expect(result).toBeTruthy();
    });
  });

  describe('getLocaleConfig', () => {
    it('should return config for English', () => {
      const config = service.getLocaleConfig(SupportedLanguage.ENGLISH);
      expect(config.language).toBe(SupportedLanguage.ENGLISH);
      expect(config.locale).toBe('en-US');
      expect(config.direction).toBe('ltr');
      expect(config.currency).toBe(CurrencyFormat.USD);
    });

    it('should return config for Arabic', () => {
      const config = service.getLocaleConfig(SupportedLanguage.ARABIC);
      expect(config.direction).toBe('rtl');
      expect(config.currency).toBe(CurrencyFormat.SAR);
    });

    it('should return config with fallback for unsupported locale', () => {
      const config = service.getLocaleConfig(SupportedLanguage.TURKISH);
      expect(config.language).toBe(SupportedLanguage.TURKISH);
      expect(config.direction).toBe('ltr');
    });
  });
});
