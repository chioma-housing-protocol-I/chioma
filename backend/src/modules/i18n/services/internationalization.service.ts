import { Injectable, Logger, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { promises as fs } from 'fs';
import * as path from 'path';
import {
  SupportedLanguage,
  Translation,
  TranslationKey,
  TranslationFile,
  TranslationStats,
  LOCALE_TO_LANGUAGE_MAP,
} from '../types/i18n.types';

@Injectable()
export class InternationalizationService {
  private readonly logger = new Logger(InternationalizationService.name);
  private translations: Map<string, Map<string, string>> = new Map();
  private translationPath: string;
  private loadedNamespaces: Set<string> = new Set();

  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {
    this.translationPath = path.join(__dirname, '../../../locales');
    this.initializeDefaultTranslations();
  }

  private async initializeDefaultTranslations(): Promise<void> {
    try {
      // Load English as default language
      await this.loadTranslations(SupportedLanguage.ENGLISH, 'common');
      this.logger.log('Default translations initialized');
    } catch (error) {
      this.logger.error(
        `Failed to initialize translations: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async loadTranslations(
    language: SupportedLanguage,
    namespace: string = 'common',
  ): Promise<void> {
    const cacheKey = `translations:${language}:${namespace}`;
    const cached = await this.cacheManager.get<Record<string, string>>(
      cacheKey,
    );

    if (cached) {
      const key = `${language}:${namespace}`;
      this.translations.set(key, new Map(Object.entries(cached)));
      this.loadedNamespaces.add(namespace);
      return;
    }

    try {
      const filePath = path.join(
        this.translationPath,
        language,
        `${namespace}.json`,
      );
      const content = await fs.readFile(filePath, 'utf-8');
      const data: TranslationFile = JSON.parse(content);

      const key = `${language}:${namespace}`;
      this.translations.set(key, new Map(Object.entries(data.translations)));
      this.loadedNamespaces.add(namespace);

      // Cache for 1 hour
      await this.cacheManager.set(cacheKey, data.translations, 3600000);

      this.logger.log(
        `Loaded translations for ${language}/${namespace} (${Object.keys(data.translations).length} keys)`,
      );
    } catch (error) {
      this.logger.warn(
        `Failed to load translations for ${language}/${namespace}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );

      // Fall back to English if not loading English
      if (language !== SupportedLanguage.ENGLISH) {
        await this.loadTranslations(SupportedLanguage.ENGLISH, namespace);
      }
    }
  }

  translate(
    key: string,
    language: SupportedLanguage,
    namespace: string = 'common',
    interpolation?: Record<string, any>,
  ): string {
    const translationKey = `${language}:${namespace}`;
    const translations = this.translations.get(translationKey);

    if (!translations) {
      // Try to load translations synchronously from cache or use fallback
      this.logger.warn(
        `Translations not loaded for ${language}/${namespace}, using key as fallback`,
      );
      return this.applyInterpolation(key, interpolation);
    }

    let translation = translations.get(key);

    // Fallback to English if translation not found
    if (!translation && language !== SupportedLanguage.ENGLISH) {
      const englishKey = `${SupportedLanguage.ENGLISH}:${namespace}`;
      const englishTranslations = this.translations.get(englishKey);
      translation = englishTranslations?.get(key);
    }

    // Fallback to key itself if still not found
    if (!translation) {
      this.logger.debug(`Translation not found: ${key} in ${language}/${namespace}`);
      translation = key;
    }

    return this.applyInterpolation(translation, interpolation);
  }

  private applyInterpolation(
    text: string,
    interpolation?: Record<string, any>,
  ): string {
    if (!interpolation) return text;

    return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return interpolation[key]?.toString() || match;
    });
  }

  async addTranslation(translation: Translation): Promise<void> {
    const key = `${translation.language}:${translation.namespace}`;
    
    if (!this.translations.has(key)) {
      this.translations.set(key, new Map());
    }

    const translations = this.translations.get(key)!;
    translations.set(translation.key, translation.value);

    // Update cache
    const cacheKey = `translations:${translation.language}:${translation.namespace}`;
    const allTranslations = Object.fromEntries(translations);
    await this.cacheManager.set(cacheKey, allTranslations, 3600000);

    this.logger.log(
      `Added translation: ${translation.key} for ${translation.language}/${translation.namespace}`,
    );
  }

  async getTranslationStats(
    language: SupportedLanguage,
  ): Promise<TranslationStats> {
    const englishKey = `${SupportedLanguage.ENGLISH}:common`;
    const languageKey = `${language}:common`;

    const englishTranslations = this.translations.get(englishKey);
    const languageTranslations = this.translations.get(languageKey);

    if (!englishTranslations) {
      return {
        language,
        totalKeys: 0,
        translatedKeys: 0,
        missingKeys: 0,
        completeness: 0,
        lastUpdated: Date.now(),
      };
    }

    const totalKeys = englishTranslations.size;
    const translatedKeys = languageTranslations?.size || 0;
    const missingKeys = totalKeys - translatedKeys;
    const completeness = totalKeys > 0 ? (translatedKeys / totalKeys) * 100 : 0;

    return {
      language,
      totalKeys,
      translatedKeys,
      missingKeys,
      completeness: Math.round(completeness * 100) / 100,
      lastUpdated: Date.now(),
    };
  }

  async getAllTranslationStats(): Promise<TranslationStats[]> {
    const stats: TranslationStats[] = [];
    const languages = Object.values(SupportedLanguage);

    for (const language of languages) {
      const stat = await this.getTranslationStats(language);
      stats.push(stat);
    }

    return stats.sort((a, b) => b.completeness - a.completeness);
  }

  detectLanguageFromHeader(acceptLanguage?: string): SupportedLanguage {
    if (!acceptLanguage) {
      return SupportedLanguage.ENGLISH;
    }

    // Parse Accept-Language header
    const languages = acceptLanguage
      .split(',')
      .map((lang) => {
        const [locale, q = '1'] = lang.trim().split(';q=');
        return { locale: locale.trim(), quality: parseFloat(q) };
      })
      .sort((a, b) => b.quality - a.quality);

    // Find first supported language
    for (const { locale } of languages) {
      const normalized = locale.split('-')[0].toLowerCase();
      const fullLocale = locale.toLowerCase();

      if (LOCALE_TO_LANGUAGE_MAP[fullLocale]) {
        return LOCALE_TO_LANGUAGE_MAP[fullLocale];
      }

      if (LOCALE_TO_LANGUAGE_MAP[normalized]) {
        return LOCALE_TO_LANGUAGE_MAP[normalized];
      }
    }

    return SupportedLanguage.ENGLISH;
  }

  async getMissingTranslations(
    language: SupportedLanguage,
    namespace: string = 'common',
  ): Promise<string[]> {
    const englishKey = `${SupportedLanguage.ENGLISH}:${namespace}`;
    const languageKey = `${language}:${namespace}`;

    const englishTranslations = this.translations.get(englishKey);
    const languageTranslations = this.translations.get(languageKey);

    if (!englishTranslations) {
      return [];
    }

    if (!languageTranslations) {
      return Array.from(englishTranslations.keys());
    }

    const missing: string[] = [];
    for (const key of englishTranslations.keys()) {
      if (!languageTranslations.has(key)) {
        missing.push(key);
      }
    }

    return missing;
  }

  async exportTranslations(
    language: SupportedLanguage,
    namespace: string = 'common',
  ): Promise<TranslationFile> {
    const key = `${language}:${namespace}`;
    const translations = this.translations.get(key);

    if (!translations) {
      throw new Error(`No translations found for ${language}/${namespace}`);
    }

    return {
      language,
      namespace,
      translations: Object.fromEntries(translations),
      metadata: {
        version: '1.0.0',
        lastUpdated: Date.now(),
        completeness: (await this.getTranslationStats(language)).completeness,
      },
    };
  }

  async importTranslations(file: TranslationFile): Promise<void> {
    const key = `${file.language}:${file.namespace}`;
    const translations = new Map(Object.entries(file.translations));
    
    this.translations.set(key, translations);
    this.loadedNamespaces.add(file.namespace);

    // Update cache
    const cacheKey = `translations:${file.language}:${file.namespace}`;
    await this.cacheManager.set(cacheKey, file.translations, 3600000);

    this.logger.log(
      `Imported ${Object.keys(file.translations).length} translations for ${file.language}/${file.namespace}`,
    );
  }

  async clearCache(language?: SupportedLanguage, namespace?: string): Promise<void> {
    if (language && namespace) {
      const cacheKey = `translations:${language}:${namespace}`;
      await this.cacheManager.del(cacheKey);
      const key = `${language}:${namespace}`;
      this.translations.delete(key);
    } else {
      // Clear all translation cache
      this.translations.clear();
      this.loadedNamespaces.clear();
      // Note: Would need cache-manager API to delete all keys matching pattern
      this.logger.log('Cleared all translation cache');
    }
  }

  getLoadedNamespaces(): string[] {
    return Array.from(this.loadedNamespaces);
  }

  getSupportedLanguages(): SupportedLanguage[] {
    return Object.values(SupportedLanguage);
  }
}
