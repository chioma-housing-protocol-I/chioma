import {
  Injectable,
  Logger,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'node:crypto';

export interface EncryptedData {
  iv: string; // base64
  data: string; // base64
  tag: string; // base64 auth tag
}

export class EncryptionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EncryptionError';
  }
}

export class DecryptionFailedError extends Error {
  constructor() {
    super('Decryption failed: invalid data, key, or tampered');
    this.name = 'DecryptionFailedError';
  }
}

/**
 * Centralized AES-256-GCM Encryption Service
 *
 * Features:
 * - AES-256-GCM (authenticated encryption)
 * - Multiple keys for rotation (newest first)
 * - Simple API: encrypt/decrypt strings
 *
 * Env vars:
 * - ENCRYPTION_KEY_BASE64: single 32-byte base64 key (fallback)
 * - ENCRYPTION_KEYS: JSON array of base64 keys '["key1","key2"]' (newest first)
 *
 * Usage:
 * ```ts
 * const encrypted = await this.encryptionService.encrypt('sensitive data');
 * const decrypted = await this.encryptionService.decrypt(encrypted);
 * ```
 *
 * Rotation: Add new key to ENCRYPTION_KEYS array (prepend).
 * Decrypt tries keys in order until success.
 */
@Injectable()
export class EncryptionService {
  private readonly logger = new Logger(EncryptionService.name);
  private keys: Buffer[] = [];

  constructor(private configService: ConfigService) {
    this.initializeKeys();
  }

  private initializeKeys(): void {
    try {
      // Multi-key rotation support (newest first)
      const keysJson = this.configService.get<string>('ENCRYPTION_KEYS');
      if (keysJson) {
        const keyStrings = JSON.parse(keysJson) as string[];
        this.keys = keyStrings.map((k) => Buffer.from(k, 'base64'));
        this.logger.log(`Loaded ${this.keys.length} rotation keys`);
      } else {
        // Fallback single key
        const keyB64 = this.configService.get<string>('ENCRYPTION_KEY_BASE64');
        if (!keyB64) {
          throw new Error('ENCRYPTION_KEY_BASE64 or ENCRYPTION_KEYS required');
        }
        this.keys = [Buffer.from(keyB64, 'base64')];
        this.logger.log('Loaded single encryption key');
      }

      // Validate key length (AES-256 needs 32 bytes)
      if (this.keys.some((k) => k.length !== 32)) {
        throw new Error(
          'All encryption keys must be 32 bytes (base64 ~44 chars)',
        );
      }
    } catch (error) {
      this.logger.error('Encryption key init failed', error);
      throw new EncryptionError(
        `Invalid encryption keys: ${(error as Error).message}`,
      );
    }
  }

  async encrypt(plain: string): Promise<string> {
    if (!plain || typeof plain !== 'string') {
      throw new EncryptionError('Plain text must be non-empty string');
    }

    // Use newest key (index 0)
    const key = this.keys[0];
    const iv = crypto.randomBytes(12); // GCM recommends 12 bytes
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

    const data = Buffer.from(plain, 'utf8');
    const encrypted = cipher.update(data);
    cipher.final();

    const tag = cipher.getAuthTag();

    const result: EncryptedData = {
      iv: iv.toString('base64'),
      data: encrypted.toString('base64'),
      tag: tag.toString('base64'),
    };

    return JSON.stringify(result);
  }

  async decrypt(ciphertext: string): Promise<string> {
    if (!ciphertext || typeof ciphertext !== 'string') {
      throw new EncryptionError('Ciphertext must be non-empty string');
    }

    let parsed: EncryptedData;
    try {
      parsed = JSON.parse(ciphertext) as EncryptedData;
    } catch {
      throw new DecryptionFailedError();
    }

    if (!parsed.iv || !parsed.data || !parsed.tag) {
      throw new DecryptionFailedError();
    }

    const iv = Buffer.from(parsed.iv, 'base64');
    const data = Buffer.from(parsed.data, 'base64');
    const tag = Buffer.from(parsed.tag, 'base64');

    // Try keys in rotation order (newest first)
    for (let i = 0; i < this.keys.length; i++) {
      try {
        const key = this.keys[i];
        const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
        decipher.setAuthTag(tag);

        const decrypted = Buffer.concat([
          decipher.update(data),
          decipher.final(),
        ]);

        return decrypted.toString('utf8');
      } catch (err) {
        this.logger.debug(`Key ${i + 1} decrypt failed, trying next`);
        // Continue to next key
      }
    }

    throw new DecryptionFailedError();
  }

  /**
   * Rotate: Prepend new key to rotation list (new active key).
   * In production, persist to secure store (e.g. AWS SSM, Vault).
   */
  rotateKey(newKeyB64: string): void {
    const newKey = Buffer.from(newKeyB64, 'base64');
    if (newKey.length !== 32) {
      throw new EncryptionError('New key must be 32 bytes base64');
    }
    this.keys.unshift(newKey);
    this.logger.log(`Rotated: added new key, total ${this.keys.length}`);
  }

  /**
   * Get current key count (for monitoring)
   */
  getKeyCount(): number {
    return this.keys.length;
  }
}
