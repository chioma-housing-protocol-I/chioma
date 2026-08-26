import { Injectable, Logger, Inject, Optional } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import {
  UserTier,
  EndpointCategory,
  RateLimitResult,
  RateLimitConfig,
} from '../types/rate-limit.types';
import { RATE_LIMIT_CONFIG } from '../config/rate-limit.config';
import { REDIS_CLIENT } from '../../../common/lock/redis-client.token';

/**
 * Atomically increments the counter at KEYS[1] by ARGV[1] and, only on the
 * FIRST increment in the window, sets its expiry to ARGV[2] seconds. A
 * single round trip means concurrent requests across any number of
 * replicas serialize through Redis itself rather than racing on a
 * read-then-write pair, which is what let the effective limit be
 * multiplied by the replica count under the old cacheManager get/set path.
 */
const INCR_AND_EXPIRE_SCRIPT = `
local current = redis.call("INCRBY", KEYS[1], ARGV[1])
if tonumber(current) == tonumber(ARGV[1]) then
  redis.call("EXPIRE", KEYS[1], ARGV[2])
end
return current
`;

@Injectable()
export class RateLimitService {
  private readonly logger = new Logger(RateLimitService.name);

  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    @Optional() @Inject(REDIS_CLIENT) private readonly redis: any,
  ) {}

  async consumePoints(
    identifier: string,
    tier: UserTier,
    category: EndpointCategory,
    points: number = 1,
  ): Promise<RateLimitResult> {
    const config = this.getConfig(tier, category);
    const key = this.buildKey(identifier, category);
    const blockKey = this.buildBlockKey(identifier, category);

    try {
      const isBlocked = await this.cacheManager.get<boolean>(blockKey);
      if (isBlocked) {
        const ttl = await this.getTTL(blockKey);
        return {
          success: false,
          remainingPoints: 0,
          msBeforeNext: ttl * 1000,
          isBlocked: true,
        };
      }

      const consumed = await this.incrementCounter(
        key,
        points,
        config.duration,
      );

      if (consumed > config.points) {
        if (config.blockDuration) {
          await this.cacheManager.set(
            blockKey,
            true,
            config.blockDuration * 1000,
          );
        }

        await this.recordViolation(identifier, category);

        return {
          success: false,
          remainingPoints: 0,
          msBeforeNext: config.duration * 1000,
          isBlocked: !!config.blockDuration,
        };
      }

      return {
        success: true,
        remainingPoints: config.points - consumed,
        msBeforeNext: config.duration * 1000,
        isBlocked: false,
      };
    } catch (error) {
      this.logger.error(`Rate limit error for ${identifier}: ${error.message}`);
      // Documented safe degradation: if the shared store is unreachable,
      // fail OPEN (allow the request) rather than locking users out or
      // throwing — an unavailable rate limiter must never become an
      // outage. See docs/rate-limiting-store-failure-behaviour.md.
      return {
        success: true,
        remainingPoints: config.points,
        msBeforeNext: 0,
        isBlocked: false,
      };
    }
  }

  /**
   * Atomically increments the shared counter and returns the new total.
   *
   * When a real Redis client is available (the common case in any
   * deployment with more than one replica), this is a single INCRBY+EXPIRE
   * Lua script — one round trip, no read-then-write race, so the counter
   * is correct regardless of how many replicas call it concurrently.
   *
   * When no Redis client is configured (e.g. `NODE_ENV=test`, or a
   * deliberately single-instance deployment relying on the in-process
   * cache-manager store), this falls back to the previous get-then-set
   * behaviour. That fallback is NOT safe across replicas — it is only
   * correct for a single instance — which is the documented limitation of
   * running without Redis.
   */
  private async incrementCounter(
    key: string,
    points: number,
    durationSeconds: number,
  ): Promise<number> {
    if (this.redis) {
      const result = await this.redis.eval(
        INCR_AND_EXPIRE_SCRIPT,
        1,
        key,
        points,
        durationSeconds,
      );
      return Number(result);
    }

    const current = await this.cacheManager.get<number>(key);
    const currentValue = typeof current === 'number' ? current : 0;
    const consumed = currentValue + points;
    await this.cacheManager.set(key, consumed, durationSeconds * 1000);
    return consumed;
  }

  async resetLimit(
    identifier: string,
    category: EndpointCategory,
  ): Promise<void> {
    try {
      const key = this.buildKey(identifier, category);
      const blockKey = this.buildBlockKey(identifier, category);
      await this.cacheManager.del(key);
      await this.cacheManager.del(blockKey);
    } catch (error) {
      this.logger.error(
        `Failed to reset limit for ${identifier}: ${error.message}`,
      );
      // Fail silently to avoid breaking the application
    }
  }

  async getRemainingPoints(
    identifier: string,
    tier: UserTier,
    category: EndpointCategory,
  ): Promise<number> {
    const config = this.getConfig(tier, category);
    const key = this.buildKey(identifier, category);
    const current = await this.cacheManager.get<number>(key);
    return config.points - (current || 0);
  }

  async isBlocked(
    identifier: string,
    category: EndpointCategory,
  ): Promise<boolean> {
    const blockKey = this.buildBlockKey(identifier, category);
    const blocked = await this.cacheManager.get<boolean>(blockKey);
    return !!blocked;
  }

  async whitelistIdentifier(
    identifier: string,
    durationSeconds: number = 3600,
  ): Promise<void> {
    try {
      const key = `rate_limit:whitelist:${identifier}`;
      await this.cacheManager.set(key, true, durationSeconds * 1000);
      this.logger.log(`Whitelisted identifier: ${identifier}`);
    } catch (error) {
      this.logger.error(
        `Failed to whitelist identifier ${identifier}: ${error.message}`,
      );
      // Fail silently to avoid breaking the application
    }
  }

  async isWhitelisted(identifier: string): Promise<boolean> {
    const key = `rate_limit:whitelist:${identifier}`;
    const whitelisted = await this.cacheManager.get<boolean>(key);
    return !!whitelisted;
  }

  private getConfig(
    tier: UserTier,
    category: EndpointCategory,
  ): RateLimitConfig {
    // Handle unknown tiers and categories gracefully
    if (!RATE_LIMIT_CONFIG[tier]) {
      this.logger.warn(`Unknown tier: ${tier}, falling back to FREE`);
      return (
        RATE_LIMIT_CONFIG[UserTier.FREE][category] ||
        RATE_LIMIT_CONFIG[UserTier.FREE][EndpointCategory.PUBLIC]
      );
    }
    if (!RATE_LIMIT_CONFIG[tier][category]) {
      this.logger.warn(`Unknown category: ${category}, falling back to PUBLIC`);
      return RATE_LIMIT_CONFIG[tier][EndpointCategory.PUBLIC];
    }
    return RATE_LIMIT_CONFIG[tier][category];
  }

  private buildKey(identifier: string, category: string): string {
    return `rate_limit:${category}:${identifier}`;
  }

  private buildBlockKey(identifier: string, category: string): string {
    return `rate_limit:block:${category}:${identifier}`;
  }

  private async recordViolation(
    identifier: string,
    category: EndpointCategory,
  ): Promise<void> {
    const key = `rate_limit:violations:${identifier}`;
    const violations = (await this.cacheManager.get<any[]>(key)) || [];
    violations.push({
      category,
      timestamp: Date.now(),
    });
    await this.cacheManager.set(key, violations, 3600 * 1000);
  }

  private async getTTL(key: string): Promise<number> {
    try {
      const store = this.cacheManager.stores as {
        ttl?: (key: string) => Promise<number>;
      };
      if (store.ttl) {
        return await store.ttl(key);
      }
      return 60;
    } catch {
      return 60;
    }
  }
}
