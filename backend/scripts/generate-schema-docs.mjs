#!/usr/bin/env node
/**
 * Generates docs/database/DATABASE_SCHEMA.md from the actual TypeORM
 * @Entity decorators in src/**\/*.entity.ts (#2046). Previously hand-written
 * and covering only 22 of the repo's 88 entities since it was never updated
 * as new modules were added; this script makes the doc "regenerable" (the
 * issue's explicit requirement) by deriving it from source instead.
 *
 * This is a lightweight regex-based scan of decorator source text, not a
 * TypeScript AST parser or a live database introspection. It is good
 * enough to catch every @Entity/@Column/@Index/@ManyToOne/@OneToOne in the
 * consistent decorator style this codebase already uses (confirmed by
 * sampling every module before writing this), the same tradeoff
 * `scripts/check-api-docs.ts` already makes for Swagger decorators.
 *
 * Usage: node scripts/generate-schema-docs.mjs  (writes ../docs/database/DATABASE_SCHEMA.md)
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
// Overridable so check-schema-docs.mjs can regenerate into a scratch file
// and diff it against the committed one, without ever touching the real doc.
const outPath =
  process.argv[2] ?? join(root, 'docs', 'database', 'DATABASE_SCHEMA.md');

function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, acc);
    else if (name.endsWith('.entity.ts')) acc.push(p);
  }
  return acc;
}

const RELATION_CARDINALITY = {
  ManyToOne: '}o--||',
  OneToOne: '||--||',
  ManyToMany: '}o--o{',
};

/** One parsed @Entity class: table name, columns, indexes, relations, source file. */
function parseEntityFile(file) {
  const src = readFileSync(file, 'utf8');
  const entities = [];

  // Each @Entity(...) block, up to the next @Entity(...) or end of file.
  const entityStarts = [...src.matchAll(/@Entity\(\s*'([a-z_]+)'\s*\)/g)].map(
    (m) => ({ table: m[1], at: m.index }),
  );

  for (const [i, e] of entityStarts.entries()) {
    const blockEnd = entityStarts[i + 1]?.at ?? src.length;
    const classNameMatch = src
      .slice(e.at, blockEnd)
      .match(/export class (\w+)/);
    const className = classNameMatch ? classNameMatch[1] : '(unknown)';
    const classNameAt = classNameMatch ? e.at + classNameMatch.index : blockEnd;

    // Class-level @Index([...]) decorators are stacked between @Entity(...)
    // and `export class`, e.g. `@Entity('x') @Index([...]) @Index([...])
    // export class X {`.
    const header = src.slice(e.at, classNameAt);
    const classIndexes = [
      ...header.matchAll(/@Index\(\s*\[([^\]]+)\](?:,\s*\{([^}]*)\})?\s*\)/g),
    ].map((m) => ({
      columns: m[1]
        .split(',')
        .map((c) => toSnakeCase(c.trim().replace(/['"]/g, ''))),
      unique: /unique:\s*true/.test(m[2] ?? ''),
    }));

    const body = src.slice(e.at, blockEnd);

    const columns = [];
    // One @Column/@PrimaryGeneratedColumn/@CreateDateColumn/@UpdateDateColumn
    // per property, each optionally preceded by its own @Index().
    const columnRe =
      /(@Index\(\)\s*)?@(PrimaryGeneratedColumn|Column|CreateDateColumn|UpdateDateColumn)\(([^;]*?)\)\s*\n\s*(\w+)[?:]?\s*:\s*([^;=\n]+)/g;
    for (const m of body.matchAll(columnRe)) {
      const [, indexed, decorator, args, propName, tsType] = m;
      const nameMatch = args.match(/name:\s*['"]([a-z_]+)['"]/);
      const typeMatch = args.match(/type:\s*['"]([a-z]+)['"]/);
      const nullable = /nullable:\s*true/.test(args);
      const defaultMatch = args.match(/default:\s*([^,}]+)/);
      columns.push({
        column: nameMatch ? nameMatch[1] : toSnakeCase(propName),
        property: propName,
        tsType: tsType.trim(),
        sqlType:
          typeMatch?.[1] ??
          (decorator === 'PrimaryGeneratedColumn'
            ? 'uuid'
            : decorator === 'CreateDateColumn' ||
                decorator === 'UpdateDateColumn'
              ? 'timestamp'
              : 'inferred'),
        primary: decorator === 'PrimaryGeneratedColumn',
        nullable,
        default: defaultMatch ? defaultMatch[1].trim() : undefined,
        indexed: Boolean(indexed),
      });
    }

    const relations = [];
    for (const m of body.matchAll(
      /@(ManyToOne|OneToOne|ManyToMany)\(\s*\(\)\s*=>\s*(\w+)[^)]*\)[\s\S]{0,120}?@JoinColumn\(\s*\{\s*name:\s*['"]([a-z_]+)['"]/g,
    )) {
      relations.push({ type: m[1], target: m[2], joinColumn: m[3] });
    }

    entities.push({
      table: e.table,
      className,
      file: relative(join(root, '..'), file),
      columns,
      classIndexes,
      relations,
    });
  }

  return entities;
}

function toSnakeCase(s) {
  return s.replace(/([A-Z])/g, '_$1').toLowerCase();
}

function renderColumnsTable(entity) {
  const rows = entity.columns.map((c) => {
    const flags = [];
    if (c.primary) flags.push('PK');
    if (c.indexed) flags.push('indexed');
    if (!c.nullable && !c.primary) flags.push('not null');
    const def = c.default !== undefined ? ` default: ${c.default}` : '';
    return `| \`${c.column}\` | ${c.sqlType} | ${flags.join(', ') || '-'}${def} |`;
  });
  return ['| Column | Type | Notes |', '| --- | --- | --- |', ...rows].join(
    '\n',
  );
}

function renderEntity(entity) {
  const lines = [
    `#### \`${entity.table}\``,
    '',
    `Entity class: \`${entity.className}\` (${entity.file})`,
    '',
  ];
  lines.push(renderColumnsTable(entity));

  const allIndexes = [
    ...entity.classIndexes.map(
      (ix) => `\`${ix.columns.join(', ')}\`${ix.unique ? ' (unique)' : ''}`,
    ),
    ...entity.columns.filter((c) => c.indexed).map((c) => `\`${c.column}\``),
  ];
  if (allIndexes.length > 0) {
    lines.push('', '**Indexes:** ' + allIndexes.join(', '));
  }

  if (entity.relations.length > 0) {
    lines.push(
      '',
      '**Relations:** ' +
        entity.relations
          .map((r) => `${r.type} → \`${r.target}\` (via \`${r.joinColumn}\`)`)
          .join(', '),
    );
  }

  return lines.join('\n');
}

function renderErd(entities) {
  const edges = new Set();
  for (const entity of entities) {
    for (const r of entity.relations) {
      edges.add(
        `  ${entity.className} ${RELATION_CARDINALITY[r.type]} ${r.target} : ${r.type}`,
      );
    }
  }
  const linked = new Set(
    [...edges].flatMap((l) =>
      l
        .trim()
        .split(/\s+/)
        .filter((_, i) => i === 0 || i === 2),
    ),
  );
  const standalone = entities.filter((e) => !linked.has(e.className));
  return [
    '```mermaid',
    'erDiagram',
    ...[...edges].sort(),
    ...standalone.map((e) => `  ${e.className}`),
    '```',
  ].join('\n');
}

// ─── Main ─────────────────────────────────────────────────────────────────

const files = walk(join(root, 'src')).sort();
const entities = files
  .flatMap(parseEntityFile)
  .sort((a, b) => a.table.localeCompare(b.table));

const toc = entities
  .map((e) => `- [\`${e.table}\`](#${e.table.replace(/_/g, '')})`)
  .join('\n');

const doc = `# Database Schema Documentation

> **Generated file — do not hand-edit.** Run \`pnpm run docs:schema\`
> (\`scripts/generate-schema-docs.mjs\`) to regenerate this document from the
> \`@Entity\` decorators in \`src/**/*.entity.ts\` after adding or changing an
> entity. (#2046)

## Overview

${entities.length} tables, derived from ${files.length} entity files under \`backend/src\`.

For the domain-level narrative behind these relationships (e.g. what a
landlord/tenant/agent role on \`rent_agreements\` actually means), see
[SCHEMA_RELATIONSHIPS.md](./SCHEMA_RELATIONSHIPS.md), which is hand-written
and complementary to this generated reference rather than a duplicate of it.

## Entity Relationship Diagram

${renderErd(entities)}

## Table of Contents

${toc}

## Tables

${entities.map(renderEntity).join('\n\n')}
`;

writeFileSync(outPath, doc);
console.log(`Wrote ${entities.length} tables to ${outPath}`);
