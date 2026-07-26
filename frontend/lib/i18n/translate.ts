/**
 * Core translation resolver.
 *
 * Resolves a dot-separated key (e.g. "common.search") against the active
 * locale dict and falls back to English when the key is absent.
 *
 * Supports simple interpolation: t('booking.nights', { count: 3 })
 * replaces `{{count}}` → "3".
 */

import type { TranslationDict } from './translation-loader';

/**
 * Walk a nested dict using a dot-separated key path.
 * Returns `undefined` when any segment is missing.
 */
function resolvePath(dict: TranslationDict, key: string): string | undefined {
  const parts = key.split('.');
  let node: unknown = dict;
  for (const part of parts) {
    if (node === null || typeof node !== 'object') return undefined;
    node = (node as Record<string, unknown>)[part];
  }
  return typeof node === 'string' ? node : undefined;
}

/**
 * Replace `{{variable}}` placeholders in a translation string.
 */
function interpolate(
  template: string,
  vars: Record<string, string | number>,
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, name) =>
    vars[name] !== undefined ? String(vars[name]) : `{{${name}}}`,
  );
}

/**
 * Resolve a translation key against the active dict, falling back to the
 * English dict if the key is absent.
 *
 * @param key        Dot-separated translation key, e.g. "common.search"
 * @param activeDict The current locale's translation dict
 * @param fallbackDict The English (fallback) translation dict
 * @param vars       Optional interpolation variables
 * @returns          Translated string, English fallback, or the key itself
 */
export function translate(
  key: string,
  activeDict: TranslationDict,
  fallbackDict: TranslationDict,
  vars?: Record<string, string | number>,
): string {
  const active = resolvePath(activeDict, key);

  if (active !== undefined) {
    return vars ? interpolate(active, vars) : active;
  }

  // Fall back to English
  const fallback = resolvePath(fallbackDict, key);
  if (fallback !== undefined) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(`[i18n] Missing key "${key}" in active locale; using English fallback.`);
    }
    return vars ? interpolate(fallback, vars) : fallback;
  }

  // Last resort: return the key itself so the UI never breaks
  if (process.env.NODE_ENV === 'development') {
    console.warn(`[i18n] Key "${key}" not found in any locale.`);
  }
  return key;
}
