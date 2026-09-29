#!/usr/bin/env node
/**
 * Generates a Mermaid ER diagram from TypeORM entity decorators.
 * Usage: node scripts/generate-er-diagram.mjs  (writes ../docs/data-model.er.mmd)
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, '..', 'docs', 'data-model.er.mmd');

function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, acc);
    else if (name.endsWith('.entity.ts')) acc.push(p);
  }
  return acc;
}

const CARD = {
  ManyToOne: '}o--||',
  OneToOne: '||--||',
  ManyToMany: '}o--o{',
};

const entities = new Set();
const edges = new Set();
for (const file of walk(join(root, 'src')).sort()) {
  const src = readFileSync(file, 'utf8');
  const re = /@Entity\([^)]*\)\s*(?:@[\s\S]*?\)\s*)*export class (\w+)/g;
  const classes = [...src.matchAll(re)].map((m) => ({ name: m[1], at: m.index }));
  for (const [i, c] of classes.entries()) {
    entities.add(c.name);
    const body = src.slice(c.at, classes[i + 1]?.at ?? src.length);
    for (const m of body.matchAll(/@(ManyToOne|OneToOne|ManyToMany)\(\s*\(\)\s*=>\s*(\w+)/g)) {
      edges.add(`  ${c.name} ${CARD[m[1]]} ${m[2]} : ${m[1]}`);
    }
  }
}

const lines = ['erDiagram', ...[...edges].sort()];
for (const e of [...entities].sort()) {
  if (![...edges].some((l) => l.includes(` ${e} `))) lines.push(`  ${e}`);
}
writeFileSync(out, lines.join('\n') + '\n');
console.log(`Wrote ${entities.size} entities, ${edges.size} relations to ${out}`);
