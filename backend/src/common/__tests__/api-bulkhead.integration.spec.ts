/**
 * Integration tests for the API bulkhead pattern (#1150)
 *
 * Covers: thread-pool isolation, resource allocation, timeout enforcement,
 * failure isolation, and metrics collection using BulkheadService.
 */

import { BulkheadService } from '../resilience/bulkhead.service';
import { BulkheadCapacityExceededError } from '../resilience/resilience.errors';

// ── Helpers ──────────────────────────────────────────────────────────────────

function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (r?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label = 'operation',
): Promise<T> {
  let handle: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    handle = setTimeout(
      () => reject(new Error(`Timed out waiting for: ${label}`)),
      ms,
    );
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(handle!);
  }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('API Bulkhead Integration Tests (#1150)', () => {
  let service: BulkheadService;

  beforeEach(() => {
    service = new BulkheadService();
  });

  // ── 1. Thread-pool / compartment isolation ─────────────────────────────────

  describe('Thread Pool Isolation', () => {
    it('isolates compartments so saturation in one does not block another', async () => {
      service.configure('payments', { maxConcurrent: 1, maxQueue: 0 });
      service.configure('profiles', { maxConcurrent: 5, maxQueue: 10 });

      const paymentTask = deferred<string>();

      // Saturate the payments compartment
      const paymentCall = service.execute(
        'payments',
        () => paymentTask.promise,
      );
      await Promise.resolve();

      // profiles compartment must still accept work
      const profileResult = await service.execute(
        'profiles',
        async () => 'profile-ok',
      );
      expect(profileResult).toBe('profile-ok');

      // payments compartment is full — must reject immediately
      await expect(
        service.execute('payments', async () => 'rejected'),
      ).rejects.toBeInstanceOf(BulkheadCapacityExceededError);

      paymentTask.resolve('done');
      await paymentCall;
    });

    it('allows multiple independent compartments to run concurrently', async () => {
      ['svc-a', 'svc-b', 'svc-c'].forEach((name) =>
        service.configure(name, { maxConcurrent: 2, maxQueue: 0 }),
      );

      const results = await Promise.all([
        service.execute('svc-a', async () => 'a'),
        service.execute('svc-b', async () => 'b'),
        service.execute('svc-c', async () => 'c'),
      ]);

      expect(results).toEqual(['a', 'b', 'c']);
    });

    it('creates a new compartment with default settings when not pre-configured', async () => {
      const result = await service.execute('auto-created', async () => 42);
      expect(result).toBe(42);

      const metrics = service.getMetrics('auto-created');
      expect(metrics).toBeDefined();
      expect(metrics!.maxConcurrent).toBeGreaterThan(0);
      expect(metrics!.maxQueue).toBeGreaterThanOrEqual(0);
    });
  });

  // ── 2. Resource allocation ─────────────────────────────────────────────────

  describe('Resource Allocation', () => {
    it('enforces the maxConcurrent limit strictly', async () => {
      service.configure('db-pool', { maxConcurrent: 3, maxQueue: 10 });

      const slots = [deferred<void>(), deferred<void>(), deferred<void>()];
      const calls = slots.map((d) =>
        service.execute('db-pool', () => d.promise),
      );
      await Promise.resolve();

      expect(service.getMetrics('db-pool')!.active).toBe(3);

      // A 4th call must wait in queue — not run immediately
      let fourthCompleted = false;
      const d4 = deferred<void>();
      const fourth = service
        .execute('db-pool', () => d4.promise)
        .then(() => {
          fourthCompleted = true;
        });

      await Promise.resolve();
      expect(service.getMetrics('db-pool')!.active).toBe(3);
      expect(service.getMetrics('db-pool')!.queued).toBe(1);
      expect(fourthCompleted).toBe(false);

      // Release one slot — the queued call should now run
      slots[0].resolve();
      await calls[0];
      await Promise.resolve();
      expect(service.getMetrics('db-pool')!.active).toBe(3);
      expect(service.getMetrics('db-pool')!.queued).toBe(0);

      slots[1].resolve();
      slots[2].resolve();
      d4.resolve();
      await Promise.all([...calls.slice(1), fourth]);
    });

    it('tracks totalExecuted accurately under concurrent load', async () => {
      service.configure('worker', { maxConcurrent: 5, maxQueue: 20 });
      const count = 15;

      await Promise.all(
        Array.from({ length: count }, (_, i) =>
          service.execute('worker', async () => i),
        ),
      );

      expect(service.getMetrics('worker')!.totalExecuted).toBe(count);
    });

    it('rejects when both active and queue slots are exhausted', async () => {
      service.configure('limited', { maxConcurrent: 2, maxQueue: 2 });

      const holders = [
        deferred<void>(),
        deferred<void>(),
        deferred<void>(),
        deferred<void>(),
      ];

      const calls = holders.map((h) =>
        service.execute('limited', () => h.promise),
      );
      await Promise.resolve();

      // 2 active + 2 queued = full
      await expect(
        service.execute('limited', async () => 'overflow'),
      ).rejects.toBeInstanceOf(BulkheadCapacityExceededError);

      // Cleanup
      holders.forEach((h) => h.resolve());
      await Promise.all(calls);
    });

    it('respects an updated configuration for an existing compartment', async () => {
      service.configure('resizable', { maxConcurrent: 1, maxQueue: 0 });

      const d1 = deferred<void>();
      const call1 = service.execute('resizable', () => d1.promise);
      await Promise.resolve();

      // Still limited to 1 — must reject
      await expect(
        service.execute('resizable', async () => 'x'),
      ).rejects.toBeInstanceOf(BulkheadCapacityExceededError);

      // Expand the limit
      service.configure('resizable', { maxConcurrent: 3, maxQueue: 0 });
      const result = await service.execute('resizable', async () => 'fits-now');
      expect(result).toBe('fits-now');

      d1.resolve();
      await call1;
    });
  });

  // ── 3. Timeout enforcement ─────────────────────────────────────────────────

  describe('Timeout Enforcement', () => {
    it('does not block indefinitely when a call times out internally', async () => {
      service.configure('timed', { maxConcurrent: 1, maxQueue: 5 });

      // The call itself enforces an internal timeout via Promise.race
      const timedCall = service.execute('timed', () =>
        Promise.race([
          delay(5000), // Long task
          delay(50).then(() => Promise.reject(new Error('operation-timeout'))),
        ]),
      );

      await expect(timedCall).rejects.toThrow('operation-timeout');

      // Slot must be freed despite the failure
      expect(service.getMetrics('timed')!.active).toBe(0);
    });

    it('queued calls eventually execute when blocked calls timeout', async () => {
      service.configure('queued-timeout', { maxConcurrent: 1, maxQueue: 5 });

      // Slot holder that finishes quickly
      const first = service.execute('queued-timeout', () =>
        delay(20).then(() => 'first'),
      );

      const second = service.execute('queued-timeout', async () => 'second');

      const [r1, r2] = await withTimeout(
        Promise.all([first, second]),
        2000,
        'queued execution',
      );
      expect(r1).toBe('first');
      expect(r2).toBe('second');
    });
  });

  // ── 4. Failure isolation ──────────────────────────────────────────────────

  describe('Failure Isolation', () => {
    it('releases the slot even when the wrapped call throws', async () => {
      service.configure('fault', { maxConcurrent: 2, maxQueue: 0 });

      await expect(
        service.execute('fault', async () => {
          throw new Error('fault injected');
        }),
      ).rejects.toThrow('fault injected');

      expect(service.getMetrics('fault')!.active).toBe(0);

      // Slot should be free for the next call
      const recovery = await service.execute('fault', async () => 'recovered');
      expect(recovery).toBe('recovered');
    });

    it('increments totalExecuted even for failed calls', async () => {
      service.configure('tracked-fail', { maxConcurrent: 5, maxQueue: 0 });

      for (let i = 0; i < 3; i++) {
        try {
          await service.execute('tracked-fail', async () => {
            throw new Error('boom');
          });
        } catch {
          /* expected */
        }
      }

      expect(service.getMetrics('tracked-fail')!.totalExecuted).toBe(3);
    });

    it('does not let a faulted compartment affect a healthy one', async () => {
      service.configure('unstable', { maxConcurrent: 1, maxQueue: 0 });
      service.configure('stable', { maxConcurrent: 1, maxQueue: 0 });

      // Cause repeated failures in "unstable"
      for (let i = 0; i < 5; i++) {
        try {
          await service.execute('unstable', async () => {
            throw new Error('crash');
          });
        } catch {
          /* expected */
        }
      }

      // "stable" must remain fully operational
      const result = await service.execute('stable', async () => 'unaffected');
      expect(result).toBe('unaffected');
    });

    it('tracks totalRejected separately from totalExecuted', async () => {
      service.configure('counting', { maxConcurrent: 1, maxQueue: 0 });

      const d = deferred<void>();
      const holding = service.execute('counting', () => d.promise);
      await Promise.resolve();

      // Should be rejected (not executed)
      try {
        await service.execute('counting', async () => 'overflow');
      } catch {
        /* expected */
      }

      d.resolve();
      await holding;

      const m = service.getMetrics('counting')!;
      expect(m.totalRejected).toBe(1);
      expect(m.totalExecuted).toBe(1); // only the first call
    });
  });

  // ── 5. Metrics collection ──────────────────────────────────────────────────

  describe('Metrics Collection', () => {
    it('returns undefined metrics for an unknown compartment', () => {
      expect(service.getMetrics('nonexistent')).toBeUndefined();
    });

    it('returns a snapshot for a known compartment', async () => {
      service.configure('snapshot', { maxConcurrent: 3, maxQueue: 5 });
      await service.execute('snapshot', async () => 'x');

      const m = service.getMetrics('snapshot')!;
      expect(m.name).toBe('snapshot');
      expect(m.maxConcurrent).toBe(3);
      expect(m.maxQueue).toBe(5);
      expect(m.totalExecuted).toBe(1);
      expect(m.active).toBe(0);
      expect(m.queued).toBe(0);
    });

    it('reports live active and queued counts accurately', async () => {
      service.configure('live', { maxConcurrent: 2, maxQueue: 3 });

      const holders = [deferred<void>(), deferred<void>(), deferred<void>()];
      const calls = holders.map((h) =>
        service.execute('live', () => h.promise),
      );
      await Promise.resolve();

      const m = service.getMetrics('live')!;
      expect(m.active).toBe(2);
      expect(m.queued).toBe(1);

      holders.forEach((h) => h.resolve());
      await Promise.all(calls);

      const after = service.getMetrics('live')!;
      expect(after.active).toBe(0);
      expect(after.queued).toBe(0);
      expect(after.totalExecuted).toBe(3);
    });

    it('getAllMetrics returns an entry for every configured compartment', async () => {
      ['alpha', 'beta', 'gamma'].forEach((name) =>
        service.configure(name, { maxConcurrent: 1, maxQueue: 0 }),
      );

      const all = service.getAllMetrics();
      const names = all.map((m) => m.name).sort();
      expect(names).toEqual(['alpha', 'beta', 'gamma']);
    });

    it('getAllMetrics returns empty array when no compartments exist', () => {
      expect(service.getAllMetrics()).toEqual([]);
    });

    it('reports correct rejection counts under concurrent burst', async () => {
      service.configure('burst', { maxConcurrent: 2, maxQueue: 0 });

      const holders = [deferred<void>(), deferred<void>()];
      const actives = holders.map((h) =>
        service.execute('burst', () => h.promise),
      );
      await Promise.resolve();

      const rejections = await Promise.allSettled(
        Array.from({ length: 5 }, () =>
          service.execute('burst', async () => 'x'),
        ),
      );

      const rejected = rejections.filter((r) => r.status === 'rejected');
      expect(rejected).toHaveLength(5);
      expect(service.getMetrics('burst')!.totalRejected).toBe(5);

      holders.forEach((h) => h.resolve());
      await Promise.all(actives);
    });
  });
});
