/**
 * [I18N] Text overflow risk and date/time formatting across locales (#2038).
 *
 * Companion to translation-coverage.test.ts, which already covers key
 * parity and interpolation; this covers the two things that file doesn't:
 *
 *  1. Text overflow risk: UI-chrome strings (common.* and nav.*, which
 *     render inside fixed-width buttons/nav items), unlike longer-form
 *     prose elsewhere in the dictionary, that are dramatically longer in
 *     a translation than in English, the classic i18n layout-breaking
 *     case (e.g. "Save" -> "Enregistrer").
 *  2. Date/time formatting per locale, exercising the real
 *     getDateFnsLocale/useDateFnsLocale helpers that
 *     __tests__/lib/format.test.ts's formatDate tests don't reach (that
 *     file tests formatDate's own Intl-based formatting, not the
 *     date-fns locale objects consumed elsewhere for formatDistanceToNow
 *     etc).
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { readFile } from 'fs/promises';
import path from 'path';
import { format as formatWithDateFns } from 'date-fns';
import { getDateFnsLocale } from '@/lib/utils/date-fns-locale';
import type { SupportedLocale } from '@/lib/i18n';
import type { TranslationDict } from '@/lib/i18n/translation-loader';

const LOCALES_DIR = path.resolve(process.cwd(), 'public', 'locales');
const JSON_LOCALES = ['en', 'es', 'fr'] as const;

// UI-chrome groups only: fixed-width buttons/nav items where a 2x-longer
// translation is likely to actually overflow, unlike free-flowing prose
// elsewhere in the dictionary.
const UI_CHROME_GROUPS = ['common', 'nav'] as const;

// A translation more than this many times the English string's length is
// flagged. Calibrated against this dictionary's real content: most
// French/Spanish UI labels run 1.0-1.5x English; anything past 1.8x is
// unusual enough to be worth a human looking at the actual rendered
// button/nav item, even though the translation itself may be correct.
const OVERFLOW_RISK_RATIO = 1.8;
const MIN_LENGTH_TO_FLAG = 3; // skip near-empty strings where ratio is noisy

async function loadLocaleFile(locale: string): Promise<TranslationDict> {
  const filePath = path.join(LOCALES_DIR, `${locale}.json`);
  const raw = await readFile(filePath, 'utf-8');
  return JSON.parse(raw) as TranslationDict;
}

function flattenGroup(
  dict: TranslationDict,
  group: string,
): Record<string, string> {
  const section = (dict as Record<string, unknown>)[group];
  if (!section || typeof section !== 'object') return {};
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(section as Record<string, unknown>)) {
    if (typeof value === 'string') out[key] = value;
  }
  return out;
}

describe('[I18N] UI-chrome text overflow risk (#2038)', () => {
  let en: TranslationDict;
  const translated: Record<string, TranslationDict> = {};

  beforeAll(async () => {
    en = await loadLocaleFile('en');
    for (const locale of JSON_LOCALES) {
      if (locale === 'en') continue;
      translated[locale] = await loadLocaleFile(locale);
    }
  });

  for (const group of UI_CHROME_GROUPS) {
    describe(`"${group}" group`, () => {
      it(`flags any translation over ${OVERFLOW_RISK_RATIO}x the English length (informational list, not auto-fail)`, () => {
        const enEntries = flattenGroup(en, group);
        const flagged: string[] = [];

        for (const locale of Object.keys(translated)) {
          const localeEntries = flattenGroup(translated[locale], group);
          for (const [key, enValue] of Object.entries(enEntries)) {
            if (enValue.length < MIN_LENGTH_TO_FLAG) continue;
            const translatedValue = localeEntries[key];
            if (!translatedValue) continue;
            const ratio = translatedValue.length / enValue.length;
            if (ratio > OVERFLOW_RISK_RATIO) {
              flagged.push(
                `${group}.${key} [${locale}]: "${enValue}" (${enValue.length}) -> "${translatedValue}" (${translatedValue.length}), ${ratio.toFixed(2)}x`,
              );
            }
          }
        }

        // This is a known, accepted list today (accurate translations
        // that happen to be longer, e.g. "Save" -> "Enregistrer"); the
        // point of this test is to make the list visible and stable, so
        // a *new* long translation added later shows up as a diff here
        // rather than silently shipping. Update KNOWN_OVERFLOW_RISKS
        // deliberately when that happens, not by raising the ratio.
        const KNOWN_OVERFLOW_RISKS = new Set([
          'nav.admin [fr]',
          'nav.admin [es]',
          'nav.signIn [es]',
          'common.save [fr]',
          'common.next [es]',
          'common.edit [fr]',
        ]);
        const unexpected = flagged.filter(
          (line) => !KNOWN_OVERFLOW_RISKS.has(line.split(':')[0]),
        );

        expect(
          unexpected,
          `New overflow-risk translation(s) in "${group}" not yet reviewed:\n${unexpected.join('\n')}`,
        ).toHaveLength(0);
      });
    });
  }
});

describe('[I18N] Date/time formatting per locale (#2038)', () => {
  // A fixed instant so formatted output is deterministic across runs/CI.
  const FIXED_DATE = new Date('2026-03-15T14:30:00.000Z');

  const EXPECTED_LONG_DATE: Record<SupportedLocale, string> = {
    en: 'March 15th, 2026',
    es: '15 de marzo de 2026',
    fr: '15 mars 2026',
    ar: '15 مارس 2026',
  };

  for (const locale of ['en', 'es', 'fr', 'ar'] as SupportedLocale[]) {
    it(`formats a long-form date correctly for locale "${locale}"`, () => {
      const dateFnsLocale = getDateFnsLocale(locale);
      const formatted = formatWithDateFns(FIXED_DATE, 'PPP', {
        locale: dateFnsLocale,
      });
      expect(formatted).toBe(EXPECTED_LONG_DATE[locale]);
    });
  }

  it('falls back to English formatting for an unsupported locale code', () => {
    // getDateFnsLocale's own fallback (?? enUS); cast to bypass the
    // SupportedLocale type since the point is testing an invalid input.
    const dateFnsLocale = getDateFnsLocale('de' as SupportedLocale);
    const formatted = formatWithDateFns(FIXED_DATE, 'PPP', {
      locale: dateFnsLocale,
    });
    expect(formatted).toBe(EXPECTED_LONG_DATE.en);
  });

  it('each supported locale maps to a distinct date-fns Locale object', () => {
    const locales = (['en', 'es', 'fr', 'ar'] as SupportedLocale[]).map(
      getDateFnsLocale,
    );
    const uniqueCodes = new Set(locales.map((l) => l.code));
    expect(uniqueCodes.size).toBe(4);
  });
});
