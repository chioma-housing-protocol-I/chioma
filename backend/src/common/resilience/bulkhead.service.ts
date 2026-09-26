import { Injectable, Logger } from '@nestjs/common';
import {
  BulkheadMetrics,
  BulkheadOptions,
  DEFAULT_BULKHEAD_OPTIONS,
} from './resilience.types';
import { BulkheadCapacityExceededError } from './resilience.errors';

interface Waiter {
  resolve: () => void;
}

interface Compartment {
  options: BulkheadOptions;
  active: number;
  queue: Waiter[];
  totalExecuted: number;
  totalRejected: number;
}

/**
 * Bulkhead pattern for service isolation.
 *
 * Each named "compartment" gets an isolated pool of concurrency. A slow or
 * failing dependency can only saturate its own compartment, so it cannot
 * exhaust the resources other parts of the system depend on. When a
 * compartment is fully busy and its waiting queue is full, further calls are
 * rejected immediately with {@link BulkheadCapacityExceededError} rather than
 * piling up unbounded work.
 */
@Injectable()
export class BulkheadService {
  private readonly logger = new Logger(BulkheadService.name);
  private readonly compartments = new Map<string, Compartment>();

  /**
   * Define (or redefine) the limits for a compartment. Calling this is
   * optional — an unconfigured compartment is created lazily with
   * {@link DEFAULT_BULKHEAD_OPTIONS}.
   */
  configure(name: string, options: Partial<BulkheadOptions> = {}): void {
    const merged: BulkheadOptions = { ...DEFAULT_BULKHEAD_OPTIONS, ...options };
    if (merged.maxConcurrent < 1) {
      throw new Error('Bulkhead maxConcurrent must be at least 1');
    }
    if (merged.maxQueue < 0) {
      throw new Error('Bulkhead maxQueue cannot be negative');
    }

    const existing = this.compartments.get(name);
    if (existing) {
      existing.options = merged;
    } else {
      this.compartments.set(name, {
        options: merged,
        active: 0,
        queue: [],
        totalExecuted: 0,
        totalRejected: 0,
      });
    }
  }

  /**
   * Run `fn` inside the named compartment, respecting its concurrency limit.
   *
   * - If a slot is free, the call runs immediately.
   * - If the compartment is full but the queue has room, the call waits for a
   *   slot to free up.
   * - If both the active slots and the queue are full, the call is rejected
   *   with {@link BulkheadCapacityExceededError}.
   */
  async execute<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const compartment = this.getOrCreate(name);

    // The capacity check and the synchronous `active++` below run without an
    // intervening await, so they are atomic with respect to other callers.
    if (compartment.active >= compartment.options.maxConcurrent) {
      if (compartment.queue.length >= compartment.options.maxQueue) {
        compartment.totalRejected++;
        this.logger.warn(
          `[${name}] Bulkhead rejected: ${compartment.active} active, ${compartment.queue.length} queued`,
        );
        throw new BulkheadCapacityExceededError(
          name,
          compartment.options.maxConcurrent,
          compartment.options.maxQueue,
        );
      }

      await new Promise<void>((resolve) => {
        compartment.queue.push({ resolve });
      });
    }

    compartment.active++;
    try {
      return await fn();
    } finally {
      compartment.active--;
      compartment.totalExecuted++;
      const next = compartment.queue.shift();
      if (next) {
        next.resolve();
      }
    }
  }

  /** Returns a snapshot of the named compartment, or `undefined` if unknown. */
  getMetrics(name: string): BulkheadMetrics | undefined {
    const compartment = this.compartments.get(name);
    if (!compartment) {
      return undefined;
    }
    return this.toMetrics(name, compartment);
  }

  /** Returns a snapshot of every known compartment. */
  getAllMetrics(): BulkheadMetrics[] {
    return Array.from(this.compartments.entries()).map(([name, compartment]) =>
      this.toMetrics(name, compartment),
    );
  }

  private getOrCreate(name: string): Compartment {
    let compartment = this.compartments.get(name);
    if (!compartment) {
      compartment = {
        options: { ...DEFAULT_BULKHEAD_OPTIONS },
        active: 0,
        queue: [],
        totalExecuted: 0,
        totalRejected: 0,
      };
      this.compartments.set(name, compartment);
    }
    return compartment;
  }

  private toMetrics(name: string, compartment: Compartment): BulkheadMetrics {
    return {
      name,
      active: compartment.active,
      queued: compartment.queue.length,
      maxConcurrent: compartment.options.maxConcurrent,
      maxQueue: compartment.options.maxQueue,
      totalExecuted: compartment.totalExecuted,
      totalRejected: compartment.totalRejected,
    };
  }
}
