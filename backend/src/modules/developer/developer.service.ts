import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createHash, randomBytes } from 'crypto';
import { ApiKey, ApiKeyStatus } from './entities/api-key.entity';
import { ApiKeyRotationHistory } from './entities/api-key-rotation-history.entity';
import { findUnknownScopes } from './constants/api-scopes';

const PREFIX = 'chioma_sk_';
const KEY_BYTES = 32;
const HASH_ALG = 'sha256';
const DEFAULT_EXPIRATION_DAYS = 90;
const WARNING_DAYS_BEFORE_EXPIRATION = 30;
// After a rotation the old key stays usable for this long, so integrations
// can move to the new key without downtime. The old key can still be revoked
// immediately and independently via revokeKey().
const ROTATION_OVERLAP_DAYS = 7;

function hashKey(key: string): string {
  return createHash(HASH_ALG).update(key, 'utf8').digest('hex');
}

function generateKey(): string {
  return randomBytes(KEY_BYTES).toString('base64url');
}

function calculateExpirationDate(days: number = DEFAULT_EXPIRATION_DAYS): Date {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

@Injectable()
export class DeveloperService {
  constructor(
    @InjectRepository(ApiKey)
    private readonly apiKeyRepo: Repository<ApiKey>,
    @InjectRepository(ApiKeyRotationHistory)
    private readonly rotationHistoryRepo: Repository<ApiKeyRotationHistory>,
  ) {}

  async createKey(
    userId: string,
    name: string,
    description?: string,
    permissions?: string[],
    expiresAt?: Date,
  ): Promise<{ id: string; key: string; name: string; expiresAt: Date }> {
    this.assertKnownScopes(permissions);

    const rawKey = PREFIX + generateKey();
    const keyHash = hashKey(rawKey);
    const keyPrefix = rawKey.slice(0, 15) + '...';
    const expirationDate = expiresAt ?? calculateExpirationDate();

    const apiKey = this.apiKeyRepo.create({
      userId,
      name,
      description: description || null,
      keyHash,
      keyPrefix,
      permissions: permissions || [],
      expiresAt: expirationDate,
      status: ApiKeyStatus.ACTIVE,
    });

    const saved = await this.apiKeyRepo.save(apiKey);
    return {
      id: saved.id,
      key: rawKey,
      name: saved.name,
      expiresAt: saved.expiresAt!,
    };
  }

  async listKeys(userId: string): Promise<
    {
      id: string;
      name: string;
      description: string | null;
      keyPrefix: string;
      permissions: string[];
      lastUsedAt: Date | null;
      createdAt: Date;
      expiresAt: Date | null;
      isNearExpiration: boolean;
      isExpired: boolean;
      status: ApiKeyStatus;
      isRotated: boolean;
    }[]
  > {
    const keys = await this.apiKeyRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });

    return keys.map((k) => ({
      id: k.id,
      name: k.name,
      description: k.description,
      keyPrefix: k.keyPrefix ?? 'chioma_sk_...',
      permissions: k.permissions || [],
      lastUsedAt: k.lastUsedAt,
      createdAt: k.createdAt,
      expiresAt: k.expiresAt,
      isNearExpiration: k.isNearExpiration(),
      isExpired: k.isExpired(),
      status: k.status,
      isRotated: k.isRotated,
    }));
  }

  async getKey(userId: string, keyId: string): Promise<ApiKey> {
    const key = await this.apiKeyRepo.findOne({
      where: { id: keyId, userId },
    });

    if (!key) {
      throw new NotFoundException('API key not found');
    }

    return key;
  }

  async updateKey(
    userId: string,
    keyId: string,
    updates: {
      name?: string;
      description?: string;
      expiresAt?: Date;
      permissions?: string[];
    },
  ): Promise<ApiKey> {
    this.assertKnownScopes(updates.permissions);

    const key = await this.getKey(userId, keyId);

    if (updates.name) {
      key.name = updates.name;
    }

    if (updates.description !== undefined) {
      key.description = updates.description || null;
    }

    if (updates.expiresAt) {
      key.expiresAt = updates.expiresAt;
    }

    if (updates.permissions) {
      key.permissions = updates.permissions;
    }

    return this.apiKeyRepo.save(key);
  }

  async rotateKey(
    userId: string,
    keyId: string,
    newExpiresAt?: Date,
  ): Promise<{ id: string; key: string; name: string; expiresAt: Date }> {
    const oldKey = await this.getKey(userId, keyId);

    if (oldKey.status !== ApiKeyStatus.ACTIVE || oldKey.isExpired()) {
      throw new BadRequestException('Cannot rotate a key that is not active');
    }

    // Generate new key
    const rawKey = PREFIX + generateKey();
    const keyHash = hashKey(rawKey);
    const keyPrefix = rawKey.slice(0, 15) + '...';
    const expirationDate = newExpiresAt ?? calculateExpirationDate();

    // Create new key as a rotated version, carrying over the old key's
    // metadata and scopes so rotation never silently broadens or narrows
    // what the credential can do.
    const newKey = this.apiKeyRepo.create({
      userId,
      name: oldKey.name,
      description: oldKey.description,
      permissions: oldKey.permissions || [],
      keyHash,
      keyPrefix,
      expiresAt: expirationDate,
      status: ApiKeyStatus.ACTIVE,
      isRotated: true,
      previousKeyHash: oldKey.keyHash,
      rotatedAt: new Date(),
    });

    const savedNewKey = await this.apiKeyRepo.save(newKey);

    // Record rotation history
    const rotationHistory = this.rotationHistoryRepo.create({
      apiKeyId: savedNewKey.id,
      userId,
      oldKeyHash: oldKey.keyHash,
      newKeyHash: keyHash,
      oldKeyPrefix: oldKey.keyPrefix,
      newKeyPrefix: keyPrefix,
    });

    await this.rotationHistoryRepo.save(rotationHistory);

    // Keep the old key ACTIVE for a bounded overlap window so callers can
    // migrate to the new key without downtime. Its expiry is capped at
    // now + ROTATION_OVERLAP_DAYS (never extended), after which the
    // scheduled expiry sweep deactivates it. It remains independently
    // revocable at any time via revokeKey().
    const overlapEnd = new Date();
    overlapEnd.setDate(overlapEnd.getDate() + ROTATION_OVERLAP_DAYS);
    if (!oldKey.expiresAt || new Date(oldKey.expiresAt) > overlapEnd) {
      oldKey.expiresAt = overlapEnd;
    }
    oldKey.rotatedAt = new Date();
    await this.apiKeyRepo.save(oldKey);

    return {
      id: savedNewKey.id,
      key: rawKey,
      name: savedNewKey.name,
      expiresAt: savedNewKey.expiresAt!,
    };
  }

  async getRotationHistory(
    userId: string,
    keyId: string,
  ): Promise<ApiKeyRotationHistory[]> {
    // Verify key exists and belongs to user
    await this.getKey(userId, keyId);

    return this.rotationHistoryRepo.find({
      where: { apiKeyId: keyId },
      order: { rotatedAt: 'DESC' },
    });
  }

  /**
   * Reject scope lists containing values outside the canonical vocabulary.
   */
  private assertKnownScopes(scopes?: string[]): void {
    if (!scopes || scopes.length === 0) return;
    const unknown = findUnknownScopes(scopes);
    if (unknown.length > 0) {
      throw new BadRequestException(
        `Unknown API key scope(s): ${unknown.join(', ')}`,
      );
    }
  }

  async revokeKey(userId: string, keyId: string): Promise<void> {
    const key = await this.getKey(userId, keyId);
    key.status = ApiKeyStatus.REVOKED;
    await this.apiKeyRepo.save(key);
  }

  async validateKey(rawKey: string): Promise<ApiKey | null> {
    if (!rawKey.startsWith(PREFIX)) return null;

    const keyHash = hashKey(rawKey);
    const key = await this.apiKeyRepo.findOne({ where: { keyHash } });

    if (!key) return null;

    // Check if key is expired or revoked
    if (key.status !== ApiKeyStatus.ACTIVE) {
      return null;
    }

    if (key.isExpired()) {
      key.status = ApiKeyStatus.EXPIRED;
      await this.apiKeyRepo.save(key);
      return null;
    }

    // Update last used (fire and forget)
    this.apiKeyRepo.update(key.id, { lastUsedAt: new Date() }).catch(() => {});

    return key;
  }

  /**
   * Get keys that are expiring soon (within warning period)
   */
  async getKeysExpiringSoon(
    userId: string,
  ): Promise<{ id: string; name: string; expiresAt: Date }[]> {
    const warningDate = new Date();
    warningDate.setDate(warningDate.getDate() + WARNING_DAYS_BEFORE_EXPIRATION);

    const keys = await this.apiKeyRepo
      .createQueryBuilder('key')
      .where('key.userId = :userId', { userId })
      .andWhere('key.status = :status', { status: ApiKeyStatus.ACTIVE })
      .andWhere('key.expiresAt IS NOT NULL')
      .andWhere('key.expiresAt <= :warningDate', { warningDate })
      .andWhere('key.expiresAt > :now', { now: new Date() })
      .getMany();

    return keys.map((k) => ({
      id: k.id,
      name: k.name,
      expiresAt: k.expiresAt!,
    }));
  }

  /**
   * Automatically deactivate expired keys
   */
  async deactivateExpiredKeys(): Promise<number> {
    const result = await this.apiKeyRepo
      .createQueryBuilder('key')
      .update()
      .set({ status: ApiKeyStatus.EXPIRED })
      .where('key.status = :status', { status: ApiKeyStatus.ACTIVE })
      .andWhere('key.expiresAt < :now', { now: new Date() })
      .execute();

    return result.affected ?? 0;
  }
}
