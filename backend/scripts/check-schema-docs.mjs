#!/usr/bin/env node
/**
 * CI gate for #2046: fails when docs/database/DATABASE_SCHEMA.md is out of
 * sync with the current @Entity decorators (i.e. someone added/changed an
 * entity and forgot to run `pnpm run docs:schema`). Regenerates the doc
 * into a scratch file and diffs it against the committed one, rather than
 * re-deriving the same parsing logic here, so there is exactly one place
 * (`generate-schema-docs.mjs`) that knows how to read an entity file.
 *
 * Usage: node scripts/check-schema-docs.mjs
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const docPath = join(root, 'docs', 'database', 'DATABASE_SCHEMA.md');

const committed = readFileSync(docPath, 'utf-8');

const scratchDir = mkdtempSync(join(tmpdir(), 'chioma-schema-check-'));
const scratchDoc = join(scratchDir, 'DATABASE_SCHEMA.md');

try {
  execFileSync(
    process.execPath,
    [join(root, 'scripts', 'generate-schema-docs.mjs'), scratchDoc],
    { cwd: root },
  );

  const fresh = readFileSync(scratchDoc, 'utf-8');

  if (fresh !== committed) {
    console.error(
      '\x1b[31m✗ docs/database/DATABASE_SCHEMA.md is out of date.\x1b[0m',
    );
    console.error(
      '  An entity changed since this doc was last generated. Run:\n' +
        '    pnpm run docs:schema\n' +
        '  and commit the result.',
    );
    process.exit(1);
  }

  console.log('\x1b[32m✓ DATABASE_SCHEMA.md is up to date.\x1b[0m');
} finally {
  rmSync(scratchDir, { recursive: true, force: true });
}
