import { Injectable, Logger, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import {
  UserTier,
  EndpointCategory,
  RateLimitResult,
  RateLimitConfig,
} from '../types/rate-limit.types';
import { RATE_LIMIT_CONFIG } from '../config/rate-limit.config';

@Injectable()
export class RateLimitService {
  private readonly logger = new Logger(RateLimitService.name);

  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

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

      const current = await this.cacheManager.get<number>(key);
      const consumed = (current || 0) + points;

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

      await this.cacheManager.set(key, consumed, config.duration * 1000);

      return {
        success: true,
        remainingPoints: config.points - consumed,
        msBeforeNext: config.duration * 1000,
        isBlocked: false,
      };
    } catch (error) {
      this.logger.error(`Rate limit error for ${identifier}: ${error.message}`);
      return {
        success: true,
        remainingPoints: config.points,
        msBeforeNext: 0,
        isBlocked: false,
      };
    }
  }

  async resetLimit(
    identifier: string,
    category: EndpointCategory,
  ): Promise<void> {
    const key = this.buildKey(identifier, category);
    const blockKey = this.buildBlockKey(identifier, category);
    await this.cacheManager.del(key);
    await this.cacheManager.del(blockKey);
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
    const key = `rate_limit:whitelist:${identifier}`;
    await this.cacheManager.set(key, true, durationSeconds * 1000);
    this.logger.log(`Whitelisted identifier: ${identifier}`);
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
      const store = this.cacheManager.stores as any;
      if (store.ttl) {
        return await store.ttl(key);
      }
      return 60;
    } catch {
      return 60;
    }
  }
}
