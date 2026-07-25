/**
 * [I18N] Translation coverage — Issue #1271
 *
 * Verifies:
 *  1. All locale files exist and are valid JSON
 *  2. Every key in the English source exists in every other locale (no missing keys)
 *  3. No locale has orphan keys not present in English (no stale keys)
 *  4. The translate() function falls back to English when a key is missing
 *  5. The translate() function returns the key itself when missing from all locales
 *  6. Interpolation ({{count}}) works correctly in all locales
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFile } from 'fs/promises';
import path from 'path';
import { translate } from '@/lib/i18n/translate';
import type { TranslationDict } from '@/lib/i18n/translation-loader';

// ─── Setup ───────────────────────────────────────────────────────────────────

const LOCALES_DIR = path.resolve(process.cwd(), 'public', 'locales');
const SOURCE_LOCALE = 'en';
const TARGET_LOCALES = ['es', 'fr'];
const ALL_LOCALES = [SOURCE_LOCALE, ...TARGET_LOCALES];

async function loadLocaleFile(locale: string): Promise<TranslationDict> {
  const filePath = path.join(LOCALES_DIR, `${locale}.json`);
  const raw = await readFile(filePath, 'utf-8');
  return JSON.parse(raw) as TranslationDict;
}

/** Recursively flatten nested object to dot-separated keys. */
function flattenKeys(obj: unknown, prefix = ''): string[] {
  if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) return [];
  return Object.entries(obj as Record<string, unknown>).flatMap(([key, value]) => {
    const full = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      return flattenKeys(value, full);
    }
    return [full];
  });
}

// Load all locales once before running tests
const dicts: Record<string, TranslationDict> = {};
let sourceKeys: string[] = [];

beforeAll(async () => {
  for (const locale of ALL_LOCALES) {
    dicts[locale] = await loadLocaleFile(locale);
  }
  sourceKeys = flattenKeys(dicts[SOURCE_LOCALE]);
});

// ─── 1. Locale file validity ──────────────────────────────────────────────────

describe('[I18N] Locale files are valid JSON', () => {
  for (const locale of ALL_LOCALES) {
    it(`${locale}.json exists and parses as a non-empty object`, async () => {
      const dict = await loadLocaleFile(locale);
      expect(dict).toBeDefined();
      expect(typeof dict).toBe('object');
      expect(Object.keys(dict).length).toBeGreaterThan(0);
    });
  }
});

// ─── 2. Coverage: no missing keys ────────────────────────────────────────────

describe('[I18N] No missing keys (source coverage = 100%)', () => {
  for (const locale of TARGET_LOCALES) {
    it(`${locale}.json has all keys present in en.json`, () => {
      const targetKeys = new Set(flattenKeys(dicts[locale]));
      const missing = sourceKeys.filter(k => !targetKeys.has(k));

      if (missing.length > 0) {
        console.error(
          `\n[i18n] ${locale}: ${missing.length} missing key(s):\n` +
            missing.map(k => `  • ${k}`).join('\n'),
        );
      }

      expect(missing, `${locale} is missing ${missing.length} key(s)`).toHaveLength(0);
    });
  }
});

// ─── 3. No orphan keys ───────────────────────────────────────────────────────

describe('[I18N] No orphan keys (locale has no keys absent from source)', () => {
  for (const locale of TARGET_LOCALES) {
    it(`${locale}.json has no keys absent from en.json`, () => {
      const sourceSet = new Set(sourceKeys);
      const targetKeys = flattenKeys(dicts[locale]);
      const orphans = targetKeys.filter(k => !sourceSet.has(k));

      if (orphans.length > 0) {
        console.warn(
          `\n[i18n] ${locale}: ${orphans.length} orphan key(s):\n` +
            orphans.map(k => `  • ${k}`).join('\n'),
        );
      }

      expect(orphans, `${locale} has ${orphans.length} orphan key(s)`).toHaveLength(0);
    });
  }
});

// ─── 4. Key count sanity ─────────────────────────────────────────────────────

