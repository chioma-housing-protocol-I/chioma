#!/usr/bin/env ts-node
/**
 * Migration Timestamp Collision Checker
 *
 * Migrations for this backend are split across two directories that are both
 * loaded into the same TypeORM DataSource and merged into one timestamp-sorted
 * chain (see src/database/data-source.ts):
 *
 *   - backend/src/migrations/*.ts
 *   - backend/migrations/*.ts
 *
 * TypeORM does not detect or reject duplicate timestamp prefixes across these
 * two directories at generation time, so a collision goes unnoticed until it
 * causes a real problem (a run order that depends on filesystem/glob
 * enumeration instead of a well-defined sequence). This script scans both
 * directories together and fails if any timestamp prefix is reused, and also
 * sanity-checks that each migration class name's embedded timestamp suffix
 * matches its filename prefix.
 *
 * Usage:
 *   pnpm run migration:check-timestamps
 *   ts-node scripts/check-migration-timestamps.ts
 *
 * Exit code: 0 if clean, 1 if any collision or mismatch is found.
 */

import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';

const MIGRATION_DIRS = [
  join(__dirname, '..', 'src', 'migrations'),
  join(__dirname, '..', 'migrations'),
];

const FILENAME_RE = /^(\d+)-(.+)\.ts$/;
const CLASS_RE = /export class ([A-Za-z0-9_]+?)(\d{13})\s+implements MigrationInterface/;

interface MigrationFileInfo {
  dir: string;
  file: string;
  timestamp: string;
}

function collectMigrationFiles(): MigrationFileInfo[] {
  const results: MigrationFileInfo[] = [];

  for (const dir of MIGRATION_DIRS) {
    let entries: string[];
    try {
      entries = readdirSync(dir);
    } catch {
      continue;
    }

    for (const file of entries) {
      const match = FILENAME_RE.exec(file);
      if (!match) continue;
      results.push({ dir, file, timestamp: match[1] });
    }
  }

  return results;
}

function checkDuplicateTimestamps(files: MigrationFileInfo[]): string[] {
  const errors: string[] = [];
  const byTimestamp = new Map<string, MigrationFileInfo[]>();

  for (const info of files) {
    const list = byTimestamp.get(info.timestamp) ?? [];
    list.push(info);
    byTimestamp.set(info.timestamp, list);
  }

  for (const [timestamp, group] of byTimestamp) {
    if (group.length > 1) {
      errors.push(
        `Duplicate timestamp "${timestamp}" used by ${group.length} files:\n` +
          group
            .map((g) => `    - ${join(g.dir, g.file)}`)
            .join('\n'),
      );
    }
  }

  return errors;
}

function checkClassNameMatchesFilename(files: MigrationFileInfo[]): string[] {
  const errors: string[] = [];

  for (const info of files) {
    const contents = readFileSync(join(info.dir, info.file), 'utf8');
    const match = CLASS_RE.exec(contents);

    if (!match) {
      errors.push(
        `Could not find a "export class Name<13-digit-timestamp>" declaration in ${join(
          info.dir,
          info.file,
        )}`,
      );
      continue;
    }

    const classTimestamp = match[2];
    if (classTimestamp !== info.timestamp) {
      errors.push(
        `Class name timestamp suffix "${classTimestamp}" does not match filename prefix "${info.timestamp}" in ${join(
          info.dir,
          info.file,
        )}`,
      );
    }
  }

  return errors;
}

function main(): void {
  const files = collectMigrationFiles();

  if (files.length === 0) {
    console.error('No migration files found in either migrations directory. Aborting.');
    process.exit(1);
  }

  const errors = [
    ...checkDuplicateTimestamps(files),
    ...checkClassNameMatchesFilename(files),
  ];

  if (errors.length > 0) {
    console.error(`Migration timestamp check FAILED (${files.length} files scanned):\n`);
    for (const err of errors) {
      console.error(`  - ${err}\n`);
    }
    process.exit(1);
  }

  console.log(
    `Migration timestamp check passed: ${files.length} migration files across ${MIGRATION_DIRS.length} directories, no duplicate timestamps, all class names consistent.`,
  );
}

main();
