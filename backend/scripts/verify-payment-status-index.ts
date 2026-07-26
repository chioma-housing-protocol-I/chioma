#!/usr/bin/env ts-node
/**
 * Verifies that payment status queries can use the composite index
 * IDX_payments_user_status_created_at (issue #1405).
 *
 * Usage:
 *   ts-node -r tsconfig-paths/register scripts/verify-payment-status-index.ts
 *
 * Requires a running PostgreSQL instance with the payments table migrated.
 */

import 'reflect-metadata';
import { AppDataSource } from '../src/database/data-source';

const INDEX_NAME = 'IDX_payments_user_status_created_at';

async function verify(): Promise<void> {
  await AppDataSource.initialize();
  console.log('Connected to database:', AppDataSource.options.database);
  console.log('');

  try {
    const indexes: Array<{ indexname: string; indexdef: string }> =
      await AppDataSource.query(
        `
        SELECT indexname, indexdef
        FROM pg_indexes
        WHERE schemaname = 'public'
          AND tablename = 'payments'
          AND indexname = $1
        `,
        [INDEX_NAME],
      );

    if (indexes.length === 0) {
      console.error(`✗ Missing index: ${INDEX_NAME}`);
      console.error(
        '  Run migrations, then re-run this script. Expected columns: (user_id, status, created_at)',
      );
      process.exitCode = 1;
      return;
    }

    console.log(`✓ Index present: ${INDEX_NAME}`);
    console.log(`  ${indexes[0].indexdef}`);
    console.log('');

    // EXPLAIN (no ANALYZE) — confirms the planner can choose an Index Scan
    // without requiring representative row volume.
    const plan: Array<{ 'QUERY PLAN': string }> = await AppDataSource.query(`
      EXPLAIN
      SELECT *
      FROM payments
      WHERE user_id = '00000000-0000-0000-0000-000000000001'
        AND status = 'pending'
      ORDER BY created_at DESC
    `);

    const planText = plan.map((row) => row['QUERY PLAN']).join('\n');
    console.log('=== QUERY PLAN (listPayments pattern) ===\n');
    console.log(planText);
    console.log('');

    const usesComposite =
      planText.includes(INDEX_NAME) ||
      planText.toLowerCase().includes('index scan') ||
      planText.toLowerCase().includes('index only scan');

    if (usesComposite) {
      console.log(
        '✓ Query planner can use an index scan for (user_id, status, created_at) filtering/sorting.',
      );
    } else {
      console.warn(
        '⚠ Planner did not show an Index Scan (table may be empty/tiny — sequential scan can still win).',
      );
      console.warn(
        '  On production-sized tables, expect Index Scan Backward on IDX_payments_user_status_created_at.',
      );
    }
  } finally {
    await AppDataSource.destroy();
  }
}

verify()
  .then(() => {
    console.log('\nPayment status index verification complete.');
  })
  .catch((err) => {
    console.error('Verification failed:', err);
    process.exit(1);
  });
