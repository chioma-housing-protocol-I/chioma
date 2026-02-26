import { Injectable, Logger, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import {
  SupportedLanguage,
  LocalizedContent,
} from '../types/i18n.types';
import { InternationalizationService } from './internationalization.service';

@Injectable()
export class LocalizedContentService {
  private readonly logger = new Logger(LocalizedContentService.name);
  private contentStore: Map<string, LocalizedContent> = new Map();

  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private i18nService: InternationalizationService,
  ) {}

  async createContent(content: LocalizedContent): Promise<void> {
    this.contentStore.set(content.contentId, content);

    // Cache content
    const cacheKey = `content:${content.contentId}`;
    await this.cacheManager.set(cacheKey, content, 3600000);

    this.logger.log(`Created localized content: ${content.contentId}`);
  }

  async getContent(
    contentId: string,
    language: SupportedLanguage,
  ): Promise<string | null> {
    // Try cache first
    const cacheKey = `content:${contentId}:${language}`;
    const cached = await this.cacheManager.get<string>(cacheKey);

    if (cached) {
      return cached;
    }

    // Get from store
    const content = this.contentStore.get(contentId);

    if (!content) {
      this.logger.warn(`Content not found: ${contentId}`);
      return null;
    }

    // Get translation for requested language
    let translation = content.translations.get(language);

    // Fallback to default language
    if (!translation) {
      translation = content.translations.get(content.defaultLanguage);
    }

    // Fallback to English
    if (!translation) {
      translation = content.translations.get(SupportedLanguage.ENGLISH);
    }

    if (translation) {
      // Cache the result
      await this.cacheManager.set(cacheKey, translation, 3600000);
    }

    return translation || null;
  }

  async updateContent(
    contentId: string,
    language: SupportedLanguage,
    text: string,
  ): Promise<void> {
    const content = this.contentStore.get(contentId);

    if (!content) {
      throw new Error(`Content not found: ${contentId}`);
    }

    content.translations.set(language, text);

    if (content.metadata) {
      content.metadata.updatedAt = Date.now();
    }

    // Update store
    this.contentStore.set(contentId, content);

    // Invalidate cache
    const cacheKey = `content:${contentId}:${language}`;
    await this.cacheManager.del(cacheKey);

    this.logger.log(`Updated content ${contentId} for ${language}`);
  }

  async deleteContent(contentId: string): Promise<void> {
    const content = this.contentStore.get(contentId);

    if (!content) {
      return;
    }

    // Remove from store
    this.contentStore.delete(contentId);

    // Invalidate all language caches for this content
    for (const language of content.translations.keys()) {
      const cacheKey = `content:${contentId}:${language}`;
      await this.cacheManager.del(cacheKey);
    }

    this.logger.log(`Deleted content: ${contentId}`);
  }

  async getContentWithFallback(
    contentId: string,
    language: SupportedLanguage,
    fallbackKey?: string,
  ): Promise<string> {
    const content = await this.getContent(contentId, language);

    if (content) {
      return content;
    }

    // Use translation key as fallback
    if (fallbackKey) {
      return this.i18nService.translate(fallbackKey, language);
    }

    return contentId;
  }

  async getAllContent(contentId: string): Promise<Map<SupportedLanguage, string> | null> {
    const content = this.contentStore.get(contentId);
    return content ? content.translations : null;
  }

  async getContentMetadata(contentId: string): Promise<LocalizedContent['metadata'] | null> {
    const content = this.contentStore.get(contentId);
    return content?.metadata || null;
  }

  async searchContent(query: string, language: SupportedLanguage): Promise<string[]> {
    const results: string[] = [];

    for (const [contentId, content] of this.contentStore.entries()) {
      const text = content.translations.get(language);

      if (text && text.toLowerCase().includes(query.toLowerCase())) {
        results.push(contentId);
      }
    }

    return results;
  }

  async getContentByCategory(category: string): Promise<string[]> {
    const results: string[] = [];

    for (const [contentId, content] of this.contentStore.entries()) {
      if (content.metadata?.category === category) {
        results.push(contentId);
      }
    }

    return results;
  }

  async getContentByTags(tags: string[]): Promise<string[]> {
    const results: string[] = [];

    for (const [contentId, content] of this.contentStore.entries()) {
      const contentTags = content.metadata?.tags || [];
      const hasTag = tags.some((tag) => contentTags.includes(tag));

      if (hasTag) {
        results.push(contentId);
      }
    }

    return results;
  }

  async getAvailableLanguages(contentId: string): Promise<SupportedLanguage[]> {
    const content = this.contentStore.get(contentId);

    if (!content) {
      return [];
    }

    return Array.from(content.translations.keys());
  }

  async getMissingTranslations(contentId: string): Promise<SupportedLanguage[]> {
    const content = this.contentStore.get(contentId);

    if (!content) {
      return [];
    }

    const allLanguages = Object.values(SupportedLanguage);
    const availableLanguages = Array.from(content.translations.keys());

    return allLanguages.filter(
      (lang) => !availableLanguages.includes(lang),
    );
  }

  async validateContent(contentId: string): Promise<{
    valid: boolean;
    issues: string[];
  }> {
    const content = this.contentStore.get(contentId);

    if (!content) {
      return {
        valid: false,
        issues: ['Content not found'],
      };
    }

    const issues: string[] = [];

    // Check if default language translation exists
    if (!content.translations.has(content.defaultLanguage)) {
      issues.push(`Missing default language translation: ${content.defaultLanguage}`);
    }

    // Check if English translation exists (as fallback)
    if (!content.translations.has(SupportedLanguage.ENGLISH)) {
      issues.push('Missing English translation (required as fallback)');
    }

    // Check for empty translations
    for (const [language, text] of content.translations.entries()) {
      if (!text || text.trim().length === 0) {
        issues.push(`Empty translation for ${language}`);
      }
    }

    return {
      valid: issues.length === 0,
      issues,
    };
  }

  getContentCount(): number {
    return this.contentStore.size;
  }

  async bulkImportContent(contents: LocalizedContent[]): Promise<{
    imported: number;
    failed: number;
    errors: string[];
  }> {
    let imported = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const content of contents) {
      try {
        await this.createContent(content);
        imported++;
      } catch (error) {
        failed++;
        errors.push(
          `Failed to import ${content.contentId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
    }

    this.logger.log(
      `Bulk import completed: ${imported} imported, ${failed} failed`,
    );

    return { imported, failed, errors };
  }

  async exportContent(contentIds?: string[]): Promise<LocalizedContent[]> {
    const contents: LocalizedContent[] = [];

    if (contentIds && contentIds.length > 0) {
      for (const id of contentIds) {
        const content = this.contentStore.get(id);
        if (content) {
          contents.push(content);
        }
      }
    } else {
      // Export all content
      contents.push(...Array.from(this.contentStore.values()));
    }

    return contents;
  }
}
