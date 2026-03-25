import { Redis } from '@upstash/redis';

/**
 * Custom cache store adapter for Upstash Redis REST API
 * Compatible with cache-manager
 */
export class UpstashCacheStore {
  private client: Redis;
  private ttl: number;

  constructor(client: Redis, ttl = 600) {
    this.client = client;
    this.ttl = ttl;
  }

  async get<T>(key: string): Promise<T | undefined> {
    try {
      const value = await this.client.get(key);
      return value as T;
    } catch (error) {
      console.error('[UpstashCache] GET error:', error);
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
      console.error('[UpstashCache] SET error:', error);
      throw error;
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.client.del(key);
    } catch (error) {
      console.error('[UpstashCache] DEL error:', error);
      throw error;
    }
  }

  async reset(): Promise<void> {
    try {
      await this.client.flushdb();
    } catch (error) {
      console.error('[UpstashCache] RESET error:', error);
      throw error;
    }
  }

  async mget<T>(...keys: string[]): Promise<(T | undefined)[]> {
    try {
      const values = await this.client.mget(...keys);
      return values as (T | undefined)[];
    } catch (error) {
      console.error('[UpstashCache] MGET error:', error);
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
      console.error('[UpstashCache] MSET error:', error);
      throw error;
    }
  }

  async mdel(...keys: string[]): Promise<void> {
    try {
      if (keys.length > 0) {
        await this.client.del(...keys);
      }
    } catch (error) {
      console.error('[UpstashCache] MDEL error:', error);
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
      console.error('[UpstashCache] KEYS error:', error);
      return [];
    }
  }

  async getTtl(key: string): Promise<number> {
    try {
      const ttlValue = await this.client.ttl(key);
      return ttlValue;
    } catch (error) {
      console.error('[UpstashCache] TTL error:', error);
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
