import { BulkheadService } from './bulkhead.service';
import { BulkheadCapacityExceededError } from './resilience.errors';

/** Creates a promise plus its resolver so a test can hold a call "in flight". */
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('BulkheadService', () => {
  let service: BulkheadService;

  beforeEach(() => {
    service = new BulkheadService();
  });

  describe('execute', () => {
    it('runs a call immediately when a slot is free', async () => {
      service.configure('svc', { maxConcurrent: 2, maxQueue: 2 });
      const result = await service.execute('svc', async () => 'ok');
      expect(result).toBe('ok');

      const metrics = service.getMetrics('svc');
      expect(metrics?.active).toBe(0);
      expect(metrics?.totalExecuted).toBe(1);
    });

    it('limits concurrency to maxConcurrent', async () => {
      service.configure('svc', { maxConcurrent: 2, maxQueue: 5 });

      const d1 = deferred<string>();
      const d2 = deferred<string>();
      const d3 = deferred<string>();

      const p1 = service.execute('svc', () => d1.promise);
      const p2 = service.execute('svc', () => d2.promise);
      const p3 = service.execute('svc', () => d3.promise);

      // Let the synchronous scheduling settle.
      await Promise.resolve();

      const metrics = service.getMetrics('svc');
      expect(metrics?.active).toBe(2);
      expect(metrics?.queued).toBe(1);

      // Free a slot; the queued call should now run.
      d1.resolve('a');
      await p1;
      await Promise.resolve();
      expect(service.getMetrics('svc')?.active).toBe(2);
      expect(service.getMetrics('svc')?.queued).toBe(0);

      d2.resolve('b');
      d3.resolve('c');
      await Promise.all([p2, p3]);
      expect(service.getMetrics('svc')?.active).toBe(0);
    });

    it('rejects with BulkheadCapacityExceededError when active and queue are full', async () => {
      service.configure('svc', { maxConcurrent: 1, maxQueue: 1 });

      const d1 = deferred<string>();
      const d2 = deferred<string>();

      const p1 = service.execute('svc', () => d1.promise); // active
      const p2 = service.execute('svc', () => d2.promise); // queued
      await Promise.resolve();

      await expect(
        service.execute('svc', async () => 'overflow'),
      ).rejects.toBeInstanceOf(BulkheadCapacityExceededError);

      expect(service.getMetrics('svc')?.totalRejected).toBe(1);

      // Drain in-flight calls so the test ends cleanly.
      d1.resolve('a');
      await p1;
      d2.resolve('b');
      await p2;
    });

    it('releases a slot even when the call throws', async () => {
      service.configure('svc', { maxConcurrent: 1, maxQueue: 0 });

      await expect(
        service.execute('svc', async () => {
          throw new Error('boom');
        }),
      ).rejects.toThrow('boom');

      const metrics = service.getMetrics('svc');
      expect(metrics?.active).toBe(0);
      expect(metrics?.totalExecuted).toBe(1);
    });

    it('lazily creates an unconfigured compartment with defaults', async () => {
      const result = await service.execute('lazy', async () => 42);
      expect(result).toBe(42);

      const metrics = service.getMetrics('lazy');
      expect(metrics?.maxConcurrent).toBe(10);
      expect(metrics?.maxQueue).toBe(20);
    });

    it('isolates compartments from each other', async () => {
      service.configure('a', { maxConcurrent: 1, maxQueue: 0 });
      service.configure('b', { maxConcurrent: 1, maxQueue: 0 });

      const dA = deferred<string>();
      const pA = service.execute('a', () => dA.promise); // saturates "a"
      await Promise.resolve();

      // "b" still has a free slot despite "a" being full.
      await expect(service.execute('b', async () => 'b-ok')).resolves.toBe(
        'b-ok',
      );

      dA.resolve('a-ok');
      await pA;
    });
  });

  describe('configure', () => {
    it('rejects invalid concurrency limits', () => {
      expect(() => service.configure('svc', { maxConcurrent: 0 })).toThrow();
      expect(() => service.configure('svc', { maxQueue: -1 })).toThrow();
    });

    it('updates limits for an existing compartment', () => {
      service.configure('svc', { maxConcurrent: 2, maxQueue: 2 });
      service.configure('svc', { maxConcurrent: 5, maxQueue: 1 });
      const metrics = service.getMetrics('svc');
      expect(metrics?.maxConcurrent).toBe(5);
      expect(metrics?.maxQueue).toBe(1);
    });
  });

  describe('metrics', () => {
    it('returns undefined for an unknown compartment', () => {
      expect(service.getMetrics('nope')).toBeUndefined();
    });

    it('reports metrics for all compartments', async () => {
      await service.execute('a', async () => 1);
      await service.execute('b', async () => 2);
      const all = service.getAllMetrics();
      expect(all.map((m) => m.name).sort()).toEqual(['a', 'b']);
    });
  });
});
