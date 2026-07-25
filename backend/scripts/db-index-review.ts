#!/usr/bin/env ts-node
/**
 * Database Index Review Script
 *
 * Analyzes the current index usage, identifies unused indexes,
 * missing indexes, and provides optimization recommendations.
 *
 * Usage:
 *   ts-node -r tsconfig-paths/register scripts/db-index-review.ts
 *
 * Requires:
 *   - PostgreSQL with pg_stat_statements enabled
 *   - pg_stat_user_indexes access
 */

import 'reflect-metadata';
import { AppDataSource } from '../src/database/data-source';

interface IndexInfo {
  schemaname: string;
  tablename: string;
  indexname: string;
  index_scans: number;
  tuples_read: number;
  tuples_fetched: number;
  index_size: string;
  index_size_bytes: number;
}

interface UnusedIndex {
  tablename: string;
  indexname: string;
  index_scans: number;
  index_size: string;
  recommendation: string;
}

interface MissingIndex {
  table: string;
  columns: string;
  estimated_selectivity: string;
  reason: string;
}

const WARN_NO_SCANS = 10; // Index has been scanned fewer than this many times
const WARN_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

async function reviewIndexes(showAll = false): Promise<void> {
  await AppDataSource.initialize();
  console.log('Connected to database:', AppDataSource.options.database);
  console.log('');

  try {
    // 1. Get index usage statistics
    console.log('=== INDEX USAGE STATISTICS ===\n');

    const indexes: IndexInfo[] = await AppDataSource.query(`
      SELECT
        schemaname,
        tablename,
        indexname,
        idx_scan as index_scans,
        idx_tup_read as tuples_read,
        idx_tup_fetch as tuples_fetched,
        pg_size_pretty(pg_relation_size(indexrelid)) as index_size,
        pg_relation_size(indexrelid) as index_size_bytes
      FROM pg_stat_user_indexes
      WHERE schemaname = 'public'
      ORDER BY idx_scan ASC
    `);

    if (showAll) {
      console.log('All Indexes (sorted by scan count):\n');
      const sortedByScan = [...indexes].sort(
        (a, b) => b.index_scans - a.index_scans,
      );
      for (const idx of sortedByScan) {
        console.log(
          `  ${idx.tablename}.${idx.indexname}: ${idx.index_scans} scans, ${idx.index_size}, ${idx.tuples_read} read`,
        );
      }
      console.log('');
    }

    // 2. Identify unused/rarely used indexes
    console.log('=== POTENTIALLY UNUSED INDEXES ===\n');
    const unused: UnusedIndex[] = [];

    for (const idx of indexes) {
      if (
        idx.index_scans <= WARN_NO_SCANS &&
        idx.index_size_bytes > WARN_SIZE_BYTES
      ) {
        unused.push({
          tablename: idx.tablename,
          indexname: idx.indexname,
          index_scans: idx.index_scans,
          index_size: idx.index_size,
          recommendation:
            idx.index_scans === 0
              ? '⚠️  UNUSED - Consider dropping (no scans recorded)'
              : `⚠️  RARELY USED - Only ${idx.index_scans} scans, ${idx.index_size}`,
        });
      }
    }

    if (unused.length === 0) {
      console.log('  ✓ No unused indexes detected.\n');
    } else {
      for (const ui of unused) {
        console.log(`  ${ui.recommendation}`);
        console.log(`    Table: ${ui.tablename}, Index: ${ui.indexname}`);
        console.log(`    Size: ${ui.index_size}, Scans: ${ui.index_scans}`);
        console.log('');
      }
    }

    // 3. Check for duplicate indexes
    console.log('=== POTENTIALLY DUPLICATE INDEXES ===\n');

    const tableIndexMap = new Map<string, string[]>();
    for (const idx of indexes) {
      const key = idx.tablename;
      if (!tableIndexMap.has(key)) {
        tableIndexMap.set(key, []);
      }
      tableIndexMap.get(key)!.push(idx.indexname);
    }

    // Simple heuristic: index names containing the same table column prefix
    let duplicateFound = false;
    for (const [table, idxNames] of tableIndexMap) {
      if (idxNames.length < 2) continue;
      for (let i = 0; i < idxNames.length; i++) {
        for (let j = i + 1; j < idxNames.length; j++) {
          const a = idxNames[i].toLowerCase().replace(/^idx_/, '');
          const b = idxNames[j].toLowerCase().replace(/^idx_/, '');
          if (a.includes(b) || b.includes(a)) {
            if (a !== b) {
              console.log(`  ⚠️  Table "${table}" may have duplicate indexes:`);
              console.log(`    - ${idxNames[i]}`);
              console.log(`    - ${idxNames[j]}`);
              console.log('');
              duplicateFound = true;
            }
          }
        }
      }
    }

    if (!duplicateFound) {
      console.log('  ✓ No obvious duplicate indexes detected.\n');
    }

    // 4. Check index size vs table size
    console.log('=== INDEX SIZE ANALYSIS ===\n');
    const tableSizes: Array<{
      tablename: string;
      table_size: string;
      indexes_size: string;
      index_ratio: number;
    }> = await AppDataSource.query(`
      SELECT
        t.tablename,
        pg_size_pretty(pg_relation_size((quote_ident(t.schemaname)||'.'||quote_ident(t.tablename))::regclass)) AS table_size,
        (
          SELECT pg_size_pretty(COALESCE(SUM(pg_relation_size(indexrelid)), 0))
          FROM pg_stat_user_indexes i
          WHERE i.schemaname = t.schemaname AND i.tablename = t.tablename
        ) AS indexes_size,
        CASE
          WHEN pg_relation_size((quote_ident(t.schemaname)||'.'||quote_ident(t.tablename))::regclass) > 0
          THEN ROUND(
            (
              SELECT COALESCE(SUM(pg_relation_size(indexrelid)), 0)::numeric
              FROM pg_stat_user_indexes i
              WHERE i.schemaname = t.schemaname AND i.tablename = t.tablename
            ) / pg_relation_size((quote_ident(t.schemaname)||'.'||quote_ident(t.tablename))::regclass) * 100,
            1
          )
          ELSE 0
        END AS index_ratio
      FROM pg_stat_user_tables t
      WHERE t.schemaname = 'public'
      ORDER BY index_ratio DESC
    `);

    for (const ts of tableSizes) {
      const flag = ts.index_ratio > 150 ? '⚠️ ' : '  ';
      console.log(
        `  ${flag}${ts.tablename}: table=${ts.table_size}, indexes=${ts.indexes_size} (${ts.index_ratio}%)`,
      );
    }

    // 5. Recommendations summary
    console.log('\n=== RECOMMENDATIONS ===\n');
    if (unused.length > 0) {
      console.log('  Unused indexes to consider dropping:');
      for (const ui of unused) {
        console.log(
          `    DROP INDEX IF EXISTS "${ui.indexname}";  -- ${ui.index_size}, 0 scans`,
        );
      }
      console.log('');
    }

    const highRatioTables = tableSizes.filter((ts) => ts.index_ratio > 150);
    if (highRatioTables.length > 0) {
      console.log('  Tables with high index-to-table ratio:');
      for (const t of highRatioTables) {
        console.log(
          `    ${t.tablename}: ${t.index_ratio}% (table=${t.table_size}, indexes=${t.indexes_size})`,
        );
      }
      console.log('');
    }

    console.log('  Best Practices:');
    console.log('  1. Index columns used in WHERE, JOIN, ORDER BY clauses');
    console.log(
      '  2. Use composite indexes for query patterns with multiple conditions',
    );
    console.log(
      '  3. Avoid over-indexing on frequently updated tables (write overhead)',
    );
    console.log(
      '  4. Monitor pg_stat_statements for sequential scans on large tables',
    );
    console.log('  5. Consider partial indexes for common filtered queries');
    console.log(
      '  6. Use covering indexes (INCLUDE columns) for index-only scans',
    );
    console.log('');
  } catch (error) {
    console.error('Index review failed:', error);
    process.exit(1);
  } finally {
    await AppDataSource.destroy();
  }
}

const args = process.argv.slice(2);
const showAll = args.includes('--all') || args.includes('-a');

reviewIndexes(showAll)
  .then(() => {
    console.log('Index review complete.');
  })
  .catch((err) => {
    console.error('Index review failed:', err);
    process.exit(1);
  });
