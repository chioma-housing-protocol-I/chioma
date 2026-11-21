import {
  connectionsToWarm,
  startPoolWarmUp,
  warmConnectionPool,
} from './pool-warmer';

describe('database pool warm-up (#2184)', () => {
  it('warms 50% of the configured maximum, rounded up and capped', () => {
    expect(connectionsToWarm(20)).toBe(10);
    expect(connectionsToWarm(3)).toBe(2);
    expect(connectionsToWarm(1)).toBe(1);
    expect(connectionsToWarm(0)).toBe(0);
    expect(connectionsToWarm(20, 2)).toBe(20);
  });

  it('starts all warm-up queries concurrently without blocking', async () => {
    const resolvers: Array<() => void> = [];
    let started = 0;
    const query = jest.fn(
      () =>
        new Promise<void>((resolve) => {
          started += 1;
          resolvers.push(resolve);
        }),
    );

    const pending = warmConnectionPool(query, { maxConnections: 20 });
    expect(started).toBe(10);
    expect(query).toHaveBeenCalledTimes(10);
    expect(query).toHaveBeenCalledWith('SELECT 1');

    resolvers.forEach((resolve) => resolve());
    const result = await pending;

    expect(result).toEqual(
      expect.objectContaining({ attempted: 10, warmed: 10, failed: 0 }),
    );
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('reports failures without rejecting the bootstrap', async () => {
    const query = jest.fn((_sql: string) =>
      Promise.reject(new Error('pool exhausted')),
    );

    const result = await warmConnectionPool(query, { maxConnections: 8 });

    expect(result.attempted).toBe(4);
    expect(result.warmed).toBe(0);
    expect(result.failed).toBe(4);
  });

  it('bounds a hung warm-up query with a timeout', async () => {
    const query = jest.fn(() => new Promise<void>(() => undefined));

    const result = await warmConnectionPool(query, {
      maxConnections: 2,
      timeoutMs: 5,
    });

    expect(result.attempted).toBe(1);
    expect(result.failed).toBe(1);
    expect(result.warmed).toBe(0);
  });

  it('returns immediately from the fire-and-forget starter', () => {
    const startedAt = Date.now();
    const cancel = startPoolWarmUp(
      jest.fn(() => new Promise<void>(() => undefined)),
      { maxConnections: 4, timeoutMs: 5 },
      { log: jest.fn(), warn: jest.fn() } as never,
    );

    expect(Date.now() - startedAt).toBeLessThan(50);
    expect(typeof cancel).toBe('function');
    cancel();
  });
});
