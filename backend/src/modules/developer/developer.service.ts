import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createHash, randomBytes } from 'crypto';
import { ApiKey } from './entities/api-key.entity';

const PREFIX = 'chioma_sk_';
const KEY_BYTES = 32;
const HASH_ALG = 'sha256';

function hashKey(key: string): string {
  return createHash(HASH_ALG).update(key, 'utf8').digest('hex');
}

function generateKey(): string {
  return randomBytes(KEY_BYTES).toString('base64url');
}

@Injectable()
export class DeveloperService {
  constructor(
    @InjectRepository(ApiKey)
    private readonly apiKeyRepo: Repository<ApiKey>,
  ) {}

  async createKey(
    userId: string,
    name: string,
  ): Promise<{ id: string; key: string; name: string }> {
    const rawKey = PREFIX + generateKey();
    const keyHash = hashKey(rawKey);
    const keyPrefix = rawKey.slice(0, 15) + '...';
    const apiKey = this.apiKeyRepo.create({
      userId,
      name,
      keyHash,
      keyPrefix,
    });
    const saved = await this.apiKeyRepo.save(apiKey);
    return { id: saved.id, key: rawKey, name: saved.name };
  }

  async listKeys(userId: string): Promise<
    {
      id: string;
      name: string;
      prefix: string;
      lastUsedAt: Date | null;
      createdAt: Date;
    }[]
  > {
    const keys = await this.apiKeyRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
    return keys.map((k) => ({
      id: k.id,
      name: k.name,
      prefix: k.keyPrefix ?? 'chioma_sk_...',
      lastUsedAt: k.lastUsedAt,
      createdAt: k.createdAt,
    }));
  }

  async revokeKey(userId: string, keyId: string): Promise<void> {
    const key = await this.apiKeyRepo.findOne({ where: { id: keyId, userId } });
    if (!key) throw new NotFoundException('API key not found');
    await this.apiKeyRepo.remove(key);
  }

  async validateKey(rawKey: string): Promise<ApiKey | null> {
    if (!rawKey.startsWith(PREFIX)) return null;
    const keyHash = hashKey(rawKey);
    const key = await this.apiKeyRepo.findOne({ where: { keyHash } });
    if (!key) return null;
    // Update last used (fire and forget)
    this.apiKeyRepo.update(key.id, { lastUsedAt: new Date() }).catch(() => {});
    return key;
  }
}
