import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter } from 'events';

export type CircuitBreakerState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerOptions {
  /** Failure threshold before opening circuit (0-1) */
  failureThreshold?: number;
  /** Success threshold to close circuit from half-open (0-1) */
  successThreshold?: number;
  /** Time in ms to wait before attempting to recover */
  timeout?: number;
  /** Size of the rolling window for tracking metrics */
  windowSize?: number;
  /** Name for logging and identification */
  name?: string;
}

export interface CircuitBreakerMetrics {
  successes: number;
  failures: number;
  rejects: number;
  lastFailureTime?: number;
  state: CircuitBreakerState;
}

/**
 * Circuit Breaker pattern implementation for fault tolerance.
 * Prevents cascading failures by failing fast when a service is degraded.
 *
 * States:
 * - CLOSED: Normal operation, requests pass through
 * - OPEN: Service failing, requests rejected immediately
 * - HALF_OPEN: Testing if service recovered, limited requests allowed
 */
@Injectable()
export class CircuitBreakerService extends EventEmitter {
  private readonly logger = new Logger(CircuitBreakerService.name);
  private breakers = new Map<string, CircuitBreaker>();

  /**
   * Get or create a circuit breaker for the given name
   */
  getBreaker(name: string, options?: CircuitBreakerOptions): CircuitBreaker {
    if (!this.breakers.has(name)) {
      this.breakers.set(
        name,
        new CircuitBreaker(name, options || {}, (event: string, data: any) => {
          this.emit(event, { breaker: name, ...data });
        }),
      );
    }
    return this.breakers.get(name)!;
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(
    name: string,
    fn: () => Promise<T>,
    options?: CircuitBreakerOptions,
  ): Promise<T> {
    const breaker = this.getBreaker(name, options);
    return breaker.execute(fn);
  }

  /**
   * Get metrics for all breakers
   */
  getMetrics(): Record<string, CircuitBreakerMetrics> {
    const metrics: Record<string, CircuitBreakerMetrics> = {};
    this.breakers.forEach((breaker, name) => {
      metrics[name] = breaker.getMetrics();
    });
    return metrics;
  }

  /**
   * Get metrics for a specific breaker
   */
  getMetricsForBreaker(name: string): CircuitBreakerMetrics | null {
    return this.breakers.get(name)?.getMetrics() || null;
  }

  /**
   * Reset a breaker to CLOSED state
   */
  reset(name: string): void {
    const breaker = this.breakers.get(name);
    if (breaker) {
      breaker.reset();
      this.emit('reset', { breaker: name });
    }
  }

  /**
   * Reset all breakers
   */
  resetAll(): void {
    this.breakers.forEach((breaker) => {
      breaker.reset();
    });
    this.emit('resetAll', {});
  }

  /**
   * Clear all breakers
   */
  clear(): void {
    this.breakers.clear();
  }
}

class CircuitBreaker {
  private state: CircuitBreakerState = 'CLOSED';
  private failureCount = 0;
  private successCount = 0;
  private rejectCount = 0;
  private lastFailureTime?: number;
  private recoveryTimer?: NodeJS.Timeout;

  private readonly failureThreshold: number;
  private readonly successThreshold: number;
  private readonly timeout: number;
  private readonly windowSize: number;
  private readonly logger: Logger;

  constructor(
    private readonly name: string,
    options: CircuitBreakerOptions,
    private readonly emitter: (event: string, data: any) => void,
  ) {
    this.failureThreshold = options.failureThreshold ?? 0.5;
    this.successThreshold = options.successThreshold ?? 0.5;
    this.timeout = options.timeout ?? 60_000;
    this.windowSize = options.windowSize ?? 100;
    this.logger = new Logger(`CircuitBreaker[${name}]`);
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      this.rejectCount++;
      this.emitter('request_rejected', {
        state: this.state,
        rejectCount: this.rejectCount,
      });
      throw new CircuitBreakerOpenError(
        this.name,
        `Circuit breaker is OPEN for ${this.name}`,
      );
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.successCount++;

    if (this.state === 'HALF_OPEN') {
      const threshold = Math.max(1, Math.ceil(this.successThreshold));
      if (this.successCount >= threshold) {
        this.close();
      }
    }

    this.emitter('request_success', {
      state: this.state,
      successCount: this.successCount,
    });
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.state === 'CLOSED') {
      const threshold = Math.ceil(this.windowSize * this.failureThreshold);
      if (this.failureCount > threshold) {
        this.open();
      }
    } else if (this.state === 'HALF_OPEN') {
      // Failure in HALF_OPEN state goes back to OPEN
      this.open();
    }

    this.emitter('request_failure', {
      state: this.state,
      failureCount: this.failureCount,
    });
  }

  private open(): void {
    this.state = 'OPEN';
    this.logger.warn(`Circuit breaker OPENED for ${this.name}`);
    this.emitter('state_changed', { from: 'CLOSED', to: 'OPEN' });

    if (this.recoveryTimer) {
      clearTimeout(this.recoveryTimer);
    }

    this.recoveryTimer = setTimeout(() => {
      this.attemptRecovery();
    }, this.timeout);
  }

  private attemptRecovery(): void {
    this.state = 'HALF_OPEN';
    this.successCount = 0;
    this.failureCount = 0;
    this.logger.log(`Circuit breaker HALF_OPEN for ${this.name}, testing...`);
    this.emitter('state_changed', { from: 'OPEN', to: 'HALF_OPEN' });
  }

  private close(): void {
    this.state = 'CLOSED';
    this.successCount = 0;
    this.failureCount = 0;
    this.logger.log(`Circuit breaker CLOSED for ${this.name}`);
    this.emitter('state_changed', { from: 'HALF_OPEN', to: 'CLOSED' });

    if (this.recoveryTimer) {
      clearTimeout(this.recoveryTimer);
    }
  }

  reset(): void {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.successCount = 0;
    this.rejectCount = 0;
    this.lastFailureTime = undefined;
    if (this.recoveryTimer) {
      clearTimeout(this.recoveryTimer);
    }
  }

  getMetrics(): CircuitBreakerMetrics {
    return {
      successes: this.successCount,
      failures: this.failureCount,
      rejects: this.rejectCount,
      lastFailureTime: this.lastFailureTime,
      state: this.state,
    };
  }
}

export class CircuitBreakerOpenError extends Error {
  constructor(
    public readonly breakerName: string,
    message: string,
  ) {
    super(message);
    this.name = 'CircuitBreakerOpenError';
  }
}
