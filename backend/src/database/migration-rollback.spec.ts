/**
 * Database migration rollback tests.
 *
 * Verifies that migrations can be reverted sequentially (all the way down)
 * and re-applied cleanly without leaving inconsistent state. Uses a mocked
 * DataSource so it runs in CI without a live database.
 */

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
    migrations: [{ name: 'M1' }, { name: 'M2' }, { name: 'M3' }, { name: 'M4' }],
  },
}));

import {
  revertLastMigration,
  runMigrationsWithRollback,
  verifyAfterMigrations,
} from './migration-runner';
import { AppDataSource } from './data-source';

type DataSourceMock = {
  query: jest.Mock;
  runMigrations: jest.Mock;
  undoLastMigration: jest.Mock;
  createQueryRunner: jest.Mock;
  migrations: { name: string }[];
};
const ds = AppDataSource as unknown as DataSourceMock;

const buildQueryRunner = (overrides: Record<string, jest.Mock> = {}) => ({
  connect: jest.fn(),
  startTransaction: jest.fn(),
  commitTransaction: jest.fn(),
  rollbackTransaction: jest.fn(),
  release: jest.fn(),
  query: jest.fn().mockImplementation((sql: string) => {
    if (sql.includes('CREATE TABLE IF NOT EXISTS')) return Promise.resolve([]);
    if (sql.includes('INSERT INTO')) return Promise.resolve([{ id: 1 }]);
    if (sql.includes('DELETE FROM')) return Promise.resolve([]);
    return Promise.resolve([]);
  }),
  ...overrides,
});

describe('database migration rollback', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    ds.migrations = [{ name: 'M1' }, { name: 'M2' }, { name: 'M3' }, { name: 'M4' }];
    ds.createQueryRunner.mockImplementation(() => buildQueryRunner());
    ds.runMigrations.mockResolvedValue([{ name: 'M4' }]);
    ds.undoLastMigration.mockResolvedValue({ name: 'M4' });
    ds.query.mockImplementation((sql: string) => {
      if (sql.includes('information_schema.tables')) return Promise.resolve([{ 1: 1 }]);
      if (sql.includes('SELECT COUNT')) return Promise.resolve([{ cnt: '4' }]);
      if (sql.includes('SELECT name FROM')) {
        return Promise.resolve([{ name: 'M1' }, { name: 'M2' }, { name: 'M3' }, { name: 'M4' }]);
      }
      return Promise.resolve([]);
    });
  });

  it('rolls back every applied migration cleanly one by one', async () => {
    let applied = ['M1', 'M2', 'M3', 'M4'];
    ds.undoLastMigration.mockImplementation(async () => {
      const reverted = applied[applied.length - 1];
      applied = applied.slice(0, -1);
      return { name: reverted };
    });

    for (let i = 0; i < 4; i++) {
      const result = await revertLastMigration();
      expect(result.success).toBe(true);
    }

    expect(ds.undoLastMigration).toHaveBeenCalledTimes(4);
    expect(applied).toEqual([]);
  });

  it('re-applies migrations after a full rollback with integrity verification', async () => {
    // start from fully reverted state
    let applied: string[] = [];
    ds.query.mockImplementation((sql: string) => {
      if (sql.includes('information_schema.tables')) return Promise.resolve([{ 1: 1 }]);
      if (sql.includes('SELECT COUNT')) return Promise.resolve([{ cnt: String(applied.length) }]);
      if (sql.includes('SELECT name FROM')) {
        return Promise.resolve(applied.map((name) => ({ name })));
      }
      return Promise.resolve([]);
    });
    ds.runMigrations.mockImplementation(async () => {
      const pending = ds.migrations.map((m) => m.name).filter((n) => !applied.includes(n));
      applied = [...applied, ...pending];
      return pending.map((name) => ({ name }));
    });

    const runResult = await runMigrationsWithRollback();
    expect(runResult.success).toBe(true);
    expect(runResult.reverted).toBe(false);
    expect(applied).toEqual(['M1', 'M2', 'M3', 'M4']);

    const verification = await verifyAfterMigrations();
    expect(verification.ok).toBe(true);
  });

  it('auto-reverts on failure leaving no partially-applied state beyond safe revert', async () => {
    let applied = ['M1', 'M2', 'M3'];
    ds.query.mockImplementation((sql: string) => {
      if (sql.includes('information_schema.tables')) return Promise.resolve([{ 1: 1 }]);
      if (sql.includes('SELECT COUNT')) return Promise.resolve([{ cnt: String(applied.length) }]);
      if (sql.includes('SELECT name FROM')) {
        return Promise.resolve(applied.map((name) => ({ name })));
      }
      return Promise.resolve([]);
    });
    ds.runMigrations.mockRejectedValueOnce(new Error('boom during M4'));
    ds.undoLastMigration.mockImplementation(async () => {
      applied = applied.slice(0, -1);
      return { name: 'M3' };
    });

    const result = await runMigrationsWithRollback();
    expect(result.success).toBe(false);
    expect(result.reverted).toBe(true);
    expect(ds.undoLastMigration).toHaveBeenCalledTimes(1);
  });
});
