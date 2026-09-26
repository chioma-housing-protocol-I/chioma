#!/usr/bin/env node
/**
 * i18n-audit.mjs — Translation coverage audit tool
 *
 * Usage:
 *   node scripts/i18n-audit.mjs               # audit all non-English locales
 *   node scripts/i18n-audit.mjs --locale es   # audit a single locale
 *   node scripts/i18n-audit.mjs --fix         # scaffold missing keys with TODO values
 *
 * Exit codes:
 *   0  — all locales are complete (no missing or orphan keys)
 *   1  — one or more locales have missing keys (CI fails here)
 *
 * Concepts:
 *   missing key  — present in English (source of truth) but absent in locale
 *   orphan key   — present in locale but absent in English (stale translation)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ─── Config ──────────────────────────────────────────────────────────────────

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOCALES_DIR = path.resolve(__dirname, '..', 'public', 'locales');
const SOURCE_LOCALE = 'en';

const args = process.argv.slice(2);
const fixMode = args.includes('--fix');
const localeFilter = (() => {
  const idx = args.indexOf('--locale');
  return idx !== -1 ? args[idx + 1] : null;
})();

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Recursively flatten a nested object into dot-separated keys. */
function flattenKeys(obj, prefix = '') {
  const result = [];
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      result.push(...flattenKeys(value, fullKey));
    } else {
      result.push(fullKey);
    }
  }
  return result;
}

/** Deep-set a value at a dot-separated path, creating intermediary objects. */
function deepSet(obj, keyPath, value) {
  const parts = keyPath.split('.');
  let node = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (typeof node[parts[i]] !== 'object') {
      node[parts[i]] = {};
    }
    node = node[parts[i]];
  }
  node[parts[parts.length - 1]] = value;
}

/** Deep-delete a value at a dot-separated path. */
function deepDelete(obj, keyPath) {
  const parts = keyPath.split('.');
  let node = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (typeof node[parts[i]] !== 'object') return;
    node = node[parts[i]];
  }
  delete node[parts[parts.length - 1]];
}

