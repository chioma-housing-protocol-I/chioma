import { Test, TestingModule } from '@nestjs/testing';
import { LocalizedContentService } from './localized-content.service';
import { I18nService } from './i18n.service';

describe('LocalizedContentService', () => {
  let service: LocalizedContentService;
  let i18nService: I18nService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LocalizedContentService, I18nService],
    }).compile();

    service = module.get<LocalizedContentService>(LocalizedContentService);
    i18nService = module.get<I18nService>(I18nService);
  });

  describe('formatCurrency', () => {
    it('formats USD using the English locale by default', () => {
      const result = service.formatCurrency(1000, 'USD');
      expect(result).toContain('1,000');
      expect(result).toMatch(/\$/);
    });

    it('formats using the locale mapped from the requested language', () => {
      const result = service.formatCurrency(1000, 'EUR', 'fr');
      // fr-FR groups with a non-breaking space; assert on the numeric content
      // rather than exact punctuation to avoid brittleness across ICU data.
      expect(result.replace(/\s/g, '')).toContain('1000');
    });

    it('falls back to English formatting for an unsupported language', () => {
      const result = service.formatCurrency(1000, 'USD', 'de');
      expect(result).toContain('1,000');
    });
  });

  describe('formatDate', () => {
    it('formats a date using the resolved locale and UTC by default', () => {
      const date = new Date('2026-01-15T12:00:00.000Z');
      const result = service.formatDate(date);
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('accepts a custom timezone', () => {
      const date = new Date('2026-01-15T12:00:00.000Z');
      const utc = service.formatDate(date, 'en', 'UTC');
      const other = service.formatDate(date, 'en', 'America/New_York');
      expect(utc).not.toBe(other);
    });
  });

  describe('formatNumber', () => {
    it('formats a number with locale grouping', () => {
      expect(service.formatNumber(1234567)).toBe('1,234,567');
    });
  });

  describe('isRtl', () => {
    it('returns true for Arabic', () => {
      expect(service.isRtl('ar')).toBe(true);
    });

    it('returns false for English', () => {
      expect(service.isRtl('en')).toBe(false);
    });

    it('returns false when no language is given (defaults to English)', () => {
      expect(service.isRtl(undefined)).toBe(false);
    });

    it('returns false for an unsupported language (resolves to English)', () => {
      expect(service.isRtl('xx')).toBe(false);
    });
  });

  describe('locale mapping', () => {
    it('delegates language resolution to I18nService', () => {
      const resolveSpy = jest.spyOn(i18nService, 'resolveLanguage');
      service.formatNumber(1, 'fr');
      expect(resolveSpy).toHaveBeenCalledWith('fr');
    });
  });
});
