import { Test, TestingModule } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { LocalizedContentService } from './localized-content.service';
import { SupportedLanguage } from '../types/i18n.types';

describe('LocalizedContentService', () => {
  let service: LocalizedContentService;
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
        LocalizedContentService,
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
      ],
    }).compile();

    service = module.get<LocalizedContentService>(LocalizedContentService);
    cacheManager = module.get(CACHE_MANAGER);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createContent', () => {
    it('should create localized content', async () => {
      const content = {
        contentId: 'test-content',
        defaultLanguage: SupportedLanguage.ENGLISH,
        translations: {
          [SupportedLanguage.ENGLISH]: 'Hello World',
          [SupportedLanguage.SPANISH]: 'Hola Mundo',
        },
        metadata: {
          category: 'greeting',
          tags: ['test'],
        },
      };

      await service.createContent(content);
      expect(cacheManager.set).toHaveBeenCalled();
    });

    it('should throw error if content already exists', async () => {
      const content = {
        contentId: 'duplicate-content',
        defaultLanguage: SupportedLanguage.ENGLISH,
        translations: {
          [SupportedLanguage.ENGLISH]: 'Test',
        },
      };

      await service.createContent(content);

      await expect(service.createContent(content)).rejects.toThrow(
        'Content with ID duplicate-content already exists',
      );
    });

    it('should throw error if no translations provided', async () => {
      const content = {
        contentId: 'no-translations',
        defaultLanguage: SupportedLanguage.ENGLISH,
        translations: {},
      };

      await expect(service.createContent(content)).rejects.toThrow(
        'At least one translation must be provided',
      );
    });
  });

  describe('getContent', () => {
    beforeEach(async () => {
      const content = {
        contentId: 'test-content',
        defaultLanguage: SupportedLanguage.ENGLISH,
        translations: {
          [SupportedLanguage.ENGLISH]: 'Hello',
          [SupportedLanguage.SPANISH]: 'Hola',
        },
      };
      await service.createContent(content);
    });

    it('should get content in requested language', async () => {
      const result = await service.getContent('test-content', SupportedLanguage.SPANISH);
      expect(result).toBe('Hola');
    });

    it('should fallback to default language', async () => {
      const result = await service.getContent('test-content', SupportedLanguage.FRENCH);
      expect(result).toBe('Hello');
    });

    it('should fallback to English if default language not available', async () => {
      const content = {
        contentId: 'fallback-test',
        defaultLanguage: SupportedLanguage.SPANISH,
        translations: {
          [SupportedLanguage.ENGLISH]: 'English Text',
        },
      };
      await service.createContent(content);

      const result = await service.getContent('fallback-test', SupportedLanguage.GERMAN);
      expect(result).toBe('English Text');
    });

    it('should throw error if content not found', async () => {
      await expect(
        service.getContent('nonexistent', SupportedLanguage.ENGLISH),
      ).rejects.toThrow('Content with ID nonexistent not found');
    });

    it('should cache content retrieval', async () => {
      await service.getContent('test-content', SupportedLanguage.SPANISH);
      expect(cacheManager.set).toHaveBeenCalled();
    });
  });

  describe('updateContent', () => {
    beforeEach(async () => {
      const content = {
        contentId: 'update-test',
        defaultLanguage: SupportedLanguage.ENGLISH,
        translations: {
          [SupportedLanguage.ENGLISH]: 'Original',
        },
      };
      await service.createContent(content);
    });

    it('should update content translation', async () => {
      await service.updateContent(
        'update-test',
        SupportedLanguage.ENGLISH,
        'Updated Text',
      );

      const result = await service.getContent('update-test', SupportedLanguage.ENGLISH);
      expect(result).toBe('Updated Text');
    });

    it('should add new translation', async () => {
      await service.updateContent('update-test', SupportedLanguage.SPANISH, 'Texto en Español');

      const result = await service.getContent('update-test', SupportedLanguage.SPANISH);
      expect(result).toBe('Texto en Español');
    });

    it('should throw error if content not found', async () => {
      await expect(
        service.updateContent('nonexistent', SupportedLanguage.ENGLISH, 'Test'),
      ).rejects.toThrow('Content with ID nonexistent not found');
    });

    it('should clear cache after update', async () => {
      await service.updateContent('update-test', SupportedLanguage.ENGLISH, 'New');
      expect(cacheManager.del).toHaveBeenCalled();
    });
  });

  describe('deleteContent', () => {
    beforeEach(async () => {
      const content = {
        contentId: 'delete-test',
        defaultLanguage: SupportedLanguage.ENGLISH,
        translations: {
          [SupportedLanguage.ENGLISH]: 'To Delete',
        },
      };
      await service.createContent(content);
    });

    it('should delete content', async () => {
      await service.deleteContent('delete-test');
      await expect(
        service.getContent('delete-test', SupportedLanguage.ENGLISH),
      ).rejects.toThrow();
    });

    it('should throw error if content not found', async () => {
      await expect(service.deleteContent('nonexistent')).rejects.toThrow(
        'Content with ID nonexistent not found',
      );
    });

    it('should clear cache after deletion', async () => {
      await service.deleteContent('delete-test');
      expect(cacheManager.del).toHaveBeenCalled();
    });
  });

  describe('searchContent', () => {
    beforeEach(async () => {
      await service.createContent({
        contentId: 'search-1',
        defaultLanguage: SupportedLanguage.ENGLISH,
        translations: {
          [SupportedLanguage.ENGLISH]: 'Hello World',
        },
        metadata: {
          category: 'greeting',
          tags: ['test', 'hello'],
        },
      });

      await service.createContent({
        contentId: 'search-2',
        defaultLanguage: SupportedLanguage.ENGLISH,
        translations: {
          [SupportedLanguage.ENGLISH]: 'Goodbye Friend',
        },
        metadata: {
          category: 'farewell',
          tags: ['test'],
        },
      });
    });

    it('should search by text', async () => {
      const results = await service.searchContent(
        SupportedLanguage.ENGLISH,
        'Hello',
      );
      expect(results.length).toBe(1);
      expect(results[0].contentId).toBe('search-1');
    });

    it('should search by category', async () => {
      const results = await service.searchContent(
        SupportedLanguage.ENGLISH,
        undefined,
        'greeting',
      );
      expect(results.length).toBe(1);
      expect(results[0].metadata?.category).toBe('greeting');
    });

    it('should search by tag', async () => {
      const results = await service.searchContent(
        SupportedLanguage.ENGLISH,
        undefined,
        undefined,
        'hello',
      );
      expect(results.length).toBe(1);
      expect(results[0].metadata?.tags).toContain('hello');
    });

    it('should return all content when no filters', async () => {
      const results = await service.searchContent(SupportedLanguage.ENGLISH);
      expect(results.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('getAvailableLanguages', () => {
    beforeEach(async () => {
      await service.createContent({
        contentId: 'multi-lang',
        defaultLanguage: SupportedLanguage.ENGLISH,
        translations: {
          [SupportedLanguage.ENGLISH]: 'English',
          [SupportedLanguage.SPANISH]: 'Español',
          [SupportedLanguage.FRENCH]: 'Français',
        },
      });
    });

    it('should return available languages', async () => {
      const languages = await service.getAvailableLanguages('multi-lang');
      expect(languages).toContain(SupportedLanguage.ENGLISH);
      expect(languages).toContain(SupportedLanguage.SPANISH);
      expect(languages).toContain(SupportedLanguage.FRENCH);
      expect(languages.length).toBe(3);
    });

    it('should throw error if content not found', async () => {
      await expect(service.getAvailableLanguages('nonexistent')).rejects.toThrow();
    });
  });

  describe('getMissingTranslations', () => {
    beforeEach(async () => {
      await service.createContent({
        contentId: 'partial-translations',
        defaultLanguage: SupportedLanguage.ENGLISH,
        translations: {
          [SupportedLanguage.ENGLISH]: 'English',
          [SupportedLanguage.SPANISH]: 'Español',
        },
      });
    });

    it('should return missing translation languages', async () => {
      const missing = await service.getMissingTranslations('partial-translations');
      expect(missing.length).toBeGreaterThan(0);
      expect(missing).not.toContain(SupportedLanguage.ENGLISH);
      expect(missing).not.toContain(SupportedLanguage.SPANISH);
    });
  });

  describe('validateContent', () => {
    it('should validate content with all required translations', async () => {
      await service.createContent({
        contentId: 'valid-content',
        defaultLanguage: SupportedLanguage.ENGLISH,
        translations: {
          [SupportedLanguage.ENGLISH]: 'English',
        },
      });

      const validation = await service.validateContent('valid-content');
      expect(validation.isValid).toBe(true);
      expect(validation.hasDefaultLanguage).toBe(true);
      expect(validation.hasEnglish).toBe(true);
    });

    it('should detect missing default language', async () => {
      await service.createContent({
        contentId: 'no-default',
        defaultLanguage: SupportedLanguage.SPANISH,
        translations: {
          [SupportedLanguage.ENGLISH]: 'English',
        },
      });

      const validation = await service.validateContent('no-default');
      expect(validation.hasDefaultLanguage).toBe(false);
    });
  });

  describe('bulkImportContent', () => {
    it('should import multiple contents', async () => {
      const contents = [
        {
          contentId: 'bulk-1',
          defaultLanguage: SupportedLanguage.ENGLISH,
          translations: { [SupportedLanguage.ENGLISH]: 'Content 1' },
        },
        {
          contentId: 'bulk-2',
          defaultLanguage: SupportedLanguage.ENGLISH,
          translations: { [SupportedLanguage.ENGLISH]: 'Content 2' },
        },
      ];

      const result = await service.bulkImportContent(contents);
      expect(result.successful).toBe(2);
      expect(result.failed).toBe(0);
    });

    it('should handle partial failures', async () => {
      await service.createContent({
        contentId: 'existing',
        defaultLanguage: SupportedLanguage.ENGLISH,
        translations: { [SupportedLanguage.ENGLISH]: 'Exists' },
      });

      const contents = [
        {
          contentId: 'existing',
          defaultLanguage: SupportedLanguage.ENGLISH,
          translations: { [SupportedLanguage.ENGLISH]: 'Duplicate' },
        },
        {
          contentId: 'new-content',
          defaultLanguage: SupportedLanguage.ENGLISH,
          translations: { [SupportedLanguage.ENGLISH]: 'New' },
        },
      ];

      const result = await service.bulkImportContent(contents);
      expect(result.successful).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.errors.length).toBe(1);
    });
  });

  describe('exportContent', () => {
    beforeEach(async () => {
      await service.createContent({
        contentId: 'export-1',
        defaultLanguage: SupportedLanguage.ENGLISH,
        translations: { [SupportedLanguage.ENGLISH]: 'Export Test 1' },
      });

      await service.createContent({
        contentId: 'export-2',
        defaultLanguage: SupportedLanguage.ENGLISH,
        translations: { [SupportedLanguage.ENGLISH]: 'Export Test 2' },
      });
    });

    it('should export all content', async () => {
      const exported = await service.exportContent();
      expect(exported.length).toBeGreaterThanOrEqual(2);
    });

    it('should export specific content IDs', async () => {
      const exported = await service.exportContent(['export-1']);
      expect(exported.length).toBe(1);
      expect(exported[0].contentId).toBe('export-1');
    });
  });
});