/** Load a locale JSON file. Returns the parsed object. */
function loadLocale(locale) {
  const filePath = path.join(LOCALES_DIR, `${locale}.json`);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Locale file not found: ${filePath}`);
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

/** Write a locale JSON file (preserving 2-space indent). */
function writeLocale(locale, data) {
  const filePath = path.join(LOCALES_DIR, `${locale}.json`);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
}

/** Discover all locale files in the locales directory (excluding the source). */
function discoverLocales() {
  if (!fs.existsSync(LOCALES_DIR)) {
    throw new Error(`Locales directory not found: ${LOCALES_DIR}`);
  }
  return fs
    .readdirSync(LOCALES_DIR)
    .filter(f => f.endsWith('.json'))
    .map(f => f.replace('.json', ''))
    .filter(l => l !== SOURCE_LOCALE);
}

// ANSI colour helpers (works in most CI environments)
const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

function col(colour, text) { return `${colour}${text}${c.reset}`; }

// ─── Core audit ──────────────────────────────────────────────────────────────

/**
 * Audit a single locale against the source.
 * Returns { missing: string[], orphan: string[] }.
 */
function auditLocale(sourceKeys, targetKeys) {
  const sourceSet = new Set(sourceKeys);
  const targetSet = new Set(targetKeys);

  const missing = sourceKeys.filter(k => !targetSet.has(k));
  const orphan = targetKeys.filter(k => !sourceSet.has(k));

  return { missing, orphan };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

function main() {
  console.log(col(c.bold, '\n🌐 i18n Translation Coverage Audit'));
  console.log(col(c.gray, '─'.repeat(50)));

  // Load source (English)
  let sourceDict;
  try {
    sourceDict = loadLocale(SOURCE_LOCALE);
  } catch (err) {
    console.error(col(c.red, `\n❌ Could not load source locale "${SOURCE_LOCALE}": ${err.message}`));
    process.exit(1);
  }
  const sourceKeys = flattenKeys(sourceDict);
  console.log(col(c.cyan, `\n📖 Source (${SOURCE_LOCALE}): ${sourceKeys.length} keys`));

  // Determine which locales to audit
  const allLocales = discoverLocales();
  const localesToAudit = localeFilter
    ? allLocales.filter(l => l === localeFilter)
    : allLocales;

  if (localesToAudit.length === 0) {
    const msg = localeFilter
      ? `No locale file found for "${localeFilter}" (or it is the source locale).`
      : 'No non-English locale files found in ' + LOCALES_DIR;
    console.warn(col(c.yellow, `\n⚠️  ${msg}`));
    process.exit(0);
  }

  // Run audit per locale
  let totalMissing = 0;
  let totalOrphan = 0;
  const report = [];

  for (const locale of localesToAudit) {
    let targetDict;
    try {
      targetDict = loadLocale(locale);
    } catch (err) {
      console.error(col(c.red, `\n❌ Could not load locale "${locale}": ${err.message}`));
      totalMissing += sourceKeys.length; // treat whole locale as missing
      report.push({ locale, missing: sourceKeys, orphan: [] });
      continue;
    }

    const targetKeys = flattenKeys(targetDict);
    const { missing, orphan } = auditLocale(sourceKeys, targetKeys);
    totalMissing += missing.length;
    totalOrphan += orphan.length;
    report.push({ locale, missing, orphan });

    // Optional: fix mode — scaffold missing keys
    if (fixMode && missing.length > 0) {
      for (const key of missing) {
        // Get the English value as a scaffold comment
        const enValue = key.split('.').reduce((o, k) => (o && typeof o === 'object' ? o[k] : undefined), sourceDict);
        deepSet(targetDict, key, `[TODO: ${String(enValue ?? key)}]`);
      }
      writeLocale(locale, targetDict);
      console.log(col(c.yellow, `  🔧 Scaffolded ${missing.length} missing keys in ${locale}.json`));
    }
  }

  // ─── Print report ─────────────────────────────────────────────────────────

  console.log(col(c.gray, '\n' + '─'.repeat(50)));
  console.log(col(c.bold, '📊 Results per locale\n'));

  for (const { locale, missing, orphan } of report) {
    const status = missing.length === 0
      ? col(c.green, '✅ PASS')
      : col(c.red,   '❌ FAIL');

    console.log(`  ${status}  ${col(c.bold, locale.toUpperCase().padEnd(6))} ` +
      col(c.green,  `${(sourceKeys.length - missing.length).toString().padStart(3)}/${sourceKeys.length} keys`) +
      (missing.length ? col(c.red,    `  ${missing.length} missing`) : '') +
      (orphan.length  ? col(c.yellow, `  ${orphan.length} orphan`)   : '')
    );

    if (missing.length > 0) {
      console.log(col(c.red, `\n    Missing keys in "${locale}":`));
      for (const key of missing) {
        console.log(col(c.red, `      • ${key}`));
      }
    }
    if (orphan.length > 0) {
      console.log(col(c.yellow, `\n    Orphan keys in "${locale}" (not in source):`));
      for (const key of orphan) {
        console.log(col(c.yellow, `      • ${key}`));
      }
    }
  }

  console.log(col(c.gray, '\n' + '─'.repeat(50)));

  if (totalMissing === 0 && totalOrphan === 0) {
    console.log(col(c.green, '\n✅ All locales are complete. No missing or orphan keys.\n'));
    process.exit(0);
  }

  if (totalMissing > 0) {
    console.error(col(c.red, `\n❌ ${totalMissing} missing key(s) found across ${localesToAudit.length} locale(s).`));
    console.error(col(c.red, '   Add translations or run with --fix to scaffold TODO placeholders.\n'));
  }
  if (totalOrphan > 0) {
    console.warn(col(c.yellow, `\n⚠️  ${totalOrphan} orphan key(s) found (present in locale but not in source).`));
    console.warn(col(c.yellow, '   Remove stale keys from your locale files.\n'));
  }

  // Only fail CI on missing keys (orphans are a warning)
  if (totalMissing > 0) {
    process.exit(1);
  }

  process.exit(0);
}

main();
