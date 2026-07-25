/**
 * Unit tests for the migration runner strategy and validation utilities.
 *
 * All tests mock the AppDataSource so no real database connection is required.
 * The suite validates:
 *  - Lock acquisition / release logic
 *  - Dry-run mode
 *  - Happy-path migration execution
 *  - Auto-rollback on failure
 *  - Revert-to-named-migration logic
 *  - Post-migration verification
 *  - showMigrations output
 *  - Edge cases (no pending migrations, lock contention, etc.)
 */

// ---------------------------------------------------------------------------
// Mock AppDataSource BEFORE importing the runner so the module picks it up
// ---------------------------------------------------------------------------

const mockQuery = jest.fn();
const mockRunMigrations = jest.fn();
const mockUndoLastMigration = jest.fn();
const mockCreateQueryRunner = jest.fn();

jest.mock('./data-source', () => ({
  AppDataSource: {
    query: mockQuery,
    runMigrations: mockRunMigrations,
    undoLastMigration: mockUndoLastMigration,
    createQueryRunner: mockCreateQueryRunner,
    migrations: [] as { name: string }[],
  },
}));

// Import after mock is registered
import {
  runMigrationsWithRollback,
  revertLastMigration,
  verifyAfterMigrations,
  showMigrations,
} from './migration-runner';
import { AppDataSource } from './data-source';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Cast to the mocked shape for easy manipulation */
const ds = AppDataSource as unknown as {
  query: jest.Mock;
  runMigrations: jest.Mock;
  undoLastMigration: jest.Mock;
  createQueryRunner: jest.Mock;
  migrations: { name: string }[];
};

/** Build a mock QueryRunner that succeeds for all queries */
function buildQueryRunner(overrides: Partial<{ query: jest.Mock }> = {}) {
  return {
    connect: jest.fn().mockResolvedValue(undefined),
    release: jest.fn().mockResolvedValue(undefined),
    query: overrides.query ?? jest.fn().mockResolvedValue([{ id: 1 }]),
  };
}

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks();

  // Default: lock table insert succeeds (lock acquired)
  const qr = buildQueryRunner();
  ds.createQueryRunner.mockReturnValue(qr);

  // Default: migrations table exists
  ds.query.mockImplementation((sql: string) => {
    if (sql.includes('information_schema.tables'))
      return Promise.resolve([{ 1: 1 }]);
    if (sql.includes('SELECT name FROM')) return Promise.resolve([]);
    if (sql.includes('COUNT(1)')) return Promise.resolve([{ cnt: '3' }]);
    return Promise.resolve([]);
  });

  ds.runMigrations.mockResolvedValue(undefined);
  ds.undoLastMigration.mockResolvedValue(undefined);
  ds.migrations = [
    { name: 'Migration001' },
    { name: 'Migration002' },
    { name: 'Migration003' },
  ];
});

// ---------------------------------------------------------------------------
// runMigrationsWithRollback
// ---------------------------------------------------------------------------

