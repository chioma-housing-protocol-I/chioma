import { Inject, Injectable } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { CacheStats, GetOrSetOptions } from './cache.types';
import {
  CACHE_PREFIX_PROPERTIES_LIST,
  CACHE_PREFIX_PROPERTY,
  CACHE_PREFIX_SEARCH_PROPERTIES,
  CACHE_PREFIX_SUGGEST,
} from './cache.constants';

/**
 * Application cache layer with pattern invalidation, dependency tags, stats,
 * and single-flight loading to reduce stampedes on popular keys.
 */
@Injectable()
export class CacheService {
  private readonly stats = {
    hits: 0,
    misses: 0,
    sets: 0,
    evictions: 0,
    cleanups: 0,
  };

  /** tag -> cache keys that must be cleared when the tag is invalidated */
  private readonly depToKeys = new Map<string, Set<string>>();
  /** cache key -> dependency tags */
  private readonly keyToDeps = new Map<string, string[]>();
  /** cache key -> epoch milliseconds when local dependency metadata expires */
  private readonly keyExpiresAt = new Map<string, number>();

  private readonly inflight = new Map<string, Promise<unknown>>();

  constructor(@Inject(CACHE_MANAGER) private readonly cacheManager: Cache) {}

  async get<T>(key: string): Promise<T | null> {
    const value = await this.cacheManager.get<T>(key);
    if (value !== undefined && value !== null) {
      this.stats.hits++;
      return value;
    }
    this.stats.misses++;
    return null;
  }

  async set<T>(
    key: string,
    value: T,
    ttlMs?: number,
    dependencies?: string[],
  ): Promise<void> {
    if (dependencies?.length) {
      this.registerKeyDependencies(key, dependencies);
    }
    if (ttlMs && ttlMs > 0) {
      this.keyExpiresAt.set(key, Date.now() + ttlMs);
    } else {
      this.keyExpiresAt.delete(key);
    }
    await this.cacheManager.set(key, value, ttlMs);
    this.stats.sets++;
  }

  /**
   * Cache-aside with optional dependency tags and de-duplicated concurrent loads
   * for the same key (single-flight after the in-flight map is populated synchronously).
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttlMs?: number,
    options?: GetOrSetOptions,
  ): Promise<T> {
    const existing = this.inflight.get(key);
    if (existing) {
      return existing as Promise<T>;
    }

    const promise = (async () => {
      try {
        const cached = await this.get<T>(key);
        if (cached !== null && cached !== undefined) {
          return cached;
        }
        const value = await factory();
        await this.set(key, value, ttlMs, options?.dependencies);
        return value;
      } finally {
        this.inflight.delete(key);
      }
    })();

    this.inflight.set(key, promise);
    return promise;
  }

  /**
   * Delete keys matching a pattern (supports * glob when the store exposes `keys`),
   * or an exact key. Also clears entries registered under matching dependency tags.
   */
  async invalidate(pattern: string): Promise<void> {
    const keys = new Set<string>();

    for (const k of this.keysFromDependencyTags(pattern)) {
      keys.add(k);
    }

    for (const k of await this.keysMatchingStore(pattern)) {
      keys.add(k);
    }

    for (const key of keys) {
      await this.deleteKey(key);
    }
  }

  /**
   * Invalidates cache entries registered against one or more dependency tags.
   */
  async invalidateDependencies(dependencies: string[]): Promise<void> {
    const keys = new Set<string>();
    for (const dependency of dependencies) {
      for (const key of this.keysFromDependencyTags(dependency)) {
        keys.add(key);
      }
    }

    await Promise.all([...keys].map((key) => this.deleteKey(key)));
  }

  /**
   * Removes dependency metadata for keys that expired from the backing cache.
   * This keeps in-memory invalidation maps bounded without flushing Redis.
   */
  async cleanupExpiredDependencies(now = Date.now()): Promise<number> {
    let cleaned = 0;

    for (const [key, expiresAt] of [...this.keyExpiresAt]) {
      if (expiresAt > now) {
        continue;
      }

      const value = await this.cacheManager.get(key);
      if (value !== undefined && value !== null) {
        continue;
      }

      this.unregisterKey(key);
      cleaned++;
    }

    this.stats.cleanups += cleaned;
    return cleaned;
  }

