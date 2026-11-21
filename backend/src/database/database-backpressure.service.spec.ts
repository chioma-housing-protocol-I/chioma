import { ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseBackpressureService } from './database-backpressure.service';

function makeConfig(values: Record<string, string> = {}): ConfigService {
  return {
    get: (key: string, defaultValue?: unknown) => values[key] ?? defaultValue,
  } as unknown as ConfigService;
}

describe('DatabaseBackpressureService', () => {
  it('queues requests and admits them when capacity frees up', async () => {
    const service = new DatabaseBackpressureService(
      makeConfig({
        DB_POOL_BACKPRESSURE_MAX_CONCURRENT: '1',
        DB_POOL_BACKPRESSURE_MAX_QUEUE: '1',
        DB_POOL_BACKPRESSURE_QUEUE_TIMEOUT_MS: '1000',
      }),
    );

    let releaseFirst!: () => void;
    const firstGate = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });

    const first = service.run(async () => {
      await firstGate;
      return 'first';
    });
    const second = service.run(async () => 'second');

    await Promise.resolve();
    expect(service.getSnapshot().queued).toBe(1);

    releaseFirst();

    await expect(first).resolves.toBe('first');
    await expect(second).resolves.toBe('second');
  });

  it('rejects with 503 when the backpressure queue is full', async () => {
    const service = new DatabaseBackpressureService(
      makeConfig({
        DB_POOL_BACKPRESSURE_MAX_CONCURRENT: '1',
        DB_POOL_BACKPRESSURE_MAX_QUEUE: '1',
        DB_POOL_BACKPRESSURE_QUEUE_TIMEOUT_MS: '1000',
      }),
    );

    let releaseFirst!: () => void;
    const firstGate = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });

    const first = service.run(async () => {
      await firstGate;
      return 'first';
    });
    const queued = service.run(async () => 'queued');

    await expect(service.run(async () => 'rejected')).rejects.toMatchObject({
      status: 503,
      response: expect.objectContaining({ code: 'DB_POOL_EXHAUSTED' }),
    });

    releaseFirst();
    await expect(first).resolves.toBe('first');
    await expect(queued).resolves.toBe('queued');
  });

  it('rejects queued requests with 503 on timeout', async () => {
    const service = new DatabaseBackpressureService(
      makeConfig({
        DB_POOL_BACKPRESSURE_MAX_CONCURRENT: '1',
        DB_POOL_BACKPRESSURE_MAX_QUEUE: '1',
        DB_POOL_BACKPRESSURE_QUEUE_TIMEOUT_MS: '10',
      }),
    );

    let releaseFirst!: () => void;
    const firstGate = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });

    const first = service.run(async () => {
      await firstGate;
      return 'first';
    });

    await expect(service.run(async () => 'late')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    await expect(service.run(async () => 'late')).rejects.toMatchObject({
      status: 503,
      response: expect.objectContaining({ code: 'DB_POOL_QUEUE_TIMEOUT' }),
    });

    releaseFirst();
    await expect(first).resolves.toBe('first');
  });
});
