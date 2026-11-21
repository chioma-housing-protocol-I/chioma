import {
  Injectable,
  Logger,
  OnModuleDestroy,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface Waiter {
  enqueuedAt: number;
  resolve: (release: () => void) => void;
  reject: (error: Error) => void;
  timer?: NodeJS.Timeout;
}

export interface DatabaseBackpressureSnapshot {
  enabled: boolean;
  active: number;
  queued: number;
  maxConcurrent: number;
  maxQueue: number;
  queueTimeoutMs: number;
  totalAdmitted: number;
  totalRejected: number;
  totalTimedOut: number;
}

/**
 * Application-level backpressure for database pool exhaustion.
 *
 * Requests wait in a bounded FIFO queue when concurrent DB work reaches the
 * configured limit. Waiting is bounded by a timeout; when the queue is full
 * or the wait times out the request is rejected with 503 so the service fails
 * fast instead of piling up unbounded work against an exhausted pool.
 */
@Injectable()
export class DatabaseBackpressureService implements OnModuleDestroy {
  private readonly logger = new Logger(DatabaseBackpressureService.name);
  private readonly enabled: boolean;
  private readonly maxConcurrent: number;
  private readonly maxQueue: number;
  private readonly queueTimeoutMs: number;

  private active = 0;
  private readonly queue: Waiter[] = [];
  private totalAdmitted = 0;
  private totalRejected = 0;
  private totalTimedOut = 0;

  constructor(private readonly configService: ConfigService) {
    this.enabled =
      this.configService.get<string>('DB_POOL_BACKPRESSURE_ENABLED', 'true') !==
      'false';
    this.maxConcurrent = this.parsePositiveInt(
      'DB_POOL_BACKPRESSURE_MAX_CONCURRENT',
      this.parsePositiveInt('DB_POOL_MAX', 20),
    );
    this.maxQueue = this.parsePositiveInt('DB_POOL_BACKPRESSURE_MAX_QUEUE', 100);
    this.queueTimeoutMs = this.parsePositiveInt(
      'DB_POOL_BACKPRESSURE_QUEUE_TIMEOUT_MS',
      this.parsePositiveInt('DB_POOL_CONNECTION_TIMEOUT', 2000),
    );

    this.logger.log(
      `Database backpressure ${this.enabled ? 'enabled' : 'disabled'} (maxConcurrent=${this.maxConcurrent}, maxQueue=${this.maxQueue}, queueTimeoutMs=${this.queueTimeoutMs})`,
    );
  }

  onModuleDestroy(): void {
    const error = new ServiceUnavailableException(
      'Database backpressure queue closed during shutdown',
    );
    while (this.queue.length > 0) {
      const waiter = this.queue.shift();
      if (!waiter) {
        continue;
      }
      if (waiter.timer) {
        clearTimeout(waiter.timer);
      }
      waiter.reject(error);
    }
  }

  async run<T>(operation: () => Promise<T>): Promise<T> {
    if (!this.enabled) {
      return operation();
    }

    const release = await this.acquire();
    try {
      return await operation();
    } finally {
      release();
    }
  }

  getSnapshot(): DatabaseBackpressureSnapshot {
    return {
      enabled: this.enabled,
      active: this.active,
      queued: this.queue.length,
      maxConcurrent: this.maxConcurrent,
      maxQueue: this.maxQueue,
      queueTimeoutMs: this.queueTimeoutMs,
      totalAdmitted: this.totalAdmitted,
      totalRejected: this.totalRejected,
      totalTimedOut: this.totalTimedOut,
    };
  }

  private acquire(): Promise<() => void> {
    if (this.active < this.maxConcurrent) {
      this.active++;
      this.totalAdmitted++;
      return Promise.resolve(this.createRelease());
    }

    if (this.queue.length >= this.maxQueue) {
      this.totalRejected++;
      this.logPoolUsage('rejected', 'queue_full');
      throw new ServiceUnavailableException({
        statusCode: 503,
        error: 'Service Unavailable',
        message:
          'Database pool is exhausted and the backpressure queue is full',
        code: 'DB_POOL_EXHAUSTED',
      });
    }

    return new Promise<() => void>((resolve, reject) => {
      const waiter: Waiter = {
        enqueuedAt: Date.now(),
        resolve,
        reject,
      };

      waiter.timer = setTimeout(() => {
        const index = this.queue.indexOf(waiter);
        if (index >= 0) {
          this.queue.splice(index, 1);
        }
        this.totalTimedOut++;
        this.logPoolUsage('timeout', 'queue_timeout');
        reject(
          new ServiceUnavailableException({
            statusCode: 503,
            error: 'Service Unavailable',
            message:
              'Timed out waiting for database capacity due to pool exhaustion',
            code: 'DB_POOL_QUEUE_TIMEOUT',
          }),
        );
      }, this.queueTimeoutMs);

      this.queue.push(waiter);
      this.logPoolUsage('queued', 'waiting_for_capacity');
    });
  }

  private createRelease(): () => void {
    let released = false;
    return () => {
      if (released) {
        return;
      }
      released = true;

      const next = this.queue.shift();
      if (next) {
        if (next.timer) {
          clearTimeout(next.timer);
        }
        this.totalAdmitted++;
        next.resolve(this.createRelease());
        return;
      }

      this.active = Math.max(0, this.active - 1);
    };
  }

  private logPoolUsage(event: string, reason: string): void {
    const snapshot = this.getSnapshot();
    const utilizationPercent =
      snapshot.maxConcurrent > 0
        ? Math.round((snapshot.active / snapshot.maxConcurrent) * 100)
        : 0;
    const message = `Database pool backpressure ${event}: reason=${reason} active=${snapshot.active}/${snapshot.maxConcurrent} queued=${snapshot.queued}/${snapshot.maxQueue} utilization=${utilizationPercent}% rejected=${snapshot.totalRejected} timedOut=${snapshot.totalTimedOut}`;

    if (event === 'queued') {
      this.logger.warn(message);
      return;
    }

    this.logger.error(message);
  }

  private parsePositiveInt(key: string, fallback: number): number {
    const raw = this.configService.get<string>(key);
    const parsed = raw === undefined ? Number.NaN : Number.parseInt(raw, 10);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
    return fallback;
  }
}
