import { Injectable } from '@nestjs/common';
import { CacheService } from './cache.service';
import { EncryptionService } from '../../modules/security/encryption.service';

/**
 * Wraps CacheService to transparently encrypt/decrypt values before they
 * reach Redis. Use this for any cache keys that hold PII or sensitive data
 * (e.g. user profiles, KYC data, login fingerprints).
 */
@Injectable()
export class EncryptedCacheService {
  constructor(
    private readonly cache: CacheService,
    private readonly encryption: EncryptionService,
  ) {}

  async get<T>(key: string): Promise<T | null> {
    const raw = await this.cache.get<string>(key);
    if (raw === null) return null;
    const json = this.encryption.decrypt(raw);
    return JSON.parse(json) as T;
  }

  async set<T>(key: string, value: T, ttlMs?: number): Promise<void> {
    const json = JSON.stringify(value);
    const encrypted = this.encryption.encrypt(json);
    await this.cache.set(key, encrypted, ttlMs);
  }

  async del(key: string): Promise<void> {
    await this.cache.invalidate(key);
  }
}
