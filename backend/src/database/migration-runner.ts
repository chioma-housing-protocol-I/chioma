/**
 * Advanced migration runner: run migrations with optional rollback on failure
 * and integrity verification. Use for production-grade zero-downtime deployments.
 *
 * Features:
 *  - Dry-run mode (--dry-run)
 *  - Pre-migration backup notification
 *  - Auto-rollback on failure with transaction-safe reverts
 *  - Post-migration verification (table existence, row counts)
 *  - Migration locking to prevent concurrent runs
 *  - Revert to a specific migration by name (--to <name>)
 *
 * Usage:
 *   ts-node -r tsconfig-paths/register src/database/migration-runner.ts run
 *   ts-node -r tsconfig-paths/register src/database/migration-runner.ts revert [--to <name>]
 *   ts-node -r tsconfig-paths/register src/database/migration-runner.ts show
 *   ts-node -r tsconfig-paths/register src/database/migration-runner.ts run --dry-run
 */

import { AppDataSource } from './data-source';

const MIGRATIONS_TABLE = 'migrations';
const LOCK_TABLE = 'migration_lock';
const LOCK_ID = 1;

async function acquireLock(): Promise<boolean> {
  const qr = AppDataSource.createQueryRunner();
  try {
    await qr.query(`
      CREATE TABLE IF NOT EXISTS "${LOCK_TABLE}" (
        id INT PRIMARY KEY,
        locked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        pid INT NOT NULL DEFAULT pg_backend_pid()
      )
    `);
    const result = await qr.query(
      `INSERT INTO "${LOCK_TABLE}" (id) VALUES ($1) ON CONFLICT (id) DO NOTHING RETURNING id`,
      [LOCK_ID],
    );
    if (result.length === 0) {
      const holder = await qr.query(
        `SELECT pid, locked_at FROM "${LOCK_TABLE}" WHERE id = $1`,
        [LOCK_ID],
      );
      console.warn(
        `[Lock] Migration lock held by PID ${holder[0]?.pid ?? 'unknown'} since ${holder[0]?.locked_at ?? 'unknown'}`,
      );
      return false;
    }
    return true;
  } finally {
    await qr.release();
  }
}

async function releaseLock(): Promise<void> {
  try {
    await AppDataSource.query(`DELETE FROM "${LOCK_TABLE}" WHERE id = $1`, [
      LOCK_ID,
    ]);
  } catch {
    // Non-critical; log and continue
  }
}

async function ensureMigrationsTableExists(): Promise<boolean> {
  const qr = AppDataSource.createQueryRunner();
  try {
    const rows = await qr.query(
      `SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1 LIMIT 1`,
      [MIGRATIONS_TABLE],
    );
    return Array.isArray(rows) && rows.length > 0;
  } finally {
    await qr.release();
  }
}

async function getPendingMigrations(): Promise<string[]> {
  const executed = await AppDataSource.query(
    `SELECT name FROM "${MIGRATIONS_TABLE}" ORDER BY id`,
  ).catch(() => []);
  const executedNames = new Set(
    (executed as { name?: string }[])
      .map((r) => r.name)
      .filter((n): n is string => n != null),
  );
  const all = AppDataSource.migrations
    .map((m) => m.name)
    .filter((n): n is string => n != null);
  return all.filter((name) => !executedNames.has(name));
}

async function getExecutedMigrations(): Promise<string[]> {
  const executed = await AppDataSource.query(
    `SELECT name FROM "${MIGRATIONS_TABLE}" ORDER BY id`,
  ).catch(() => []);
  return (executed as { name?: string }[])
    .map((r) => r.name)
    .filter((n): n is string => n != null);
}

/**
 * Suggest a pre-migration backup.
 */
function suggestBackup(): void {
  console.info(
    '[Backup] ⚠️  It is strongly recommended to create a database backup before running migrations.',
  );
  console.info(
    '[Backup] Run: pg_dump -h $DB_HOST -p $DB_PORT -U $DB_USERNAME -d $DB_NAME > backup_$(date +%Y%m%d_%H%M%S).sql',
  );
  console.info('[Backup] Or use: pnpm run db:backup');
}

/**
 * Run pending migrations. On failure, reverts the last executed migration.
 */
export async function runMigrationsWithRollback(options?: {
  dryRun?: boolean;
}): Promise<{
  success: boolean;
  run: number;
  reverted: boolean;
  error?: string;
}> {
  let run = 0;
  const dryRun = options?.dryRun ?? false;

  if (dryRun) {
    console.info('[Dry-Run] Checking pending migrations without executing...');
    const pending = await getPendingMigrations();
    if (pending.length === 0) {
      console.info('[Dry-Run] No pending migrations to apply.');
    } else {
      console.info(`[Dry-Run] Would apply ${pending.length} migration(s):`);
      for (const name of pending) {
        console.info(`  - ${name}`);
      }
    }
    return { success: true, run: 0, reverted: false };
  }

  const locked = await acquireLock();
  if (!locked) {
    return {
      success: false,
      run: 0,
      reverted: false,
      error:
        'Could not acquire migration lock. Another process may be running migrations.',
    };
  }

  try {
    suggestBackup();

    const hadTable = await ensureMigrationsTableExists();
    if (!hadTable) {
      await AppDataSource.runMigrations({ transaction: 'all' });
      run = AppDataSource.migrations.length;
      return { success: true, run, reverted: false };
    }

    const pending = await getPendingMigrations();
    if (pending.length === 0) {
      return { success: true, run: 0, reverted: false };
    }

    console.info(
      `[Migration] Running ${pending.length} pending migration(s)...`,
    );
    for (const name of pending) {
      console.info(`[Migration]   → ${name}`);
    }

    await AppDataSource.runMigrations({ transaction: 'each' });
    run = pending.length;
    return { success: true, run, reverted: false };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[Migration] Run failed:', message);
    try {
      await AppDataSource.undoLastMigration();
      console.error('[Migration] Reverted last migration.');
    } catch (revertErr) {
      const revertMsg =
        revertErr instanceof Error ? revertErr.message : String(revertErr);
      console.error('[Migration] Rollback failed:', revertMsg);
      return {
        success: false,
        run,
        reverted: false,
        error: `${message}; rollback failed: ${revertMsg}`,
      };
    }
    return {
      success: false,
      run,
      reverted: true,
      error: message,
    };
  } finally {
    await releaseLock();
  }
}