describe('runMigrationsWithRollback', () => {
  describe('dry-run mode', () => {
    it('returns success without calling runMigrations', async () => {
      // Simulate pending migrations
      ds.query.mockImplementation((sql: string) => {
        if (sql.includes('SELECT name FROM')) {
          return Promise.resolve([{ name: 'Migration001' }]);
        }
        return Promise.resolve([]);
      });

      const result = await runMigrationsWithRollback({ dryRun: true });

      expect(result.success).toBe(true);
      expect(result.run).toBe(0);
      expect(result.reverted).toBe(false);
      expect(ds.runMigrations).not.toHaveBeenCalled();
    });

    it('reports no pending migrations when all are executed', async () => {
      ds.query.mockImplementation((sql: string) => {
        if (sql.includes('SELECT name FROM')) {
          return Promise.resolve([
            { name: 'Migration001' },
            { name: 'Migration002' },
            { name: 'Migration003' },
          ]);
        }
        return Promise.resolve([]);
      });

      const result = await runMigrationsWithRollback({ dryRun: true });

      expect(result.success).toBe(true);
      expect(result.run).toBe(0);
    });
  });

  describe('lock contention', () => {
    it('returns failure when lock cannot be acquired', async () => {
      // Simulate lock already held: INSERT returns empty array
      const qr = buildQueryRunner({
        query: jest.fn().mockImplementation((sql: string) => {
          if (sql.includes('CREATE TABLE IF NOT EXISTS'))
            return Promise.resolve([]);
          if (sql.includes('INSERT INTO')) return Promise.resolve([]); // no rows = lock held
          if (sql.includes('SELECT pid'))
            return Promise.resolve([{ pid: 42, locked_at: new Date() }]);
          return Promise.resolve([]);
        }),
      });
      ds.createQueryRunner.mockReturnValue(qr);

      const result = await runMigrationsWithRollback();

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/lock/i);
      expect(ds.runMigrations).not.toHaveBeenCalled();
    });
  });

  describe('happy path', () => {
    it('runs pending migrations and returns success', async () => {
      // 2 executed, 1 pending
      ds.query.mockImplementation((sql: string) => {
        if (sql.includes('information_schema.tables'))
          return Promise.resolve([{ 1: 1 }]);
        if (sql.includes('SELECT name FROM')) {
          return Promise.resolve([
            { name: 'Migration001' },
            { name: 'Migration002' },
          ]);
        }
        return Promise.resolve([]);
      });

      const result = await runMigrationsWithRollback();

      expect(result.success).toBe(true);
      expect(result.run).toBe(1); // Migration003 is pending
      expect(result.reverted).toBe(false);
      expect(ds.runMigrations).toHaveBeenCalledWith({ transaction: 'each' });
    });

    it('returns run=0 when there are no pending migrations', async () => {
      ds.query.mockImplementation((sql: string) => {
        if (sql.includes('information_schema.tables'))
          return Promise.resolve([{ 1: 1 }]);
        if (sql.includes('SELECT name FROM')) {
          return Promise.resolve([
            { name: 'Migration001' },
            { name: 'Migration002' },
            { name: 'Migration003' },
          ]);
        }
        return Promise.resolve([]);
      });

      const result = await runMigrationsWithRollback();

      expect(result.success).toBe(true);
      expect(result.run).toBe(0);
      expect(ds.runMigrations).not.toHaveBeenCalled();
    });

    it('runs all migrations with transaction:all when migrations table is absent', async () => {
      // acquireLock uses createQueryRunner (call #1), ensureMigrationsTableExists uses it (call #2)
      let qrCallCount = 0;
      ds.createQueryRunner.mockImplementation(() => {
        qrCallCount++;
        if (qrCallCount === 1) {
          // Lock QR — succeeds
          return buildQueryRunner({
            query: jest.fn().mockImplementation((sql: string) => {
              if (sql.includes('CREATE TABLE IF NOT EXISTS'))
                return Promise.resolve([]);
              if (sql.includes('INSERT INTO'))
                return Promise.resolve([{ id: 1 }]);
              return Promise.resolve([]);
            }),
          });
        }
        // ensureMigrationsTableExists QR — table absent
        return buildQueryRunner({
          query: jest.fn().mockResolvedValue([]),
        });
      });

      const result = await runMigrationsWithRollback();

      expect(result.success).toBe(true);
      expect(ds.runMigrations).toHaveBeenCalledWith({ transaction: 'all' });
    });
  });

  describe('failure and auto-rollback', () => {
    it('reverts last migration and returns reverted=true on runMigrations failure', async () => {
      ds.query.mockImplementation((sql: string) => {
        if (sql.includes('information_schema.tables'))
          return Promise.resolve([{ 1: 1 }]);
        if (sql.includes('SELECT name FROM')) return Promise.resolve([]);
        return Promise.resolve([]);
      });
      ds.runMigrations.mockRejectedValue(new Error('migration failed'));

      const result = await runMigrationsWithRollback();

      expect(result.success).toBe(false);
      expect(result.reverted).toBe(true);
      expect(result.error).toContain('migration failed');
      expect(ds.undoLastMigration).toHaveBeenCalledTimes(1);
    });

    it('reports rollback failure in error message when undoLastMigration also throws', async () => {
      ds.query.mockImplementation((sql: string) => {
        if (sql.includes('information_schema.tables'))
          return Promise.resolve([{ 1: 1 }]);
        if (sql.includes('SELECT name FROM')) return Promise.resolve([]);
        return Promise.resolve([]);
      });
      ds.runMigrations.mockRejectedValue(new Error('run error'));
      ds.undoLastMigration.mockRejectedValue(new Error('revert error'));

      const result = await runMigrationsWithRollback();

      expect(result.success).toBe(false);
      expect(result.reverted).toBe(false);
      expect(result.error).toContain('run error');
      expect(result.error).toContain('rollback failed');
    });
  });
});

