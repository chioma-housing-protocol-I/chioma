/**
 * Advanced migration runner: run migrations with optional rollback on failure
 * and integrity verification. Use for production-grade zero-downtime deployments.
 *
 * Usage:
 *   ts-node -r tsconfig-paths/register src/database/migration-runner.ts run
 *   ts-node -r tsconfig-paths/register src/database/migration-runner.ts revert
 */

import { AppDataSource } from './data-source';

const MIGRATIONS_TABLE = 'migrations';

async function ensureMigrationsTableExists(): Promise<boolean> {
  const qr = AppDataSource.createQueryRunner();
  try {
    await qr.query(
      `SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1`,
      [MIGRATIONS_TABLE],
    );
    const rows = await qr.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1`,
      [MIGRATIONS_TABLE],
    );
    return Array.isArray(rows) && rows.length > 0;
  } finally {
    await qr.release();
  }
}

async function getPendingMigrations(): Promise<string[]> {
  const executed = await AppDataSource.query(
    `SELECT name FROM migrations ORDER BY id`,
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

/**
 * Run pending migrations. On failure, reverts the last executed migration.
 */
export async function runMigrationsWithRollback(): Promise<{
  success: boolean;
  run: number;
  reverted: boolean;
  error?: string;
}> {
  let run = 0;
  let reverted = false;
  try {
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

    await AppDataSource.runMigrations({ transaction: 'each' });
    run = pending.length;
    return { success: true, run, reverted: false };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Migration run failed:', message);
    try {
      await AppDataSource.undoLastMigration();
      reverted = true;
      console.error('Reverted last migration.');
    } catch (revertErr) {
      const revertMsg =
        revertErr instanceof Error ? revertErr.message : String(revertErr);
      console.error('Rollback failed:', revertMsg);
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
  }
}

/**
 * Revert the last executed migration.
 */
export async function revertLastMigration(): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    await AppDataSource.undoLastMigration();
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: message };
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
    await AppDataSource.query(`SELECT COUNT(1) FROM migrations`);
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: message };
  }
}

async function main(): Promise<void> {
  const command = process.argv[2] || 'run';
  await AppDataSource.initialize().catch((err) => {
    console.error('DataSource init failed:', err);
    process.exit(1);
  });

  try {
    if (command === 'run') {
      const result = await runMigrationsWithRollback();
      if (!result.success) {
        console.error('Migration run failed.', result.error);
        process.exit(1);
      }
      console.log(
        `Migrations run: ${result.run}, reverted: ${result.reverted}`,
      );
      const verification = await verifyAfterMigrations();
      if (!verification.ok) {
        console.error(
          'Post-migration verification failed:',
          verification.error,
        );
        process.exit(1);
      }
      console.log('Verification passed.');
      return;
    }

    if (command === 'revert') {
      const result = await revertLastMigration();
      if (!result.success) {
        console.error('Revert failed:', result.error);
        process.exit(1);
      }
      console.log('Last migration reverted.');
      return;
    }

    console.error('Usage: migration-runner.ts run | revert');
    process.exit(1);
  } finally {
    await AppDataSource.destroy();
  }
}

if (require.main === module) {
  void main();
}
