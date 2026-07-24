import { DataSource } from 'typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
const envPath = path.resolve(
  process.cwd(),
  process.env.NODE_ENV === 'test' ? '.env.test' : '.env.development',
);
dotenv.config({ path: envPath });

async function runPerformanceReport() {
  console.log('Generating Database Performance Report...');
  console.log('------------------------------------------');

  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'chioma_db',
    namingStrategy: new SnakeNamingStrategy(),
    synchronize: false,
    logging: false,
  });

  try {
    await dataSource.initialize();
    console.log('Connected to the database successfully.\n');

    // 1. Check Slow Queries
    console.log('--- Top 10 Slowest Queries ---');
    try {
      const slowQueries = await dataSource.query(`
        SELECT
            substring(query for 100) as query_preview,
            calls,
            round(total_exec_time::numeric, 2) as total_time_ms,
            round(mean_exec_time::numeric, 2) as mean_time_ms
        FROM pg_stat_statements
        WHERE query NOT LIKE '%pg_stat%'
        ORDER BY total_exec_time DESC
        LIMIT 10;
      `);
      if (slowQueries.length === 0) {
        console.log(
          'No slow queries recorded or pg_stat_statements just reset.',
        );
      } else {
        console.table(slowQueries);
      }
    } catch (e) {
      console.log(
        'pg_stat_statements not available. Run migration 1900000000000 to enable it.',
      );
      console.log(`Error: ${e.message}\n`);
    }

    // 2. Unused Indexes
    console.log('\n--- Unused Indexes ---');
    const unusedIndexes = await dataSource.query(`
      SELECT
          schemaname || '.' || relname AS table,
          indexrelname AS index,
          pg_size_pretty(pg_relation_size(i.indexrelid)) AS index_size,
          idx_scan AS index_scans
      FROM pg_stat_user_indexes ui
      JOIN pg_index i ON ui.indexrelid = i.indexrelid
      WHERE NOT indisunique AND idx_scan < 50
      ORDER BY pg_relation_size(i.indexrelid) DESC
      LIMIT 10;
    `);
    if (unusedIndexes.length === 0) {
      console.log('No unused indexes found.');
    } else {
      console.table(unusedIndexes);
    }

    // 3. Largest Tables
    console.log('\n--- Largest Tables ---');
    const largestTables = await dataSource.query(`
      SELECT
          relname as table_name,
          pg_size_pretty(pg_total_relation_size(relid)) as total_size,
          pg_size_pretty(pg_relation_size(relid)) as table_size
      FROM pg_stat_user_tables
      WHERE schemaname = 'public'
      ORDER BY pg_total_relation_size(relid) DESC
      LIMIT 10;
    `);
    console.table(largestTables);

    // 4. Cache Hit Ratio
    console.log('\n--- Cache Hit Ratio ---');
    const cacheHitRatio = await dataSource.query(`
      SELECT
        sum(heap_blks_read) as heap_read,
        sum(heap_blks_hit)  as heap_hit,
        round(sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read) + 0.0001) * 100, 2) as ratio
      FROM pg_statio_user_tables;
    `);
    console.table(cacheHitRatio);
  } catch (error) {
    console.error('Failed to generate report:', error);
  } finally {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
    console.log('\nReport generation complete.');
  }
}

runPerformanceReport();