  /**
   * Clears all application-namespaced property/search caches (does not flush the entire Redis DB).
   */
  async invalidateAll(): Promise<void> {
    await Promise.all([
      this.invalidate(`${CACHE_PREFIX_PROPERTIES_LIST}:*`),
      this.invalidate(`${CACHE_PREFIX_SEARCH_PROPERTIES}:*`),
      this.invalidate(`${CACHE_PREFIX_SUGGEST}:*`),
      this.invalidate(`${CACHE_PREFIX_PROPERTY}:*`),
    ]);
  }

  /**
   * Called when any property row or related data changes so list + search + suggest stay consistent.
   */
  async invalidatePropertyDomainCaches(propertyId?: string): Promise<void> {
    const tasks: Promise<void>[] = [
      this.invalidate(`${CACHE_PREFIX_PROPERTIES_LIST}:*`),
      this.invalidate(`${CACHE_PREFIX_SEARCH_PROPERTIES}:*`),
      this.invalidate(`${CACHE_PREFIX_SUGGEST}:*`),
    ];
    if (propertyId) {
      tasks.push(this.invalidate(`${CACHE_PREFIX_PROPERTY}:${propertyId}`));
    }
    await Promise.all(tasks);
  }

  getStats(): CacheStats {
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total === 0 ? 0 : this.stats.hits / total;
    const missRate = total === 0 ? 0 : this.stats.misses / total;
    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      sets: this.stats.sets,
      evictions: this.stats.evictions,
      cleanups: this.stats.cleanups,
      hitRate,
      missRate,
      dependencyTrackedKeys: this.keyToDeps.size,
    };
  }

  resetStats(): void {
    this.stats.hits = 0;
    this.stats.misses = 0;
    this.stats.sets = 0;
    this.stats.evictions = 0;
    this.stats.cleanups = 0;
  }

  private registerKeyDependencies(key: string, dependencies: string[]): void {
    this.unregisterKey(key);
    this.keyToDeps.set(key, dependencies);
    for (const dep of dependencies) {
      if (!this.depToKeys.has(dep)) {
        this.depToKeys.set(dep, new Set());
      }
      this.depToKeys.get(dep)!.add(key);
    }
  }

  private unregisterKey(key: string): void {
    const deps = this.keyToDeps.get(key);
    if (!deps) {
      return;
    }
    for (const dep of deps) {
      const set = this.depToKeys.get(dep);
      set?.delete(key);
      if (set?.size === 0) {
        this.depToKeys.delete(dep);
      }
    }
    this.keyToDeps.delete(key);
    this.keyExpiresAt.delete(key);
  }

  private keysFromDependencyTags(pattern: string): string[] {
    const out = new Set<string>();
    for (const [tag, keys] of this.depToKeys) {
      if (this.tagMatchesPattern(tag, pattern)) {
        for (const k of keys) {
          out.add(k);
        }
      }
    }
    return [...out];
  }

  private tagMatchesPattern(tag: string, pattern: string): boolean {
    if (!pattern.includes('*')) {
      return tag === pattern;
    }
    return this.globMatch(tag, pattern);
  }

  private globMatch(value: string, pattern: string): boolean {
    const re = new RegExp(
      '^' +
        pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') +
        '$',
    );
    return re.test(value);
  }

  private async keysMatchingStore(pattern: string): Promise<string[]> {
    if (!pattern.includes('*')) {
      return [pattern];
    }

    const store = (
      this.cacheManager as {
        store?: { keys?: (p: string) => Promise<string[]> };
      }
    ).store;
    if (store?.keys) {
      return store.keys(pattern);
    }

    return [];
  }

  private async deleteKey(key: string): Promise<void> {
    await this.cacheManager.del(key);
    this.unregisterKey(key);
    this.stats.evictions++;
  }
}
