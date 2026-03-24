import {
  runConsistencyChecks,
  type ConsistencyResult,
} from './consistency-checker';
import { AppDataSource } from './data-source';

jest.mock('./data-source', () => ({
  AppDataSource: {
    initialize: jest.fn(),
    query: jest.fn(),
    destroy: jest.fn(),
  },
}));

const mockedDataSource = AppDataSource as jest.Mocked<typeof AppDataSource>;

describe('ConsistencyChecker', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns a structured result when checks run', async () => {
    mockedDataSource.initialize.mockResolvedValue(mockedDataSource);
    mockedDataSource.query.mockImplementation(
      async (sql: string, params?: unknown[]) => {
        if (sql.includes('information_schema.tables')) {
          return [{ table_name: params?.[0] ?? 'table' }];
        }
        if (sql.includes('SELECT COUNT(1) AS count FROM migrations')) {
          return [{ count: '3' }];
        }
        return [];
      },
    );
    mockedDataSource.destroy.mockResolvedValue(undefined);

    const result: ConsistencyResult = await runConsistencyChecks();

    expect(result.ok).toBe(true);
    expect(Array.isArray(result.checks)).toBe(true);
    expect(result.checks.length).toBeGreaterThan(0);
    result.checks.forEach((c) => {
      expect(c).toHaveProperty('name');
      expect(c).toHaveProperty('passed');
    });
    expect(mockedDataSource.destroy).toHaveBeenCalledTimes(1);
  });

  it('returns error message when initialization fails', async () => {
    mockedDataSource.initialize.mockRejectedValue(
      new Error('Connection failed'),
    );

    const result = await runConsistencyChecks();

    expect(result.ok).toBe(false);
    expect(result.checks).toEqual([]);
    expect(result.error).toContain('DataSource init failed: Connection failed');
    expect(mockedDataSource.destroy).not.toHaveBeenCalled();
  });
});
