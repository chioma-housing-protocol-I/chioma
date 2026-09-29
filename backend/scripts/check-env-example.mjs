#!/usr/bin/env node
/**
 * Fails when a variable read by src/config/env.validation.ts is missing from .env.example.
 * Usage: node scripts/check-env-example.mjs
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const schema = readFileSync(join(root, 'src/config/env.validation.ts'), 'utf8');
const example = readFileSync(join(root, '.env.example'), 'utf8');

const required = new Set([
  ...[...schema.matchAll(/config\.([A-Z][A-Z0-9_]+)/g)].map((m) => m[1]),
  ...[...schema.matchAll(/'([A-Z][A-Z0-9_]*_(?:TTL|MAX|SECRET))'/g)].map((m) => m[1]),
]);
const documented = new Set(
  [...example.matchAll(/^#?\s*([A-Z][A-Z0-9_]+)=/gm)].map((m) => m[1]),
);
const missing = [...required].filter((k) => !documented.has(k)).sort();
if (missing.length) {
  console.error(`.env.example is missing: ${missing.join(', ')}`);
  process.exit(1);
}
console.log(`.env.example covers all ${required.size} schema variables`);
