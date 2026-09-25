#!/usr/bin/env node
/**
 * check-bundle-size.js
 *
 * Reads the Next.js build output and enforces per-route JS size budgets
 * defined in `bundle-budgets.json`.
 *
 * Exit codes:
 *   0 — all routes within budget (warnings possible)
 *   1 — one or more routes exceeded maxKB hard limit
 *
 * Usage:
 *   node scripts/check-bundle-size.js
 *   pnpm run size:check
 */

'use strict';

const fs = require('fs');
const path = require('path');

// ─── Config ──────────────────────────────────────────────────────────────────

const ROOT = path.resolve(__dirname, '..');
const BUILD_DIR = path.join(ROOT, '.next');
const BUDGETS_FILE = path.join(ROOT, 'bundle-budgets.json');
const IS_CI =
  process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

function toKB(bytes) {
  return bytes / 1024;
}

function pad(str, len) {
  return String(str).padEnd(len, ' ');
}

function statusLabel(sizeKB, budget) {
  if (sizeKB > budget.maxKB) return 'FAIL ✗';
  if (sizeKB > budget.warnKB) return 'WARN ⚠';
  return 'PASS ✓';
}

function statusColor(label) {
  if (label.startsWith('FAIL')) return '\x1b[31m';
  if (label.startsWith('WARN')) return '\x1b[33m';
  return '\x1b[32m';
}

function formatDelta(currentKB, baselineKB) {
  if (typeof baselineKB !== 'number') return 'n/a';
  const delta = currentKB - baselineKB;
  const sign = delta > 0 ? '+' : '';
  return `${sign}${delta.toFixed(1)}`;
}

const RESET = '\x1b[0m';

// ─── Build Manifest Parsing ───────────────────────────────────────────────────
//
// Next.js 16 (Turbopack, the default `next build` mode) no longer emits
// `app-build-manifest.json`. Per-route first-load JS is now reported in
// `.next/diagnostics/route-bundle-stats.json`, as a flat list of
// `{ route, firstLoadChunkPaths }` entries — but `firstLoadChunkPaths`
// includes every chunk needed for that route's first load, shared
// framework/vendor chunks included, so it can't be used as-is for a
// route-specific budget (it would double-count the shared baseline into
// every route). A chunk that appears in literally every route's first load
// is treated as "shared"; everything else is that route's own weight.

function loadRouteBundleStats() {
  const statsPath = path.join(
    BUILD_DIR,
    'diagnostics',
    'route-bundle-stats.json',
  );
  const stats = readJson(statsPath);
  return Array.isArray(stats) ? stats : null;
}

function classifyChunks(routeStats) {
  const chunkRouteCount = new Map();
  for (const { firstLoadChunkPaths } of routeStats) {
    for (const chunk of firstLoadChunkPaths || []) {
      chunkRouteCount.set(chunk, (chunkRouteCount.get(chunk) || 0) + 1);
    }
  }

  const totalRoutes = routeStats.length;
  const sharedChunks = new Set(
    [...chunkRouteCount.entries()]
      .filter(([, count]) => count === totalRoutes)
      .map(([chunk]) => chunk),
  );

  return sharedChunks;
}

function chunkSizeBytes(chunkPath) {
  try {
    return fs.statSync(path.join(ROOT, chunkPath)).size;
  } catch {
    return 0;
  }
}

function collectRouteChunks(routeStats, sharedChunks) {
  let totalStaticBytes = 0;
  for (const chunk of sharedChunks) {
    totalStaticBytes += chunkSizeBytes(chunk);
  }
  return { totalStaticBytes };
}

