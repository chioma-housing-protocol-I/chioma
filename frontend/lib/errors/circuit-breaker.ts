export type CircuitBreakerState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerOptions {
  failureThreshold?: number;
  successThreshold?: number;
  timeout?: number;
  windowSize?: number;
  name?: string;
}

export interface CircuitBreakerMetrics {
  successes: number;
  failures: number;
  rejects: number;
  lastFailureTime?: number;
  state: CircuitBreakerState;
}

export type CircuitBreakerEventType =
  | 'state_changed'
  | 'request_rejected'
  | 'request_success'
  | 'request_failure'
  | 'reset';

export interface CircuitBreakerEvent {
  type: CircuitBreakerEventType;
  breaker: string;
  state: CircuitBreakerState;
  metrics: CircuitBreakerMetrics;
  previousState?: CircuitBreakerState;
}

export type CircuitBreakerListener = (event: CircuitBreakerEvent) => void;

export class CircuitBreakerOpenError extends Error {
  constructor(
    public readonly breakerName: string,
    message: string,
  ) {
    super(message);
    this.name = 'CircuitBreakerOpenError';
  }
}

class CircuitBreakerInstance {
  private state: CircuitBreakerState = 'CLOSED';
  private failureCount = 0;
  private successCount = 0;
  private rejectCount = 0;
  private lastFailureTime?: number;
  private recoveryTimer: ReturnType<typeof setTimeout> | null = null;

  private readonly failureThreshold: number;
  private readonly successThreshold: number;
  private readonly timeout: number;
  private readonly windowSize: number;
  private readonly listeners = new Set<CircuitBreakerListener>();

  constructor(
    private readonly name: string,
    options: CircuitBreakerOptions,
  ) {
    this.failureThreshold = options.failureThreshold ?? 0.5;
    this.successThreshold = options.successThreshold ?? 0.5;
    this.timeout = options.timeout ?? 60_000;
    this.windowSize = options.windowSize ?? 100;
  }

  subscribe(listener: CircuitBreakerListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit(
    type: CircuitBreakerEventType,
    previousState?: CircuitBreakerState,
  ) {
    const event: CircuitBreakerEvent = {
      type,
      breaker: this.name,
      state: this.state,
      metrics: this.getMetrics(),
      previousState,
    };
    this.listeners.forEach((l) => l(event));
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      this.rejectCount++;
      this.emit('request_rejected');
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
      const threshold = Math.ceil(this.windowSize * this.successThreshold);
      if (this.successCount >= threshold) {
        this.close();
      }
    }

    this.emit('request_success');
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.state === 'CLOSED') {
      const threshold = Math.ceil(this.windowSize * this.failureThreshold);
      if (this.failureCount >= threshold) {
        this.open();
      }
    } else if (this.state === 'HALF_OPEN') {
      this.open();
    }

    this.emit('request_failure');
  }

  private open(): void {
    const previousState = this.state;
    this.state = 'OPEN';
    this.emit('state_changed', previousState);

    if (this.recoveryTimer !== null) {
      clearTimeout(this.recoveryTimer);
    }

    this.recoveryTimer = setTimeout(() => {
      this.attemptRecovery();
    }, this.timeout);
  }

  private attemptRecovery(): void {
    const previousState = this.state;
    this.state = 'HALF_OPEN';
    this.successCount = 0;
    this.failureCount = 0;
    this.emit('state_changed', previousState);
  }

  private close(): void {
    const previousState = this.state;
    this.state = 'CLOSED';
    this.successCount = 0;
    this.failureCount = 0;
    this.emit('state_changed', previousState);

    if (this.recoveryTimer !== null) {
      clearTimeout(this.recoveryTimer);
      this.recoveryTimer = null;
    }
  }

  reset(): void {
    const previousState = this.state;
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.successCount = 0;
    this.rejectCount = 0;
    this.lastFailureTime = undefined;
    if (this.recoveryTimer !== null) {
      clearTimeout(this.recoveryTimer);
      this.recoveryTimer = null;
    }
    this.emit('reset', previousState);
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

  getState(): CircuitBreakerState {
    return this.state;
  }

  getName(): string {
    return this.name;
  }
}

export class CircuitBreakerManager {
  private breakers = new Map<string, CircuitBreakerInstance>();
  private listeners = new Set<CircuitBreakerListener>();

  subscribe(listener: CircuitBreakerListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  getBreaker(
    name: string,
    options?: CircuitBreakerOptions,
  ): CircuitBreakerInstance {
    if (!this.breakers.has(name)) {
      const breaker = new CircuitBreakerInstance(name, options ?? {});
      breaker.subscribe((event) => {
        this.listeners.forEach((l) => l(event));
      });
      this.breakers.set(name, breaker);
    }
    return this.breakers.get(name)!;
  }

  async execute<T>(
    name: string,
    fn: () => Promise<T>,
    options?: CircuitBreakerOptions,
  ): Promise<T> {
    const breaker = this.getBreaker(name, options);
    return breaker.execute(fn);
  }

  getMetrics(): Record<string, CircuitBreakerMetrics> {
    const metrics: Record<string, CircuitBreakerMetrics> = {};
    this.breakers.forEach((breaker, name) => {
      metrics[name] = breaker.getMetrics();
    });
    return metrics;
  }

  getMetricsForBreaker(name: string): CircuitBreakerMetrics | null {
    return this.breakers.get(name)?.getMetrics() ?? null;
  }

  reset(name: string): void {
    this.breakers.get(name)?.reset();
  }

  resetAll(): void {
    this.breakers.forEach((breaker) => breaker.reset());
  }

  clear(): void {
    this.breakers.clear();
  }
}

export const globalCircuitBreaker = new CircuitBreakerManager();
