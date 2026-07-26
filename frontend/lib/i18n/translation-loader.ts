/**
 * Translation loader — fetches the JSON bundle for a locale.
 *
 * On the client we fetch from /public/locales/<locale>.json.
 * During SSR / Node environments (scripts, tests) we read the file directly.
 *
 * The loader is intentionally framework-agnostic so it can be used in both
 * React hooks and the standalone audit script.
 */

import type { SupportedLocale } from './locales';

export type TranslationDict = Record<string, unknown>;

/** In-process cache — avoids redundant fetches in the same session. */
const cache = new Map<string, TranslationDict>();

/**
 * Load a locale bundle.
 * - In browser: fetches `/locales/<locale>.json`.
 * - In Node (tests / scripts): uses `require` / dynamic `import` to read the
 *   file from the filesystem.
 */
export async function loadLocale(locale: SupportedLocale): Promise<TranslationDict> {
  if (cache.has(locale)) return cache.get(locale)!;

  let dict: TranslationDict;

  if (typeof window !== 'undefined') {
    // Browser path
    const res = await fetch(`/locales/${locale}.json`);
    if (!res.ok) throw new Error(`Failed to load locale "${locale}": HTTP ${res.status}`);
    dict = (await res.json()) as TranslationDict;
  } else {
    // Node path — used by scripts and tests
    const path = await import('path');
    const fs = await import('fs/promises');
    const filePath = path.resolve(
      process.cwd(),
      'public',
      'locales',
      `${locale}.json`,
    );
    const raw = await fs.readFile(filePath, 'utf-8');
    dict = JSON.parse(raw) as TranslationDict;
  }

  cache.set(locale, dict);
  return dict;
}

/** Synchronously clear the in-process cache (useful in tests). */
export function clearLocaleCache(): void {
  cache.clear();
}