function getRouteSizeBytes(routeKey, routeStats, sharedChunks) {
  const entry = routeStats.find((r) => r.route === routeKey);
  if (!entry) return 0;

  let sizeBytes = 0;
  const seen = new Set();
  for (const chunk of entry.firstLoadChunkPaths || []) {
    if (seen.has(chunk) || sharedChunks.has(chunk)) continue;
    seen.add(chunk);
    sizeBytes += chunkSizeBytes(chunk);
  }
  return sizeBytes;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

function main() {
  if (!fs.existsSync(BUILD_DIR)) {
    const message =
      '⚠ .next/ directory not found. Run `pnpm run build` before checking bundle sizes.';
    if (IS_CI) {
      console.error(`\x1b[31m✗ ${message}\x1b[0m`);
      process.exit(1);
    }
    console.warn(`\x1b[33m${message}\x1b[0m`);
    process.exit(0);
  }

  const budgetConfig = readJson(BUDGETS_FILE);
  if (!budgetConfig || !budgetConfig.routes) {
    console.error(
      `\x1b[31m✗ Could not read budgets from ${BUDGETS_FILE}\x1b[0m`,
    );
    process.exit(1);
  }

  const budgets = budgetConfig.routes;
  const baselines = budgetConfig.baseline || {};

  const routeStats = loadRouteBundleStats();
  if (!routeStats) {
    const message =
      '⚠ .next/diagnostics/route-bundle-stats.json not found. Run `pnpm run build` (Turbopack) before checking bundle sizes.';
    if (IS_CI) {
      console.error(`\x1b[31m✗ ${message}\x1b[0m`);
      process.exit(1);
    }
    console.warn(`\x1b[33m${message}\x1b[0m`);
    process.exit(0);
  }

  const sharedChunks = classifyChunks(routeStats);
  const { totalStaticBytes } = collectRouteChunks(routeStats, sharedChunks);

  const COL = {
    route: 22,
    size: 12,
    delta: 12,
    budget: 10,
    warn: 10,
    status: 10,
  };
  const header =
    pad('Route', COL.route) +
    pad('Size (KB)', COL.size) +
    pad('Δ (KB)', COL.delta) +
    pad('Max (KB)', COL.budget) +
    pad('Warn (KB)', COL.warn) +
    pad('Status', COL.status);
  const divider = '─'.repeat(header.length);

  console.log('\n\x1b[1m📦 Bundle Size Report\x1b[0m');
  console.log(divider);
  console.log(header);
  console.log(divider);

  let failed = false;
  let warned = false;
  const results = [];
  const deltaSummary = [];

  for (const [routeKey, budget] of Object.entries(budgets)) {
    let sizeKB = 0;
    if (routeKey === 'shared-chunks') {
      sizeKB = toKB(totalStaticBytes);
    } else {
      const bytes = getRouteSizeBytes(routeKey, routeStats, sharedChunks);
      if (bytes > 0) {
        sizeKB = toKB(bytes);
      } else {
        // Fallback for empty/missing routes if strictly requested, but we'll report 0 to highlight they are missing.
        sizeKB = 0;
      }
    }

    const baselineKB = baselines[routeKey];
    const delta = formatDelta(sizeKB, baselineKB);
    const label = sizeKB === 0 ? 'MISSING' : statusLabel(sizeKB, budget);

    if (label.startsWith('FAIL')) failed = true;
    if (label.startsWith('WARN')) warned = true;

    results.push({ routeKey, sizeKB, baselineKB, delta, budget, label });

    if (typeof baselineKB === 'number' && sizeKB > 0) {
      deltaSummary.push({
        routeKey,
        sizeKB,
        baselineKB,
        deltaKB: sizeKB - baselineKB,
      });
    }
  }

  results.sort((a, b) => {
    const order = { MISSING: 0, 'FAIL ✗': 1, 'WARN ⚠': 2, 'PASS ✓': 3 };
    return (order[a.label] ?? 4) - (order[b.label] ?? 4);
  });

  for (const { routeKey, sizeKB, delta, budget, label } of results) {
    const color = label === 'MISSING' ? '\x1b[31m' : statusColor(label);
    console.log(
      pad(routeKey, COL.route) +
        pad(sizeKB > 0 ? sizeKB.toFixed(1) : 'N/A', COL.size) +
        pad(delta, COL.delta) +
        pad(budget.maxKB, COL.budget) +
        pad(budget.warnKB, COL.warn) +
        `${color}${pad(label, COL.status)}${RESET}`,
    );
  }

  console.log(divider);

  if (deltaSummary.length > 0) {
    console.log('\n\x1b[1mΔ Size Delta vs Baseline\x1b[0m');
    for (const item of deltaSummary.sort(
      (a, b) => Math.abs(b.deltaKB) - Math.abs(a.deltaKB),
    )) {
      const sign = item.deltaKB > 0 ? '+' : '';
      const deltaColor =
        item.deltaKB > 0 ? '\x1b[31m' : item.deltaKB < 0 ? '\x1b[32m' : '';
      console.log(
        `  ${pad(item.routeKey, COL.route)} ${item.sizeKB.toFixed(1)} KB (baseline ${item.baselineKB} KB) ${deltaColor}${sign}${item.deltaKB.toFixed(1)} KB${RESET}`,
      );
    }
    console.log('');
  }

  if (failed) {
    console.log(
      '\n\x1b[31m✗ BUDGET EXCEEDED — one or more routes are over their hard limit (maxKB).\x1b[0m',
    );
    console.log(
      '  To fix: optimize imports, add dynamic imports, or update bundle-budgets.json.\n',
    );
    process.exit(1);
  }

  if (warned) {
    console.log(
      '\n\x1b[33m⚠ Budget warnings — some routes are approaching their limit.\x1b[0m',
    );
    console.log('  Consider optimizing before they become failures.\n');
    process.exit(0);
  }

  console.log('\n\x1b[32m✓ All routes within budget.\x1b[0m\n');
  process.exit(0);
}

if (require.main === module) {
  main();
}

module.exports = {
  classifyChunks,
  getRouteSizeBytes,
  statusLabel,
};
