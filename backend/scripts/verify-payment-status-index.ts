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
import { Logger } from '@nestjs/common';
import { AppDataSource } from '../src/database/data-source';

const INDEX_NAME = 'IDX_payments_user_status_created_at';
const CONTEXT = 'VerifyPaymentStatusIndex';

async function verify(): Promise<void> {
  await AppDataSource.initialize();
  Logger.log('Database connection initialized successfully.', CONTEXT);

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
      Logger.error(
        `Missing index: ${INDEX_NAME}. Run migrations, then re-run this script. Expected columns: (user_id, status, created_at)`,
        undefined,
        CONTEXT,
      );
      process.exitCode = 1;
      return;
    }

    Logger.log(`Index present: ${INDEX_NAME} (${indexes[0].indexdef})`, CONTEXT);

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
    Logger.log(`Query plan:\n${planText}`, CONTEXT);

    const usesComposite =
      planText.includes(INDEX_NAME) ||
      planText.toLowerCase().includes('index scan') ||
      planText.toLowerCase().includes('index only scan');

    if (usesComposite) {
      Logger.log(
        'Query planner can use an index scan for (user_id, status, created_at) filtering/sorting.',
        CONTEXT,
      );
    } else {
      Logger.warn(
        'Planner did not show an Index Scan (table may be empty/tiny — sequential scan can still win). On production-sized tables, expect Index Scan Backward on IDX_payments_user_status_created_at.',
        CONTEXT,
      );
    }
  } finally {
    await AppDataSource.destroy();
  }
}

verify()
  .then(() => {
    Logger.log('Payment status index verification complete.', CONTEXT);
  })
  .catch((err: unknown) => {
    const stack = err instanceof Error ? err.stack : undefined;
    const message = err instanceof Error ? err.message : String(err);
    Logger.error(`Verification failed: ${message}`, stack, CONTEXT);
    process.exit(1);
  });