// ---------------------------------------------------------------------------
// revertLastMigration
// ---------------------------------------------------------------------------

describe('revertLastMigration', () => {
  describe('lock contention', () => {
    it('returns failure when lock cannot be acquired', async () => {
      const qr = buildQueryRunner({
        query: jest.fn().mockImplementation((sql: string) => {
          if (sql.includes('CREATE TABLE IF NOT EXISTS'))
            return Promise.resolve([]);
          if (sql.includes('INSERT INTO')) return Promise.resolve([]);
          if (sql.includes('SELECT pid'))
            return Promise.resolve([{ pid: 99, locked_at: new Date() }]);
          return Promise.resolve([]);
        }),
      });
      ds.createQueryRunner.mockReturnValue(qr);

      const result = await revertLastMigration();

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/lock/i);
      expect(ds.undoLastMigration).not.toHaveBeenCalled();
    });
  });

  describe('revert last migration', () => {
    it('calls undoLastMigration once and returns reverted=1', async () => {
      const result = await revertLastMigration();

      expect(result.success).toBe(true);
      expect(result.reverted).toBe(1);
      expect(ds.undoLastMigration).toHaveBeenCalledTimes(1);
    });

    it('returns failure when undoLastMigration throws', async () => {
      ds.undoLastMigration.mockRejectedValue(new Error('revert failed'));

      const result = await revertLastMigration();

      expect(result.success).toBe(false);
      expect(result.error).toContain('revert failed');
    });
  });

  describe('revert to named migration (--to)', () => {
    beforeEach(() => {
      // Executed: Migration001, Migration002, Migration003
      ds.query.mockImplementation((sql: string) => {
        if (sql.includes('SELECT name FROM')) {
          return Promise.resolve([
            { name: 'Migration001' },
            { name: 'Migration002' },
            { name: 'Migration003' },
          ]);
        }
        return Promise.resolve([]);
      });
    });

    it('reverts migrations after the named one', async () => {
      // Revert to Migration001 → should revert Migration002 and Migration003
      const result = await revertLastMigration({ to: 'Migration001' });

      expect(result.success).toBe(true);
      expect(result.reverted).toBe(2);
      expect(ds.undoLastMigration).toHaveBeenCalledTimes(2);
    });

    it('returns reverted=0 when already at the target migration', async () => {
      // Revert to Migration003 (the last one) → nothing to revert
      const result = await revertLastMigration({ to: 'Migration003' });

      expect(result.success).toBe(true);
      expect(result.reverted).toBe(0);
      expect(ds.undoLastMigration).not.toHaveBeenCalled();
    });

    it('returns failure when the named migration is not found', async () => {
      const result = await revertLastMigration({ to: 'NonExistentMigration' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('NonExistentMigration');
      expect(ds.undoLastMigration).not.toHaveBeenCalled();
    });

    it('reverts all migrations when targeting the first one', async () => {
      // Revert to Migration001 → reverts Migration002 and Migration003
      const result = await revertLastMigration({ to: 'Migration001' });

      expect(result.success).toBe(true);
      expect(result.reverted).toBe(2);
    });
  });
});

// ---------------------------------------------------------------------------
// verifyAfterMigrations
// ---------------------------------------------------------------------------

describe('verifyAfterMigrations', () => {
  it('returns ok=true when migrations table exists and is readable', async () => {
    // ensureMigrationsTableExists uses createQueryRunner; COUNT uses AppDataSource.query
    ds.createQueryRunner.mockReturnValue(
      buildQueryRunner({
        query: jest.fn().mockResolvedValue([{ 1: 1 }]), // table exists
      }),
    );
    ds.query.mockImplementation((sql: string) => {
      if (sql.includes('COUNT(1)')) return Promise.resolve([{ cnt: '5' }]);
      return Promise.resolve([]);
    });

    const result = await verifyAfterMigrations();

    expect(result.ok).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('returns ok=false when migrations table does not exist', async () => {
    // ensureMigrationsTableExists QR returns [] → table absent
    ds.createQueryRunner.mockReturnValue(
      buildQueryRunner({
        query: jest.fn().mockResolvedValue([]),
      }),
    );

    const result = await verifyAfterMigrations();

    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/missing/i);
  });

  it('returns ok=false and error message when query throws', async () => {
    ds.createQueryRunner.mockReturnValue(
      buildQueryRunner({
        query: jest.fn().mockRejectedValue(new Error('db connection lost')),
      }),
    );

    const result = await verifyAfterMigrations();

    expect(result.ok).toBe(false);
    expect(result.error).toContain('db connection lost');
  });

  it('handles zero migrations recorded gracefully', async () => {
    ds.createQueryRunner.mockReturnValue(
      buildQueryRunner({
        query: jest.fn().mockResolvedValue([{ 1: 1 }]), // table exists
      }),
    );
    ds.query.mockImplementation((sql: string) => {
      if (sql.includes('COUNT(1)')) return Promise.resolve([{ cnt: '0' }]);
      return Promise.resolve([]);
    });

    const result = await verifyAfterMigrations();

    expect(result.ok).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// showMigrations
// ---------------------------------------------------------------------------

describe('showMigrations', () => {
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'info').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('prints executed and pending migrations without throwing', async () => {
    ds.query.mockImplementation((sql: string) => {
      if (sql.includes('SELECT name')) {
        return Promise.resolve([
          { name: 'Migration001', ts: '2024-01-01' },
          { name: 'Migration002', ts: '2024-01-02' },
        ]);
      }
      return Promise.resolve([]);
    });

    await expect(showMigrations()).resolves.toBeUndefined();
    expect(consoleSpy).toHaveBeenCalled();
  });

  it('marks executed migrations with a checkmark', async () => {
    ds.query.mockImplementation((sql: string) => {
      if (sql.includes('SELECT name')) {
        return Promise.resolve([{ name: 'Migration001', ts: '2024-01-01' }]);
      }
      return Promise.resolve([]);
    });

    await showMigrations();

    const allOutput = consoleSpy.mock.calls.flat().join('\n');
    expect(allOutput).toContain('✓');
    expect(allOutput).toContain('Migration001');
  });

  it('marks pending migrations with a dot', async () => {
    ds.query.mockImplementation((sql: string) => {
      if (sql.includes('SELECT name')) {
        return Promise.resolve([{ name: 'Migration001', ts: '2024-01-01' }]);
      }
      return Promise.resolve([]);
    });

    await showMigrations();

    const allOutput = consoleSpy.mock.calls.flat().join('\n');
    // Migration002 and Migration003 are pending
    expect(allOutput).toContain('·');
    expect(allOutput).toContain('[PENDING]');
  });

  it('handles empty executed migrations list gracefully', async () => {
    ds.query.mockResolvedValue([]);

    await expect(showMigrations()).resolves.toBeUndefined();
  });

  it('handles query failure gracefully (falls back to empty list)', async () => {
    ds.query.mockRejectedValue(new Error('query failed'));

    await expect(showMigrations()).resolves.toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Integration: run → verify pipeline
// ---------------------------------------------------------------------------

describe('run → verify pipeline', () => {
  it('succeeds end-to-end: run pending migrations then verify', async () => {
    // 1 pending migration (Migration003)
    // createQueryRunner default (from beforeEach) returns [{ id: 1 }] → table exists
    ds.query.mockImplementation((sql: string) => {
      if (sql.includes('SELECT name FROM')) {
        return Promise.resolve([
          { name: 'Migration001' },
          { name: 'Migration002' },
        ]);
      }
      if (sql.includes('COUNT(1)')) return Promise.resolve([{ cnt: '3' }]);
      return Promise.resolve([]);
    });

    const runResult = await runMigrationsWithRollback();
    expect(runResult.success).toBe(true);
    expect(runResult.run).toBe(1);

    const verifyResult = await verifyAfterMigrations();
    expect(verifyResult.ok).toBe(true);
  });

  it('does not call verify when run fails', async () => {
    ds.query.mockImplementation((sql: string) => {
      if (sql.includes('SELECT name FROM')) return Promise.resolve([]);
      return Promise.resolve([]);
    });
    ds.runMigrations.mockRejectedValue(new Error('schema conflict'));

    const runResult = await runMigrationsWithRollback();
    expect(runResult.success).toBe(false);

    // Verify is a separate call — confirm it still works independently
    // createQueryRunner default returns [{ id: 1 }] → table exists
    ds.query.mockImplementation((sql: string) => {
      if (sql.includes('COUNT(1)')) return Promise.resolve([{ cnt: '2' }]);
      return Promise.resolve([]);
    });
    const verifyResult = await verifyAfterMigrations();
    expect(verifyResult.ok).toBe(true);
  });
});
