import { Injectable } from '@nestjs/common';
import { en } from './data/en';
import { fr } from './data/fr';
import { es } from './data/es';
import { ar } from './data/ar';

export type SupportedLanguage = 'en' | 'fr' | 'es' | 'ar';

type TranslationTree = Record<string, unknown>;

@Injectable()
export class I18nService {
  private readonly defaultLanguage: SupportedLanguage = 'en';

  private readonly translations: Record<SupportedLanguage, TranslationTree> = {
    en,
    fr,
    es,
    ar,
  };

  getSupportedLanguages(): SupportedLanguage[] {
    return Object.keys(this.translations) as SupportedLanguage[];
  }

  resolveLanguage(candidate?: string): SupportedLanguage {
    if (!candidate) {
      return this.defaultLanguage;
    }

    const normalized = candidate
      .toLowerCase()
      .split('-')[0] as SupportedLanguage;
    if (this.getSupportedLanguages().includes(normalized)) {
      return normalized;
    }

    return this.defaultLanguage;
  }

  t(
    key: string,
    language?: string,
    params?: Record<string, string | number>,
  ): string {
    const lang = this.resolveLanguage(language);
    const value =
      this.getNested(this.translations[lang], key) ??
      this.getNested(this.translations.en, key);
    if (!value || typeof value !== 'string') {
      return key;
    }

    if (!params) {
      return value;
    }

    return Object.entries(params).reduce((result, [paramKey, paramValue]) => {
      return result.replace(
        new RegExp(`\\{${paramKey}\\}`, 'g'),
        String(paramValue),
      );
    }, value);
  }

  translationCoverage(language: SupportedLanguage): {
    total: number;
    translated: number;
    percent: number;
  } {
    const baseKeys = this.flattenKeys(this.translations.en);
    const targetKeys = new Set(this.flattenKeys(this.translations[language]));

    const translated = baseKeys.filter((k) => targetKeys.has(k)).length;
    const total = baseKeys.length;
    const percent = total === 0 ? 100 : Math.round((translated / total) * 100);

    return { total, translated, percent };
  }

  private getNested(tree: TranslationTree, path: string): string | undefined {
    const value = path.split('.').reduce<unknown>((acc, part) => {
      if (!this.isRecord(acc)) {
        return undefined;
      }
      return acc[part];
    }, tree);

    return typeof value === 'string' ? value : undefined;
  }

  private flattenKeys(tree: TranslationTree, prefix = ''): string[] {
    const keys: string[] = [];

    for (const [key, value] of Object.entries(tree)) {
      const currentKey = prefix ? `${prefix}.${key}` : key;
      if (typeof value === 'string') {
        keys.push(currentKey);
      } else if (this.isRecord(value)) {
        keys.push(...this.flattenKeys(value, currentKey));
      }
    }

    return keys;
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }
}