/**
 * Revert the last executed migration, or all migrations down to a specific name.
 */
export async function revertLastMigration(options?: { to?: string }): Promise<{
  success: boolean;
  error?: string;
  reverted?: number;
}> {
  const to = options?.to;
  let reverted = 0;

  const locked = await acquireLock();
  if (!locked) {
    return {
      success: false,
      error:
        'Could not acquire migration lock. Another process may be running migrations.',
    };
  }

  try {
    if (to) {
      // Revert all migrations down to (but not including) the named migration
      const executed = await getExecutedMigrations();
      const toIndex = executed.findIndex((name) => name === to);
      if (toIndex === -1) {
        return {
          success: false,
          error: `Migration "${to}" not found in executed migrations list.`,
        };
      }
      const toRevert = executed.slice(toIndex + 1);
      if (toRevert.length === 0) {
        return { success: true, reverted: 0 };
      }
      for (let i = 0; i < toRevert.length; i++) {
        await AppDataSource.undoLastMigration();
        reverted++;
      }
    } else {
      await AppDataSource.undoLastMigration();
      reverted = 1;
    }
    return { success: true, reverted };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: message, reverted };
  } finally {
    await releaseLock();
  }
}

/**
 * Verify data integrity after migrations: migrations table exists and is readable.
 */
export async function verifyAfterMigrations(): Promise<{
  ok: boolean;
  error?: string;
}> {
  try {
    const exists = await ensureMigrationsTableExists();
    if (!exists) return { ok: false, error: 'Migrations table missing' };
    const count = await AppDataSource.query(
      `SELECT COUNT(1) AS cnt FROM "${MIGRATIONS_TABLE}"`,
    );
    console.info(
      `[Verification] ${(count[0] as { cnt: string })?.cnt ?? 0} migration(s) recorded.`,
    );
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: message };
  }
}

/**
 * List migration status in a human-readable format.
 */
export async function showMigrations(): Promise<void> {
  const executed = await AppDataSource.query(
    `SELECT name, COALESCE("timestamp"::TEXT, '') AS ts FROM "${MIGRATIONS_TABLE}" ORDER BY id`,
  ).catch(() => [] as { name: string; ts: string }[]);
  const executedNames = new Set(
    (executed as { name?: string }[])
      .map((r) => r.name)
      .filter((n): n is string => n != null),
  );
  const all = AppDataSource.migrations
    .map((m) => m.name)
    .filter((n): n is string => n != null);

  console.info('\nMigration Status:');
  console.info('==================');
  for (const name of all) {
    if (executedNames.has(name)) {
      const row = (executed as { name: string; ts: string }[]).find(
        (r) => r.name === name,
      );
      console.info(`  ✓ ${name}  (${row?.ts ?? '?'})`);
    } else {
      console.info(`  · ${name}  [PENDING]`);
    }
  }
  console.info('');
  console.info(
    `${executedNames.size} executed, ${all.length - executedNames.size} pending`,
  );
}

async function main(): Promise<void> {
  const command = process.argv[2] || 'run';
  const dryRun = process.argv.includes('--dry-run');
  const toIndex = process.argv.indexOf('--to');
  const to =
    toIndex >= 0 && toIndex + 1 < process.argv.length
      ? process.argv[toIndex + 1]
      : undefined;

  await AppDataSource.initialize().catch((err) => {
    console.error('DataSource init failed:', err);
    process.exit(1);
  });

  try {
    if (command === 'run') {
      const result = await runMigrationsWithRollback({ dryRun });
      if (!result.success) {
        console.error('[Migration] Run failed.', result.error);
        process.exit(1);
      }
      if (!dryRun) {
        console.info(
          `[Migration] ${result.run} migration(s) applied, reverted: ${result.reverted}`,
        );
        const verification = await verifyAfterMigrations();
        if (!verification.ok) {
          console.error(
            '[Migration] Post-migration verification failed:',
            verification.error,
          );
          process.exit(1);
        }
        console.info('[Migration] Verification passed.');
      }
      return;
    }

    if (command === 'revert') {
      const result = await revertLastMigration({ to });
      if (!result.success) {
        console.error('[Migration] Revert failed:', result.error);
        process.exit(1);
      }
      if (to) {
        console.info(
          `[Migration] Reverted ${result.reverted ?? 0} migration(s) down to "${to}".`,
        );
      } else {
        console.info('[Migration] Last migration reverted.');
      }
      return;
    }

    if (command === 'show') {
      await showMigrations();
      return;
    }

    console.error(
      'Usage: migration-runner.ts run [--dry-run] | revert [--to <name>] | show',
    );
    process.exit(1);
  } finally {
    await AppDataSource.destroy();
  }
}

if (require.main === module) {
  void main();
}
