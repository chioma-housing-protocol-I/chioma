import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import * as crypto from 'crypto';
import { ApiKey, ApiKeyScope } from './api-key.entity';
import { API_KEY_SETTINGS } from '../../common/constants/security.constants';

export interface CreateApiKeyDto {
  name: string;
  description?: string;
  scopes?: ApiKeyScope[];
  expiresAt?: Date;
  rateLimit?: number;
}

export interface ApiKeyValidationResult {
  valid: boolean;
  apiKey?: ApiKey;
  error?: string;
}

@Injectable()
export class ApiKeyService {
  private readonly logger = new Logger(ApiKeyService.name);

  constructor(
    @InjectRepository(ApiKey)
    private apiKeyRepository: Repository<ApiKey>,
  ) {}

  /**
   * Generate a new API key for a user
   */
  async createApiKey(
    userId: string,
    dto: CreateApiKeyDto,
  ): Promise<{ apiKey: ApiKey; rawKey: string }> {
    // Generate random key
    const rawKey = this.generateRawKey();
    const keyHash = this.hashKey(rawKey);
    const keyPrefix = rawKey.substring(0, 8);

    const apiKey = this.apiKeyRepository.create({
      name: dto.name,
      description: dto.description,
      userId,
      keyHash,
      keyPrefix,
      scopes: dto.scopes || [ApiKeyScope.READ],
      expiresAt: dto.expiresAt,
      rateLimit: dto.rateLimit || 1000,
      isActive: true,
    });

    const savedKey = await this.apiKeyRepository.save(apiKey);
    this.logger.log(`API key created for user ${userId}: ${keyPrefix}...`);

    // Return the raw key only once - it cannot be retrieved later
    return {
      apiKey: savedKey,
      rawKey: `${API_KEY_SETTINGS.PREFIX}${rawKey}`,
    };
  }

  /**
   * Validate an API key
   */
  async validateApiKey(rawKey: string): Promise<ApiKeyValidationResult> {
    // Remove prefix if present
    const key = rawKey.startsWith(API_KEY_SETTINGS.PREFIX)
      ? rawKey.substring(API_KEY_SETTINGS.PREFIX.length)
      : rawKey;

    const keyHash = this.hashKey(key);
    const keyPrefix = key.substring(0, 8);

    const apiKey = await this.apiKeyRepository.findOne({
      where: { keyHash, keyPrefix },
      relations: ['user'],
    });

    if (!apiKey) {
      return { valid: false, error: 'Invalid API key' };
    }

    if (!apiKey.isActive) {
      return { valid: false, error: 'API key is disabled' };
    }

    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
      return { valid: false, error: 'API key has expired' };
    }

    // Check rate limit
    if (!(await this.checkRateLimit(apiKey))) {
      return { valid: false, error: 'Rate limit exceeded' };
    }

    return { valid: true, apiKey };
  }

  /**
   * Record API key usage
   */
  async recordUsage(apiKeyId: string, ip: string): Promise<void> {
    await this.apiKeyRepository.update(apiKeyId, {
      lastUsedAt: new Date(),
      lastUsedIp: ip,
      requestCount: () => 'request_count + 1',
    });
  }

  /**
   * Check and update rate limit
   */
  private async checkRateLimit(apiKey: ApiKey): Promise<boolean> {
    const now = new Date();

    // Reset counter if window has passed
    if (!apiKey.rateLimitResetAt || apiKey.rateLimitResetAt < now) {
      await this.apiKeyRepository.update(apiKey.id, {
        requestCount: 1,
        rateLimitResetAt: new Date(now.getTime() + 60 * 60 * 1000),
      });
      return true;
    }

    // Check if under limit
    if (apiKey.requestCount >= apiKey.rateLimit) {
      this.logger.warn(`Rate limit exceeded for API key: ${apiKey.keyPrefix}`);
      return false;
    }

    return true;
  }

  /**
   * List all API keys for a user
   */
  async listApiKeys(userId: string): Promise<ApiKey[]> {
    return this.apiKeyRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Revoke an API key
   */
  async revokeApiKey(userId: string, keyId: string): Promise<void> {
    const apiKey = await this.apiKeyRepository.findOne({
      where: { id: keyId, userId },
    });

    if (!apiKey) {
      throw new NotFoundException('API key not found');
    }

    await this.apiKeyRepository.update(keyId, { isActive: false });
    this.logger.log(`API key revoked: ${apiKey.keyPrefix}`);
  }

  /**
   * Delete an API key
   */
  async deleteApiKey(userId: string, keyId: string): Promise<void> {
    const result = await this.apiKeyRepository.delete({ id: keyId, userId });

    if (result.affected === 0) {
      throw new NotFoundException('API key not found');
    }

    this.logger.log(`API key deleted: ${keyId}`);
  }

  /**
   * Check if API key has required scope
   */
  hasScope(apiKey: ApiKey, requiredScope: ApiKeyScope): boolean {
    // Admin scope has access to everything
    if (apiKey.scopes.includes(ApiKeyScope.ADMIN)) {
      return true;
    }

    // Write scope includes read
    if (
      requiredScope === ApiKeyScope.READ &&
      apiKey.scopes.includes(ApiKeyScope.WRITE)
    ) {
      return true;
    }

    return apiKey.scopes.includes(requiredScope);
  }

  /**
   * Clean up expired API keys
   */
  async cleanupExpiredKeys(): Promise<number> {
    const result = await this.apiKeyRepository.delete({
      expiresAt: LessThan(new Date()),
    });

    if (result.affected && result.affected > 0) {
      this.logger.log(`Cleaned up ${result.affected} expired API keys`);
    }

    return result.affected || 0;
  }

  // Private helpers

  private generateRawKey(): string {
    return crypto.randomBytes(API_KEY_SETTINGS.KEY_LENGTH).toString('hex');
  }

  private hashKey(key: string): string {
    return crypto
      .createHash(API_KEY_SETTINGS.HASH_ALGORITHM)
      .update(key)
      .digest('hex');
  }
}
