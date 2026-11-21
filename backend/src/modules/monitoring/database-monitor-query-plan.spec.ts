import { DatabaseMonitorService } from './database-monitor.service';

describe('DatabaseMonitorService query plans (#2182)', () => {
  const explainRows = [
    {
      'QUERY PLAN': 'Seq Scan on users  (cost=0.00..1500.00 rows=50 width=64)',
    },
    "  Filter: (email = 'alice@example.com')",
  ];

  let dataSource: { query: jest.Mock };
  let performanceMonitor: { recordQueryPlan: jest.Mock };
  let service: DatabaseMonitorService;
  let warn: jest.SpyInstance;

  beforeEach(() => {
    delete process.env.DB_QUERY_PLAN_ANALYZE;
    dataSource = { query: jest.fn().mockResolvedValue(explainRows) };
    performanceMonitor = { recordQueryPlan: jest.fn() };
    service = new DatabaseMonitorService(
      dataSource as never,
      { recordDatabaseQuery: jest.fn() } as never,
      { sendAlert: jest.fn() } as never,
      performanceMonitor as never,
    );
    warn = jest.spyOn(
      (service as unknown as { logger: { warn: () => void } }).logger,
      'warn',
    );
  });

  afterEach(() => {
    delete process.env.DB_QUERY_PLAN_ANALYZE;
    jest.restoreAllMocks();
  });

  it('uses plan-only EXPLAIN for a slow query and highlights sequential scans', async () => {
    const plan = await service.analyzeQueryPlan(
      'users.findAll',
      'SELECT * FROM users WHERE email = $1',
      1500,
      ['alice@example.com'],
    );

    expect(dataSource.query).toHaveBeenCalledTimes(1);
    const statement = dataSource.query.mock.calls[0][0] as string;
    expect(statement.startsWith('EXPLAIN SELECT')).toBe(true);
    expect(statement).not.toContain('ANALYZE');
    expect(plan?.hasSequentialScan).toBe(true);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('Sequential scan detected'),
    );
    expect(JSON.stringify(plan)).not.toContain('alice@example.com');
    expect(performanceMonitor.recordQueryPlan).toHaveBeenCalledWith(plan);
    expect(service.getRecentQueryPlans()).toHaveLength(1);
  });

  it('does not analyze queries below the one second threshold', async () => {
    const plan = await service.analyzeQueryPlan(
      'users.findFast',
      'SELECT 1',
      900,
    );

    expect(plan).toBeNull();
    expect(dataSource.query).not.toHaveBeenCalled();
  });

  it('only runs EXPLAIN ANALYZE when explicitly enabled', async () => {
    process.env.DB_QUERY_PLAN_ANALYZE = 'true';

    await service.analyzeQueryPlan(
      'users.findAll',
      'SELECT * FROM users',
      2000,
    );

    const statement = dataSource.query.mock.calls[0][0] as string;
    expect(statement.startsWith('EXPLAIN ANALYZE SELECT')).toBe(true);
  });

  it('rejects statements containing multiple commands', async () => {
    const plan = await service.analyzeQueryPlan(
      'unsafe',
      'SELECT 1; DROP TABLE users',
      2000,
    );

    expect(plan).toBeNull();
    expect(dataSource.query).not.toHaveBeenCalled();
  });
});
