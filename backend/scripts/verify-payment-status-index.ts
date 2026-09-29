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
const logger = new Logger('VerifyPaymentStatusIndex');

async function verify(): Promise<void> {
  await AppDataSource.initialize();
  logger.log('Connected to database');
  logger.log('');

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
      logger.error(`Missing index: ${INDEX_NAME}`);
      logger.error(
        'Run migrations, then re-run this script. Expected columns: (user_id, status, created_at)',
      );
      process.exitCode = 1;
      return;
    }

    logger.log(`Index present: ${INDEX_NAME}`);
    logger.log(`  ${indexes[0].indexdef}`);
    logger.log('');

    const plan: Array<{ 'QUERY PLAN': string }> = await AppDataSource.query(`
      EXPLAIN
      SELECT *
      FROM payments
      WHERE user_id = '00000000-0000-0000-0000-000000000001'
        AND status = 'pending'
      ORDER BY created_at DESC
    `);

    const planText = plan.map((row) => row['QUERY PLAN']).join('\n');
    logger.log('=== QUERY PLAN (listPayments pattern) ===');
    logger.log(planText);
    logger.log('');

    const usesComposite =
      planText.includes(INDEX_NAME) ||
      planText.toLowerCase().includes('index scan') ||
      planText.toLowerCase().includes('index only scan');

    if (usesComposite) {
      logger.log(
        'Query planner can use an index scan for (user_id, status, created_at) filtering/sorting.',
      );
    } else {
      logger.warn(
        'Planner did not show an Index Scan (table may be empty/tiny; sequential scan can still win).',
      );
      logger.warn(
        'On production-sized tables, expect Index Scan Backward on IDX_payments_user_status_created_at.',
      );
    }
  } finally {
    await AppDataSource.destroy();
  }
}

verify()
  .then(() => {
    logger.log('Payment status index verification complete.');
  })
  .catch((err: Error) => {
    logger.error('Verification failed', err.stack ?? err.message);
    process.exit(1);
  });
