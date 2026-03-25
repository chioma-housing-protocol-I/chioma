#!/usr/bin/env node
/**
 * Verification script: ensure all Next.js Image components have descriptive
 * alt text.
 * Scans .tsx, .jsx, .ts, .js in frontend (excluding node_modules, .next).
 * Exits with code 1 if any violations are found.
 */

const fs = require('fs');
const path = require('path');

const FRONTEND_DIR = path.join(__dirname, '..');
const EXTENSIONS = ['.tsx', '.jsx', '.ts', '.js'];
const IGNORE_DIRS = ['node_modules', '.next', 'out', 'build'];

const GENERIC_ALT_VALUES = new Set([
  'user',
  'image',
  'photo',
  'picture',
  'img',
  'avatar',
  'icon',
  'logo',
]);

function getAllFiles(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const ent of entries) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (!IGNORE_DIRS.includes(ent.name)) {
        getAllFiles(full, fileList);
      }
    } else if (EXTENSIONS.includes(path.extname(ent.name))) {
      fileList.push(full);
    }
  }
  return fileList;
}

function hasImageImport(content) {
  return (
    /import\s+(\w+,\s*)?Image\s+from\s+['"]next\/image['"]/.test(content) ||
    /import\s+Image\s+from\s+['"]next\/image['"]/.test(content)
  );
}

function findImageUsages(content, filePath) {
  const violations = [];

  // Match <Image ... /> or <Image ...> (we look for alt in the opening tag)
  const imageTagRegex = /<Image\s([^>]*?)(?:\/>|>)/gs;
  let match;

  while ((match = imageTagRegex.exec(content)) !== null) {
    const tagContent = match[1];
    const startPos = match.index;
    const lineNum = content.slice(0, startPos).split(/\r?\n/).length;

    // Check for alt prop: alt="..." or alt={"..."} or alt={expression}
    const altMatch = tagContent.match(
      /alt\s*=\s*\{([^}]+)\}|alt\s*=\s*["']([^"']*)["']/s,
    );
    if (!altMatch) {
      violations.push({
        file: filePath,
        line: lineNum,
        message: 'Missing alt prop on Image component',
        suggestion:
          'Add an alt prop that describes the image (e.g. alt="Description of image")',
      });
      continue;
    }

    // alt is dynamic: alt={expression} -> consider valid
    if (altMatch[1] !== undefined && altMatch[2] === undefined) {
      const expr = altMatch[1].trim();
      if (expr.length === 0) {
        violations.push({
          file: filePath,
          line: lineNum,
          message: 'Empty alt expression',
          suggestion: 'Provide a descriptive string or variable for alt',
        });
      }
      continue;
    }

    // alt is string literal
    const altValue = (altMatch[2] || '').trim();
    if (altValue.length === 0) {
      violations.push({
        file: filePath,
        line: lineNum,
        message: 'Empty alt text (use alt="" only for decorative images)',
        suggestion:
          'Use descriptive text or alt="" if image is purely decorative',
      });
      continue;
    }

    const altLower = altValue.toLowerCase();
    const singleWordGeneric =
      GENERIC_ALT_VALUES.has(altLower) || GENERIC_ALT_VALUES.has(altValue);
    const tooShort = altValue.length <= 2;
    const isGeneric = singleWordGeneric || tooShort;

    if (isGeneric && altValue.length < 15) {
      violations.push({
        file: filePath,
        line: lineNum,
        message: `Alt text may be too generic: "${altValue}"`,
        suggestion:
          'Use a more descriptive alt (e.g. "Sarah Jenks profile avatar")',
      });
    }
  }

  return violations;
}

function main() {
  const files = getAllFiles(FRONTEND_DIR);
  const allViolations = [];

  for (const filePath of files) {
    const content = fs.readFileSync(filePath, 'utf8');
    if (!hasImageImport(content)) continue;

    const violations = findImageUsages(
      content,
      path.relative(FRONTEND_DIR, filePath),
    );
    allViolations.push(...violations);
  }

  if (allViolations.length === 0) {
    console.log('✓ All Image components have descriptive alt text.');
    process.exit(0);
  }

  console.error('\nAlt text verification failed:\n');
  for (const v of allViolations) {
    console.error(`  ${v.file}:${v.line}`);
    console.error(`    ${v.message}`);
    console.error(`    ${v.suggestion}\n`);
  }
  console.error(`Total: ${allViolations.length} violation(s).\n`);
  process.exit(1);
}

main();
