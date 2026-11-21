import { createDatabaseConnectionOptions } from './database-config';

describe('database statement timeout configuration (#2185)', () => {
  it('sets a 30 second statement timeout by default', () => {
    const options = createDatabaseConnectionOptions('/app/src', [], {});

    expect((options as any).extra).toMatchObject({
      options: '-c statement_timeout=30000',
      query_timeout: 30_000,
    });
  });

  it('honors an explicit query timeout override', () => {
    const options = createDatabaseConnectionOptions('/app/src', [], {
      DB_QUERY_TIMEOUT_MS: '5000',
    });

    expect((options as any).extra).toMatchObject({
      options: '-c statement_timeout=5000',
      query_timeout: 5_000,
    });
  });

  it('applies the timeout when a database URL is configured', () => {
    const options = createDatabaseConnectionOptions('/app/src', [], {
      DATABASE_URL: 'postgres://user:pass@localhost:5432/db',
    });

    expect((options as any).extra.options).toContain('statement_timeout=30000');
  });
});
