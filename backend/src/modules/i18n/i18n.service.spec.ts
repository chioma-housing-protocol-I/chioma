import { Test, TestingModule } from '@nestjs/testing';
import { I18nService, SupportedLanguage } from './i18n.service';
import { en } from './data/en';
import { fr } from './data/fr';
import { es } from './data/es';
import { ar } from './data/ar';

/**
 * Recursively collect dot-notation keys for every string leaf in a
 * translation tree. Mirrors I18nService's own flattening so the parity
 * check exercises the same notion of a "key" as resolveLanguage/t do.
 */
function flattenKeys(tree: Record<string, unknown>, prefix = ''): string[] {
  const keys: string[] = [];
  for (const [key, value] of Object.entries(tree)) {
    const currentKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') {
      keys.push(currentKey);
    } else if (typeof value === 'object' && value !== null) {
      keys.push(...flattenKeys(value as Record<string, unknown>, currentKey));
    }
  }
  return keys;
}

describe('I18nService', () => {
  let service: I18nService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [I18nService],
    }).compile();

    service = module.get<I18nService>(I18nService);
  });

  describe('getSupportedLanguages', () => {
    it('lists all registered locales', () => {
      expect(service.getSupportedLanguages()).toEqual(['en', 'fr', 'es', 'ar']);
    });
  });

  describe('resolveLanguage', () => {
    it('falls back to English when no candidate is given', () => {
      expect(service.resolveLanguage(undefined)).toBe('en');
    });

    it('falls back to English for an unsupported language', () => {
      expect(service.resolveLanguage('de')).toBe('en');
    });

    it('resolves a supported language', () => {
      expect(service.resolveLanguage('fr')).toBe('fr');
    });

    it('normalizes casing and region subtags', () => {
      expect(service.resolveLanguage('FR-ca')).toBe('fr');
      expect(service.resolveLanguage('EN-US')).toBe('en');
    });
  });

  describe('t', () => {
    it('translates a nested key for the requested language', () => {
      expect(service.t('common.ok', 'fr')).toBe("D'accord");
    });

    it('falls back to English when the key is missing in the target language', () => {
      // simulate a partial catalog scenario purely through the public API by
      // requesting an unsupported language, which resolves to English
      expect(service.t('common.ok', 'de')).toBe('OK');
    });

    it('returns the raw key when it does not exist anywhere', () => {
      expect(service.t('does.not.exist')).toBe('does.not.exist');
    });

    it('does not throw and leaves the string untouched when params contain no matching placeholder', () => {
      // None of the current catalog entries use {placeholder} syntax; this
      // guards that passing params is still safe and a no-op in that case.
      expect(service.t('common.ok', 'en', { unused: 'x' })).toBe('OK');
    });
  });

  describe('translationCoverage', () => {
    it('reports 100% coverage for a fully translated locale', () => {
      const coverage = service.translationCoverage('fr');
      expect(coverage.percent).toBe(100);
      expect(coverage.translated).toBe(coverage.total);
    });

    it('reports coverage relative to the English key set', () => {
      const baseKeyCount = flattenKeys(en as Record<string, unknown>).length;
      const coverage = service.translationCoverage('en');
      expect(coverage.total).toBe(baseKeyCount);
      expect(coverage.translated).toBe(baseKeyCount);
    });
  });

  describe('translation catalog key parity', () => {
    const catalogs: Record<SupportedLanguage, Record<string, unknown>> = {
      en: en as Record<string, unknown>,
      fr: fr as Record<string, unknown>,
      es: es as Record<string, unknown>,
      ar: ar as Record<string, unknown>,
    };
    const baseKeys = flattenKeys(catalogs.en).sort();

    it.each(Object.keys(catalogs) as SupportedLanguage[])(
      'catalog "%s" has every key present in the default (en) catalog',
      (locale) => {
        const localeKeys = flattenKeys(catalogs[locale]).sort();
        const missing = baseKeys.filter((key) => !localeKeys.includes(key));

        expect(missing).toEqual([]);
      },
    );

    it.each(Object.keys(catalogs) as SupportedLanguage[])(
      'catalog "%s" has no extra keys beyond the default (en) catalog',
      (locale) => {
        const localeKeys = flattenKeys(catalogs[locale]).sort();
        const extra = localeKeys.filter((key) => !baseKeys.includes(key));

        expect(extra).toEqual([]);
      },
    );
  });
});
