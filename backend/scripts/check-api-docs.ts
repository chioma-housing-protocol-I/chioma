#!/usr/bin/env ts-node
/**
 * CI gate for issue #1623: fails when a controller endpoint is missing
 * Swagger documentation, or a controller class has no @ApiTags.
 *
 * Checks, per HTTP method decorator (@Get/@Post/@Put/@Patch/@Delete/
 * @Options/@Head/@All) found in `src/**\/*.controller.ts`:
 *   - the controller class carries @ApiTags(...)
 *   - the endpoint (or a decorator between it and the method signature)
 *     carries @ApiOperation(...)
 *   - the endpoint carries at least one response decorator: @ApiResponse,
 *     or one of the @Api*Response shorthands (@ApiOkResponse, etc.)
 *
 * This is a lightweight source scan, not a TS/AST parser — it mirrors how
 * `pnpm run openapi:generate` and Nest's own SwaggerModule read decorators,
 * which is good enough to catch an endpoint added with no Swagger metadata
 * at all (the failure mode issue #1623 was filed against).
 *
 * Usage: pnpm run check:api-docs
 */
import { readFileSync } from 'fs';
import { execSync } from 'child_process';

const HTTP_METHOD_DECORATORS = [
  'Get',
  'Post',
  'Put',
  'Patch',
  'Delete',
  'Options',
  'Head',
  'All',
];

const RESPONSE_DECORATOR_PATTERN = new RegExp(
  [
    '@ApiResponse\\(',
    '@ApiOkResponse',
    '@ApiCreatedResponse',
    '@ApiNoContentResponse',
    '@ApiBadRequestResponse',
    '@ApiUnauthorizedResponse',
    '@ApiForbiddenResponse',
    '@ApiNotFoundResponse',
    '@ApiConflictResponse',
    '@ApiInternalServerErrorResponse',
    '@ApiDefaultResponse',
  ].join('|'),
);

const METHOD_DECORATOR_PATTERN = new RegExp(
  `^(\\s*)@(${HTTP_METHOD_DECORATORS.join('|')})\\(`,
);

interface Violation {
  file: string;
  line: number;
  handler: string;
  missing: string[];
}

const BACKEND_ROOT = `${__dirname}/..`;

function listControllerFiles(): string[] {
  const output = execSync('find src -name "*.controller.ts"', {
    cwd: BACKEND_ROOT,
  })
    .toString()
    .trim();

  return output
    .split('\n')
    .filter(Boolean)
    .filter((f) => !f.endsWith('.spec.ts'));
}

function findMethodEnd(lines: string[], start: number): number {
  let e = start;
  while (
    e < lines.length &&
    !/^\s*(public\s+|private\s+|protected\s+)?(async\s+)?[A-Za-z_$][\w$]*\s*\(/.test(
      lines[e],
    )
  ) {
    if (e > start && METHOD_DECORATOR_PATTERN.test(lines[e])) break;
    e++;
  }
  return e;
}

function findBlockStart(lines: string[], methodDecoratorLine: number): number {
  let b = methodDecoratorLine;
  while (b > 0) {
    const l = lines[b - 1].trim();
    if (l === '' || l === '}' || l.startsWith('constructor')) break;
    b--;
  }
  return b;
}

function checkFile(file: string): Violation[] {
  const src = readFileSync(`${BACKEND_ROOT}/${file}`, 'utf8');
  const lines = src.split('\n');
  const violations: Violation[] = [];

  const hasClassTags = /@ApiTags\(/.test(src);

  for (let i = 0; i < lines.length; i++) {
    if (!METHOD_DECORATOR_PATTERN.test(lines[i])) continue;

    const b = findBlockStart(lines, i);
    const e = findMethodEnd(lines, i);
    const block = lines.slice(b, e + 1).join('\n');

    const handlerMatch = lines[e]?.match(
      /(?:async\s+)?([A-Za-z_$][\w$]*)\s*\(/,
    );
    const handler = handlerMatch ? handlerMatch[1] : '<unknown>';

    const missing: string[] = [];
    if (!hasClassTags) missing.push('@ApiTags (controller class)');
    if (!/@ApiOperation\(/.test(block)) missing.push('@ApiOperation');
    if (!RESPONSE_DECORATOR_PATTERN.test(block)) missing.push('@ApiResponse');

    if (missing.length > 0) {
      violations.push({ file, line: i + 1, handler, missing });
    }
  }

  return violations;
}

function main(): void {
  const files = listControllerFiles();
  const allViolations = files.flatMap(checkFile);

  if (allViolations.length === 0) {
    console.log(
      `✓ API documentation check passed (${files.length} controllers)`,
    );
    return;
  }

  console.error(
    `✗ API documentation check failed: ${allViolations.length} endpoint(s) missing Swagger decorators\n`,
  );

  for (const v of allViolations) {
    console.error(
      `  ${v.file}:${v.line}  ${v.handler}()  missing ${v.missing.join(', ')}`,
    );
  }

  console.error(
    '\nEvery @Get/@Post/@Put/@Patch/@Delete handler needs @ApiOperation and at least one ' +
      '@ApiResponse (or @Api*Response shorthand), and its controller class needs @ApiTags. ' +
      'See docs/api/api-documentation.md.',
  );

  process.exit(1);
}

main();
