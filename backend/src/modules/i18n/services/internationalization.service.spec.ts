import { Test, TestingModule } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { InternationalizationService } from './internationalization.service';
import { SupportedLanguage } from '../types/i18n.types';

describe('InternationalizationService', () => {
  let service: InternationalizationService;
  let cacheManager: any;

  const mockCacheManager = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InternationalizationService,
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
      ],
    }).compile();

    service = module.get<InternationalizationService>(InternationalizationService);
    cacheManager = module.get(CACHE_MANAGER);
  });

  describe('initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should have default language as English', () => {
      expect(service['defaultLanguage']).toBe(SupportedLanguage.ENGLISH);
    });
  });

  describe('getSupportedLanguages', () => {
    it('should return array of supported languages', () => {
      const languages = service.getSupportedLanguages();
      expect(Array.isArray(languages)).toBe(true);
      expect(languages).toContain(SupportedLanguage.ENGLISH);
      expect(languages).toContain(SupportedLanguage.SPANISH);
      expect(languages.length).toBeGreaterThan(10);
    });
  });

  describe('translate', () => {
    it('should translate a simple key', () => {
      // Mock translation data
      service['translations'].set('en:common', {
        hello: 'Hello',
        goodbye: 'Goodbye',
      });

      const result = service.translate('hello', SupportedLanguage.ENGLISH);
      expect(result).toBe('Hello');
    });

    it('should translate with interpolation', () => {
      service['translations'].set('en:common', {
        greeting: 'Hello, {{name}}!',
      });

      const result = service.translate(
        'greeting',
        SupportedLanguage.ENGLISH,
        'common',
        { name: 'John' },
      );
      expect(result).toBe('Hello, John!');
    });

    it('should fallback to English when translation not found', () => {
      service['translations'].set('en:common', {
        hello: 'Hello',
      });

      const result = service.translate('hello', SupportedLanguage.SPANISH);
      expect(result).toBe('Hello');
    });

    it('should return key when translation not found in any language', () => {
      const result = service.translate('nonexistent.key', SupportedLanguage.ENGLISH);
      expect(result).toBe('nonexistent.key');
    });

    it('should handle nested keys', () => {
      service['translations'].set('en:common', {
        errors: {
          notFound: 'Not found',
        },
      });

      const result = service.translate('errors.notFound', SupportedLanguage.ENGLISH);
      expect(result).toBe('Not found');
    });

    it('should handle multiple interpolations', () => {
      service['translations'].set('en:common', {
        message: 'Hello {{firstName}} {{lastName}}, you have {{count}} messages',
      });

      const result = service.translate(
        'message',
        SupportedLanguage.ENGLISH,
        'common',
        { firstName: 'John', lastName: 'Doe', count: 5 },
      );
      expect(result).toBe('Hello John Doe, you have 5 messages');
    });
  });

  describe('addTranslation', () => {
    it('should add a new translation', async () => {
      const translation = {
        language: SupportedLanguage.ENGLISH,
        namespace: 'common',
        key: 'newKey',
        value: 'New Value',
      };

      await service.addTranslation(translation);

      const result = service.translate('newKey', SupportedLanguage.ENGLISH);
      expect(result).toBe('New Value');
      expect(cacheManager.del).toHaveBeenCalled();
    });

    it('should update existing translation', async () => {
      service['translations'].set('en:common', {
        existingKey: 'Old Value',
      });

      const translation = {
        language: SupportedLanguage.ENGLISH,
        namespace: 'common',
        key: 'existingKey',
        value: 'New Value',
      };

      await service.addTranslation(translation);

      const result = service.translate('existingKey', SupportedLanguage.ENGLISH);
      expect(result).toBe('New Value');
    });
  });

  describe('detectLanguageFromHeader', () => {
    it('should detect language from Accept-Language header', () => {
      const language = service.detectLanguageFromHeader('en-US,en;q=0.9');
      expect(language).toBe(SupportedLanguage.ENGLISH);
    });

    it('should handle multiple language preferences', () => {
      const language = service.detectLanguageFromHeader('fr-FR,fr;q=0.9,en;q=0.8');
      expect(language).toBe(SupportedLanguage.FRENCH);
    });

    it('should return default language for unsupported languages', () => {
      const language = service.detectLanguageFromHeader('xx-XX');
      expect(language).toBe(SupportedLanguage.ENGLISH);
    });

    it('should handle empty header', () => {
      const language = service.detectLanguageFromHeader('');
      expect(language).toBe(SupportedLanguage.ENGLISH);
    });

    it('should handle Chinese variants', () => {
      expect(service.detectLanguageFromHeader('zh-CN')).toBe(SupportedLanguage.CHINESE_SIMPLIFIED);
      expect(service.detectLanguageFromHeader('zh-TW')).toBe(SupportedLanguage.CHINESE_TRADITIONAL);
    });
  });

  describe('getTranslationStats', () => {
    it('should return translation statistics', () => {
      service['translations'].set('en:common', {
        key1: 'value1',
        key2: 'value2',
        key3: 'value3',
      });

      service['translations'].set('es:common', {
        key1: 'valor1',
        key2: 'valor2',
      });

      const stats = service.getTranslationStats(SupportedLanguage.SPANISH);
      expect(stats.totalKeys).toBe(3);
      expect(stats.translatedKeys).toBe(2);
      expect(stats.completeness).toBeCloseTo(66.67, 1);
    });
  });

  describe('getMissingTranslations', () => {
    it('should return missing translation keys', async () => {
      service['translations'].set('en:common', {
        key1: 'value1',
        key2: 'value2',
        key3: 'value3',
      });

      service['translations'].set('es:common', {
        key1: 'valor1',
      });

      const missing = await service.getMissingTranslations(
        SupportedLanguage.SPANISH,
        'common',
      );
      expect(missing).toContain('key2');
      expect(missing).toContain('key3');
      expect(missing).not.toContain('key1');
    });

    it('should return all keys when language has no translations', async () => {
      service['translations'].set('en:common', {
        key1: 'value1',
        key2: 'value2',
      });

      const missing = await service.getMissingTranslations(
        SupportedLanguage.GERMAN,
        'common',
      );
      expect(missing.length).toBe(2);
    });
  });

  describe('importTranslations', () => {
    it('should import translation file', async () => {
      const translationFile = {
        language: SupportedLanguage.SPANISH,
        namespace: 'common',
        translations: {
          hello: 'Hola',
          goodbye: 'Adiós',
        },
      };

      await service.importTranslations(translationFile);

      expect(service.translate('hello', SupportedLanguage.SPANISH)).toBe('Hola');
      expect(service.translate('goodbye', SupportedLanguage.SPANISH)).toBe('Adiós');
      expect(cacheManager.del).toHaveBeenCalled();
    });
  });

  describe('exportTranslations', () => {
    it('should export translations', () => {
      service['translations'].set('en:common', {
        hello: 'Hello',
        goodbye: 'Goodbye',
      });

      const exported = service.exportTranslations(SupportedLanguage.ENGLISH, 'common');

      expect(exported.language).toBe(SupportedLanguage.ENGLISH);
      expect(exported.namespace).toBe('common');
      expect(exported.translations).toEqual({
        hello: 'Hello',
        goodbye: 'Goodbye',
      });
    });

    it('should return empty translations when namespace not found', () => {
      const exported = service.exportTranslations(SupportedLanguage.ENGLISH, 'nonexistent');
      expect(exported.translations).toEqual({});
    });
  });

  describe('clearCache', () => {
    it('should clear cache for specific language and namespace', async () => {
      await service.clearCache(SupportedLanguage.ENGLISH, 'common');
      expect(cacheManager.del).toHaveBeenCalledWith('translations:en:common');
    });

    it('should clear all translations cache', async () => {
      await service.clearCache();
      expect(cacheManager.del).toHaveBeenCalledWith('translations:*');
    });
  });

  describe('getLoadedNamespaces', () => {
    it('should return loaded namespaces', () => {
      service['translations'].set('en:common', {});
      service['translations'].set('en:errors', {});
      service['translations'].set('es:common', {});

      const namespaces = service.getLoadedNamespaces();
      expect(namespaces).toContain('common');
      expect(namespaces).toContain('errors');
      expect(namespaces.length).toBe(2);
    });
  });
});
