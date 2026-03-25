#!/usr/bin/env node
/**
 * Generate client SDKs from OpenAPI spec.
 * 1. Runs openapi:generate (via Node) to produce openapi.json
 * 2. Runs @openapitools/openapi-generator-cli for TypeScript and Python (if available)
 *
 * Prerequisites: pnpm run openapi:generate (or set OPENAPI_JSON path)
 * Optional: npx @openapitools/openapi-generator-cli version-manager set 7.x
 *
 * Usage: node scripts/sdk-generate.mjs [outputDir]
 * Output: openapi.json + sdks/typescript-fetch + sdks/python (if generator is run)
 */
import { execSync, spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');
const outputDir = process.argv[2] || path.join(rootDir, 'sdks');
const openapiPath = process.env.OPENAPI_JSON || path.join(rootDir, 'openapi.json');

// Ensure openapi.json exists
if (!fs.existsSync(openapiPath)) {
  console.log('Generating openapi.json...');
  execSync('pnpm run openapi:generate', {
    cwd: rootDir,
    stdio: 'inherit',
    env: { ...process.env, OPENAPI_OUTPUT: openapiPath },
  });
}

if (!fs.existsSync(openapiPath)) {
  console.error('openapi.json not found at', openapiPath);
  process.exit(1);
}

fs.mkdirSync(outputDir, { recursive: true });

const generators = [
  { name: 'typescript-fetch', out: 'typescript-fetch' },
  { name: 'python', out: 'python' },
];

for (const g of generators) {
  const outPath = path.join(outputDir, g.out);
  console.log(`Generating ${g.name} SDK into ${outPath}...`);
  const result = spawnSync(
    'npx',
    [
      '@openapitools/openapi-generator-cli',
      'generate',
      '-i', openapiPath,
      '-g', g.name,
      '-o', outPath,
      '--additional-properties=supportsES6=true',
    ],
    { cwd: rootDir, stdio: 'inherit', shell: true },
  );
  if (result.status !== 0) {
    console.warn(`${g.name} generator failed (non-fatal). Install with: npx @openapitools/openapi-generator-cli version-manager set 7`);
  }
}

console.log('SDK generation done. Output:', outputDir);
