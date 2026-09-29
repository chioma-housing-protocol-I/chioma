import { Injectable, Inject } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { REDIS_CLIENT } from '../lock/redis-client.token';
import { IdempotencyKeyMissingError } from './idempotency.errors';

@Injectable()
export class IdempotencyService {
  private readonly localStore = new Map<
    string,
    { value: string; expiresAt: number }
  >();

  constructor(@Inject(REDIS_CLIENT) private readonly redis: any) {}

  private validateKey(key: string): void {
    if (!key) {
      throw new IdempotencyKeyMissingError();
    }
  }

  async store(key: string, result: unknown, ttlMs: number): Promise<void> {
    this.validateKey(key);
    const namespacedKey = `idempotency:${key}`;
    const serialized = JSON.stringify(result);

    if (!this.redis) {
      this.localStore.set(namespacedKey, {
        value: serialized,
        expiresAt: Date.now() + ttlMs,
      });
      return;
    }

    const ttlSeconds = Math.max(1, Math.floor(ttlMs / 1000));
    await this.redis.setex(namespacedKey, ttlSeconds, serialized);
  }

  async retrieve(key: string): Promise<unknown> {
    this.validateKey(key);
    const namespacedKey = `idempotency:${key}`;

    if (!this.redis) {
      const existing = this.localStore.get(namespacedKey);
      if (!existing) {
        return null;
      }
      if (existing.expiresAt <= Date.now()) {
        this.localStore.delete(namespacedKey);
        return null;
      }
      return JSON.parse(existing.value);
    }

    const value = await this.redis.get(namespacedKey);
    if (value === null || value === undefined) {
      return null;
    }
    return JSON.parse(value as string);
  }

  async claim(key: string, ttlMs: number): Promise<string | null> {
    this.validateKey(key);
    const namespacedKey = `idempotency:${key}`;
    const token = randomUUID();

    if (!this.redis) {
      const existing = this.localStore.get(namespacedKey);
      if (existing && existing.expiresAt > Date.now()) {
        return null;
      }
      if (existing) this.localStore.delete(namespacedKey);
      this.localStore.set(namespacedKey, {
        value: JSON.stringify({ claimToken: token }),
        expiresAt: Date.now() + ttlMs,
      });
      return token;
    }

    const result = await this.redis.set(
      namespacedKey,
      JSON.stringify({ claimToken: token }),
      'PX',
      ttlMs,
      'NX',
    );
    return result === 'OK' ? token : null;
  }

  async releaseClaim(key: string, token: string): Promise<void> {
    this.validateKey(key);
    const namespacedKey = `idempotency:${key}`;
    const claimValue = JSON.stringify({ claimToken: token });

    if (!this.redis) {
      const existing = this.localStore.get(namespacedKey);
      if (existing?.value === claimValue) {
        this.localStore.delete(namespacedKey);
      }
      return;
    }

    await this.redis.eval(
      "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end",
      1,
      namespacedKey,
      claimValue,
    );
  }

  async process<T>(
    key: string,
    ttlMs: number,
    fn: () => Promise<T>,
  ): Promise<T> {
    const existing = await this.retrieve(key);
    if (existing !== null) {
      return existing as T;
    }
    const result = await fn();
    await this.store(key, result, ttlMs);
    return result;
  }
}
