import { readFileSync } from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';
import { translate } from '@/lib/i18n/translate';
import type { TranslationDict } from '@/lib/i18n/translation-loader';

/**
 * The landing page was the largest remaining block of untranslated UI copy
 * (#2160). These checks cover both the catalog entries and the component wiring.
 */
function loadLocale(locale: string): TranslationDict {
  return JSON.parse(
    readFileSync(
      path.resolve(process.cwd(), 'public', 'locales', `${locale}.json`),
      'utf8',
    ),
  ) as TranslationDict;
}

const locales = ['en', 'es', 'fr'] as const;
const catalogs = Object.fromEntries(
  locales.map((locale) => [locale, loadLocale(locale)]),
) as Record<(typeof locales)[number], TranslationDict>;

function landingKeys(dict: TranslationDict): string[] {
  const landing = dict.landing as TranslationDict;
  return Object.entries(landing).flatMap(([surface, entries]) =>
    Object.keys(entries as TranslationDict).map((key) => `${surface}.${key}`),
  );
}

function reference(dict: TranslationDict, key: string): string | undefined {
  return key
    .split('.')
    .reduce<unknown>(
      (node, part) =>
        node && typeof node === 'object'
          ? (node as Record<string, unknown>)[part]
          : undefined,
      dict,
    ) as string | undefined;
}

const heroSource = readFileSync(
  path.resolve(process.cwd(), 'components/landing/Hero.tsx'),
  'utf8',
);
const ctaSource = readFileSync(
  path.resolve(process.cwd(), 'components/landing/CTA.tsx'),
  'utf8',
);
const hookSource = readFileSync(
  path.resolve(process.cwd(), 'lib/i18n/useTranslation.ts'),
  'utf8',
);

describe('landing translations (#2160)', () => {
  it('defines the same landing keys in en, es and fr with non-empty strings', () => {
    const englishKeys = landingKeys(catalogs.en).sort();
    expect(englishKeys.length).toBeGreaterThan(0);

    for (const locale of locales) {
      expect(landingKeys(catalogs[locale]).sort()).toEqual(englishKeys);
      for (const key of englishKeys) {
        const value = reference(catalogs[locale], `landing.${key}`);
        expect(typeof value, `${locale}: landing.${key}`).toBe('string');
        expect((value ?? '').trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('preserves the original English marketing copy', () => {
    expect(reference(catalogs.en, 'landing.hero.titleLine1')).toBe('Come home');
    expect(reference(catalogs.en, 'landing.hero.titleEmphasis')).toBe(
      'certainty.',
    );
    expect(reference(catalogs.en, 'landing.hero.searchPlaceholder')).toBe(
      'City, neighborhood, or property type…',
    );
    expect(reference(catalogs.en, 'landing.cta.createAccount')).toBe(
      'Create your account',
    );
    expect(reference(catalogs.en, 'landing.cta.footnote')).toBe(
      'No credit card required · Non-custodial · Cancel anytime',
    );
  });

  it('resolves translated strings and falls back to English', () => {
    expect(
      translate('landing.hero.browseHomes', catalogs.es, catalogs.en),
    ).toBe('Ver viviendas');

    const spanishWithoutKey: TranslationDict = {
      ...catalogs.es,
      landing: {
        ...(catalogs.es.landing as TranslationDict),
        hero: { trust1: 'Se liquida en segundos' },
      },
    };
    expect(
      translate('landing.hero.browseHomes', spanishWithoutKey, catalogs.en),
    ).toBe('Browse homes');
  });

  it('wires every landing key into the component that renders it', () => {
    for (const key of landingKeys(catalogs.en)) {
      const source = key.startsWith('hero.') ? heroSource : ctaSource;
      expect(
        source.includes(`t('landing.${key}')`),
        `${key} is not referenced by its component`,
      ).toBe(true);
    }
  });

  it('starts with English text so the first render does not show raw keys', () => {
    expect(hookSource).toContain(
      "import englishLocale from '../../public/locales/en.json'",
    );
    expect(hookSource).toContain('useState<TranslationDict>(ENGLISH_DICT)');
  });
});
