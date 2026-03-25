import { Logger } from '@nestjs/common';
import { Redis } from '@upstash/redis';

/**
 * Custom cache store adapter for Upstash Redis REST API
 * Compatible with cache-manager
 */
export class UpstashCacheStore {
  private client: Redis;
  private ttl: number;
  private readonly logger = new Logger(UpstashCacheStore.name);

  constructor(client: Redis, ttl = 600) {
    this.client = client;
    this.ttl = ttl;
  }

  async get<T>(key: string): Promise<T | undefined> {
    try {
      const value = await this.client.get(key);
      return value as T;
    } catch (error) {
      this.logger.error(`GET error for key ${key}:`, error);
      return undefined;
    }
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    try {
      const expirationSeconds = ttl || this.ttl;
      if (expirationSeconds > 0) {
        await this.client.setex(key, expirationSeconds, value);
      } else {
        await this.client.set(key, value);
      }
    } catch (error) {
      this.logger.error(`SET error for key ${key}:`, error);
      throw error;
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.client.del(key);
    } catch (error) {
      this.logger.error(`DEL error for key ${key}:`, error);
      throw error;
    }
  }

  async reset(): Promise<void> {
    try {
      await this.client.flushdb();
    } catch (error) {
      this.logger.error('RESET error:', error);
      throw error;
    }
  }

  async mget<T>(...keys: string[]): Promise<(T | undefined)[]> {
    try {
      const values = await this.client.mget(...keys);
      return values as (T | undefined)[];
    } catch (error) {
      this.logger.error(`MGET error for keys ${keys.join(', ')}:`, error);
      return keys.map(() => undefined);
    }
  }

  async mset(args: [string, unknown][], ttlValue?: number): Promise<void> {
    try {
      // Upstash doesn't support MSET with TTL, so we set individually
      await Promise.all(
        args.map(([key, value]) => this.set(key, value, ttlValue)),
      );
    } catch (error) {
      this.logger.error('MSET error:', error);
      throw error;
    }
  }

  async mdel(...keys: string[]): Promise<void> {
    try {
      if (keys.length > 0) {
        await this.client.del(...keys);
      }
    } catch (error) {
      this.logger.error(`MDEL error for keys ${keys.join(', ')}:`, error);
      throw error;
    }
  }

  async keys(pattern = '*'): Promise<string[]> {
    try {
      // Note: KEYS command can be slow on large datasets
      // Consider using SCAN in production
      const keys = await this.client.keys(pattern);
      return keys;
    } catch (error) {
      this.logger.error(`KEYS error for pattern ${pattern}:`, error);
      return [];
    }
  }

  async getTtl(key: string): Promise<number> {
    try {
      const ttlValue = await this.client.ttl(key);
      return ttlValue;
    } catch (error) {
      this.logger.error(`TTL error for key ${key}:`, error);
      return -1;
    }
  }
}

/**
 * Factory function to create Upstash cache store
 */
export function upstashStore(config: {
  url: string;
  token: string;
  ttl?: number;
}): UpstashCacheStore {
  const client = new Redis({
    url: config.url,
    token: config.token,
  });

  return new UpstashCacheStore(client, config.ttl || 600);
}
