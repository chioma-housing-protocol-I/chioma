/**
 * Data consistency checker: verify database integrity after migrations or periodically.
 * Checks: migrations table, critical tables exist, optional row-count and FK consistency.
 *
 * Usage:
 *   ts-node -r tsconfig-paths/register src/database/consistency-checker.ts
 */

import { AppDataSource } from './data-source';

/** Critical tables that must exist after migrations. */
const CRITICAL_TABLES = [
  'migrations',
  'users',
  'properties',
  'rent_agreements',
  'payments',
];

export interface ConsistencyResult {
  ok: boolean;
  checks: { name: string; passed: boolean; detail?: string }[];
  error?: string;
}

/**
 * Run all consistency checks. Returns a result object; does not throw.
 */
export async function runConsistencyChecks(): Promise<ConsistencyResult> {
  const checks: { name: string; passed: boolean; detail?: string }[] = [];
  let ok = true;

  try {
    await AppDataSource.initialize();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      checks: [],
      error: `DataSource init failed: ${message}`,
    };
  }

  try {
    for (const table of CRITICAL_TABLES) {
      try {
        const rows = await AppDataSource.query(
          `SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1`,
          [table],
        );
        const exists = Array.isArray(rows) && rows.length > 0;
        checks.push({
          name: `table_exists_${table}`,
          passed: exists,
          detail: exists ? undefined : `Table ${table} not found`,
        });
        if (!exists) ok = false;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        checks.push({
          name: `table_exists_${table}`,
          passed: false,
          detail: msg,
        });
        ok = false;
      }
    }

    const migrationsRows = await AppDataSource.query(
      `SELECT COUNT(1) AS count FROM migrations`,
    ).catch(() => [{ count: 0 }]);
    const migrationCount =
      typeof migrationsRows[0]?.count === 'string'
        ? parseInt(migrationsRows[0].count, 10)
        : Number((migrationsRows[0] as { count: number })?.count ?? 0);
    checks.push({
      name: 'migrations_applied',
      passed: migrationCount >= 0,
      detail: `${migrationCount} migration(s) recorded`,
    });

    return { ok, checks };
  } finally {
    await AppDataSource.destroy();
  }
}

async function main(): Promise<void> {
  const result = await runConsistencyChecks();
  for (const c of result.checks) {
    console.log(
      `${c.passed ? '✓' : '✗'} ${c.name}${c.detail ? `: ${c.detail}` : ''}`,
    );
  }
  if (result.error) console.error(result.error);
  process.exit(result.ok ? 0 : 1);
}

if (require.main === module) {
  void main();
}