describe('[I18N] Key counts are consistent', () => {
  it('en.json has at least 70 translation keys', () => {
    expect(sourceKeys.length).toBeGreaterThanOrEqual(70);
  });

  for (const locale of TARGET_LOCALES) {
    it(`${locale}.json has the same number of keys as en.json`, () => {
      const targetKeyCount = flattenKeys(dicts[locale]).length;
      expect(targetKeyCount).toBe(sourceKeys.length);
    });
  }
});

// ─── 5. Fallback to English ───────────────────────────────────────────────────

describe('[I18N] translate() – fallback-to-en behavior', () => {
  const enDict = { common: { search: 'Search', error: 'Error' } } as unknown as TranslationDict;
  const esDict = { common: { search: 'Buscar' } } as unknown as TranslationDict; // missing "error"
  const emptyDict = {} as TranslationDict;

  it('returns the active locale value when key exists', () => {
    const result = translate('common.search', esDict, enDict);
    expect(result).toBe('Buscar');
  });

  it('falls back to English when key is missing from active locale', () => {
    const result = translate('common.error', esDict, enDict);
    expect(result).toBe('Error'); // English fallback
  });

  it('returns the key itself when missing from ALL locales', () => {
    const result = translate('nonexistent.key', emptyDict, emptyDict);
    expect(result).toBe('nonexistent.key');
  });

  it('returns English value directly when active locale IS English', () => {
    const result = translate('common.search', enDict, enDict);
    expect(result).toBe('Search');
  });
});

// ─── 6. Interpolation ────────────────────────────────────────────────────────

describe('[I18N] translate() – interpolation', () => {
  it('replaces {{count}} placeholder in English', () => {
    const result = translate(
      'booking.nights',
      dicts['en'],
      dicts['en'],
      { count: 5 },
    );
    expect(result).toBe('5 nights');
  });

  it('replaces {{count}} placeholder in Spanish', () => {
    const result = translate(
      'booking.nights',
      dicts['es'],
      dicts['en'],
      { count: 3 },
    );
    expect(result).toBe('3 noches');
  });

  it('replaces {{count}} placeholder in French', () => {
    const result = translate(
      'booking.nights',
      dicts['fr'],
      dicts['en'],
      { count: 2 },
    );
    expect(result).toBe('2 nuits');
  });

  it('leaves placeholder intact when variable is not provided', () => {
    const result = translate('booking.nights', dicts['en'], dicts['en']);
    expect(result).toBe('{{count}} nights');
  });

  it('replaces {{count}} in showingAll key across all locales', () => {
    const counts: Record<string, string> = {
      en: '42 listings',
      es: '42 propiedades',
      fr: '42 annonces',
    };
    for (const locale of ALL_LOCALES) {
      const result = translate(
        'properties.showingAll',
        dicts[locale],
        dicts['en'],
        { count: 42 },
      );
      expect(result).toBe(counts[locale]);
    }
  });
});

// ─── 7. Spot-check specific real translations ────────────────────────────────

describe('[I18N] Spot-check real translation values', () => {
  const checks: Array<{ key: string; en: string; es: string; fr: string }> = [
    { key: 'common.search',       en: 'Search',       es: 'Buscar',       fr: 'Rechercher' },
    { key: 'nav.properties',      en: 'Properties',   es: 'Propiedades',  fr: 'Propriétés' },
    { key: 'nav.signIn',          en: 'Sign In',      es: 'Iniciar sesión', fr: 'Se connecter' },
    { key: 'errors.notFound',     en: 'Page not found', es: 'Página no encontrada', fr: 'Page introuvable' },
    { key: 'properties.verified', en: 'Verified',     es: 'Verificado',   fr: 'Vérifié' },
    { key: 'dashboard.welcome',   en: 'Welcome back', es: 'Bienvenido de nuevo', fr: 'Bon retour' },
  ];

  for (const { key, en, es, fr } of checks) {
    it(`"${key}" is correctly translated in all locales`, () => {
      expect(translate(key, dicts['en'], dicts['en'])).toBe(en);
      expect(translate(key, dicts['es'], dicts['en'])).toBe(es);
      expect(translate(key, dicts['fr'], dicts['en'])).toBe(fr);
    });
  }
});
