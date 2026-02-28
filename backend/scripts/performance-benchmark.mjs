#!/usr/bin/env node
/**
 * Performance benchmark for critical API endpoints.
 * Requires server running at BASE_URL (default http://localhost:5000).
 * Usage: node scripts/performance-benchmark.mjs [BASE_URL]
 * Exit code: 0 if all thresholds pass, 1 otherwise.
 */
import autocannon from 'autocannon';

const BASE_URL = process.env.BASE_URL || process.argv[2] || 'http://localhost:5000';

const ENDPOINTS = [
  { path: '/health', method: 'GET', name: 'Health' },
  { path: '/health/detailed', method: 'GET', name: 'Health detailed' },
  { path: '/security.txt', method: 'GET', name: 'Security.txt' },
  { path: '/api/docs-json', method: 'GET', name: 'OpenAPI spec' },
];

// ms - fail if p99 exceeds this
const THRESHOLD_P99_MS = 2000;
const DURATION_SEC = 3;
const CONNECTIONS = 5;

function runOne({ path, method, name }) {
  const url = `${BASE_URL.replace(/\/$/, '')}${path}`;
  return new Promise((resolve, reject) => {
    autocannon(
      {
        url,
        method,
        duration: DURATION_SEC,
        connections: CONNECTIONS,
      },
      (err, result) => {
        if (err) return reject(err);
        resolve({ name, result, path });
      },
    );
  });
}

async function main() {
  console.log(`Benchmarking ${BASE_URL} (${DURATION_SEC}s per endpoint)\n`);
  let failed = false;
  for (const ep of ENDPOINTS) {
    try {
      const { name, result } = await runOne(ep);
      const p99 = result.latency?.p99 ?? result.latency?.p999 ?? 0;
      const requests = result.requests?.total ?? 0;
      const ok = p99 <= THRESHOLD_P99_MS;
      if (!ok) failed = true;
      console.log(
        `${name}: ${requests} req, p99=${p99}ms ${ok ? '✓' : '✗ (exceeds ' + THRESHOLD_P99_MS + 'ms)'}`,
      );
    } catch (e) {
      console.error(`${ep.name} (${ep.path}): ${e.message}`);
      failed = true;
    }
  }
  process.exit(failed ? 1 : 0);
}

main();
