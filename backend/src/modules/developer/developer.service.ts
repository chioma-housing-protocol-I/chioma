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

const PREFIX = 'chioma_sk_';
const KEY_BYTES = 32;
const HASH_ALG = 'sha256';
const DEFAULT_EXPIRATION_DAYS = 90;
const WARNING_DAYS_BEFORE_EXPIRATION = 30;

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
    expiresAt?: Date,
  ): Promise<{ id: string; key: string; name: string; expiresAt: Date }> {
    const rawKey = PREFIX + generateKey();
    const keyHash = hashKey(rawKey);
    const keyPrefix = rawKey.slice(0, 15) + '...';
    const expirationDate = expiresAt ?? calculateExpirationDate();

    const apiKey = this.apiKeyRepo.create({
      userId,
      name,
      keyHash,
      keyPrefix,
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
      prefix: string;
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
      prefix: k.keyPrefix ?? 'chioma_sk_...',
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
    updates: { name?: string; expiresAt?: Date },
  ): Promise<ApiKey> {
    const key = await this.getKey(userId, keyId);

    if (updates.name) {
      key.name = updates.name;
    }

    if (updates.expiresAt) {
      key.expiresAt = updates.expiresAt;
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

    // Create new key as a rotated version
    const newKey = this.apiKeyRepo.create({
      userId,
      name: oldKey.name,
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

    // Mark old key as expired/rotated but keep for transition period
    oldKey.status = ApiKeyStatus.EXPIRED;
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
