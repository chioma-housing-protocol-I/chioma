import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import {
  HealthIndicator,
  HealthIndicatorResult,
  HealthCheckError,
} from '@nestjs/terminus';
import { ConfigService } from '@nestjs/config';
import { REDIS_CLIENT } from '../../common/lock/redis-client.token';

type RedisMode = 'ioredis' | 'upstash' | 'not-configured';

interface PingableRedis {
  ping(): Promise<unknown>;
}

const DEFAULT_TIMEOUT_MS = 2000;

/**
 * Health indicator for Redis, which backs the cache layer, the Bull queues,
 * distributed locks and rate limiting.
 *
 * Redis is classified as a *degraded* dependency (see `health.constants.ts`):
 * a failure surfaces as `warning` rather than taking the pod out of rotation.
 *
 * Two deployment shapes are supported, matching `AppModule`'s cache wiring:
 * the Upstash REST API (`REDIS_URL` + `REDIS_TOKEN`) and a regular TCP client
 * provided by `LockModule` under the `REDIS_CLIENT` token. When neither is
 * configured — as in `NODE_ENV=test`, where `LockModule` deliberately provides
 * `null` — the check reports `skipped` instead of failing.
 */
@Injectable()
export class RedisHealthIndicator extends HealthIndicator {
  private readonly logger = new Logger(RedisHealthIndicator.name);
  private readonly timeoutMs: number;
  private upstashClient: PingableRedis | null = null;

  constructor(
    private readonly configService: ConfigService,
    @Optional()
    @Inject(REDIS_CLIENT)
    private readonly redisClient: PingableRedis | null = null,
  ) {
    super();
    this.timeoutMs = Number(
      this.configService.get<string | number>(
        'REDIS_HEALTH_TIMEOUT_MS',
        DEFAULT_TIMEOUT_MS,
      ),
    );
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const startTime = Date.now();
    const mode = this.resolveMode();

    if (mode === 'not-configured') {
      return this.getStatus(key, true, {
        status: 'skipped',
        responseTime: 0,
        mode,
        message: 'Redis is not configured in this environment',
      });
    }

    try {
      const client = this.getClient(mode);
      await this.withTimeout(client.ping(), 'Redis PING timed out');

      const responseTime = Date.now() - startTime;

      this.logger.log(`Redis health check passed in ${responseTime}ms`);

      return this.getStatus(key, true, {
        status: 'up',
        responseTime,
        mode,
      });
    } catch (error) {
      const responseTime = Date.now() - startTime;

      this.logger.error('Redis health check failed', error);

      const result = this.getStatus(key, false, {
        status: 'down',
        responseTime,
        mode,
        error: error instanceof Error ? error.message : String(error),
      });

      throw new HealthCheckError('Redis check failed', result);
    }
  }

  private resolveMode(): RedisMode {
    if (this.hasUpstashConfig()) {
      return 'upstash';
    }
    return this.redisClient ? 'ioredis' : 'not-configured';
  }

  private hasUpstashConfig(): boolean {
    return Boolean(
      this.configService.get<string>('REDIS_URL') &&
      this.configService.get<string>('REDIS_TOKEN'),
    );
  }

  private getClient(mode: RedisMode): PingableRedis {
    if (mode === 'upstash') {
      // Created lazily so the REST client is only constructed when Upstash is
      // actually the configured backend.
      this.upstashClient ??= new (require('@upstash/redis').Redis)({
        url: this.configService.get<string>('REDIS_URL'),
        token: this.configService.get<string>('REDIS_TOKEN'),
      }) as PingableRedis;
      return this.upstashClient;
    }

    if (!this.redisClient) {
      throw new Error('Redis client is not available');
    }

    return this.redisClient;
  }

  private async withTimeout<T>(
    operation: Promise<T>,
    timeoutMessage: string,
  ): Promise<T> {
    let timer: NodeJS.Timeout | undefined;

    try {
      return await Promise.race([
        operation,
        new Promise<never>((_resolve, reject) => {
          timer = setTimeout(
            () => reject(new Error(timeoutMessage)),
            this.timeoutMs,
          );
        }),
      ]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }
}
