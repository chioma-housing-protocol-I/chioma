import {
  Injectable,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const TAG_LENGTH = 16;
const SALT_LENGTH = 64;
const KEY_LENGTH = 32;
const ITERATIONS = 310_000;

// Support for key rotation: ENV var SECURITY_ENCRYPTION_KEYS = comma-separated hex keys (current first)
function getEncryptionKeys(configService: ConfigService): Buffer[] {
  const keysEnv = configService.get<string>('SECURITY_ENCRYPTION_KEYS');
  if (keysEnv) {
    return keysEnv.split(',').map((k) => {
      if (k.length < 64)
        throw new Error('Each key must be at least 64 hex chars');
      return Buffer.from(k.slice(0, 64), 'hex');
    });
  }
  // fallback to single key
  const keyHex = configService.get<string>('SECURITY_ENCRYPTION_KEY');
  if (keyHex && keyHex.length >= 64) {
    return [Buffer.from(keyHex.slice(0, 64), 'hex')];
  }
  throw new Error(
    'SECURITY_ENCRYPTION_KEYS or SECURITY_ENCRYPTION_KEY is required',
  );
}

/**
 * Enterprise-grade encryption service using AES-256-GCM with PBKDF2-derived keys.
 * Provides field-level encryption for PII and sensitive financial data.
 */
@Injectable()
export class EncryptionService {
  private readonly logger = new Logger(EncryptionService.name);
  private readonly keys: Buffer[];
  private readonly currentKey: Buffer;

  constructor(private configService: ConfigService) {
    this.keys = getEncryptionKeys(configService);
    this.currentKey = this.keys[0];
  }

  /**
   * Encrypt a plaintext string.
   * Returns a base64-encoded payload: salt|iv|authTag|ciphertext
   */
  encrypt(plaintext: string): string {
    try {
      const salt = crypto.randomBytes(SALT_LENGTH);
      const iv = crypto.randomBytes(IV_LENGTH);
      const derivedKey = this.deriveKey(this.currentKey, salt);

      const cipher = crypto.createCipheriv(ALGORITHM, derivedKey, iv, {
        authTagLength: TAG_LENGTH,
      });

      const encrypted = Buffer.concat([
        cipher.update(plaintext, 'utf8'),
        cipher.final(),
      ]);
      const authTag = cipher.getAuthTag();

      const payload = Buffer.concat([salt, iv, authTag, encrypted]);
      return payload.toString('base64');
    } catch (error) {
      this.logger.error('Encryption failed', error);
      throw new InternalServerErrorException('Encryption failed');
    }
  }

  /**
   * Decrypt a base64-encoded payload produced by encrypt().
   */
  decrypt(encryptedBase64: string): string {
    const payload = Buffer.from(encryptedBase64, 'base64');
    const salt = payload.subarray(0, SALT_LENGTH);
    const iv = payload.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const authTag = payload.subarray(
      SALT_LENGTH + IV_LENGTH,
      SALT_LENGTH + IV_LENGTH + TAG_LENGTH,
    );
    const ciphertext = payload.subarray(SALT_LENGTH + IV_LENGTH + TAG_LENGTH);

    // Try all keys for decryption (current and previous)
    for (const key of this.keys) {
      try {
        const derivedKey = this.deriveKey(key, salt);
        const decipher = crypto.createDecipheriv(ALGORITHM, derivedKey, iv, {
          authTagLength: TAG_LENGTH,
        });
        decipher.setAuthTag(authTag);
        const decrypted = Buffer.concat([
          decipher.update(ciphertext),
          decipher.final(),
        ]);
        return decrypted.toString('utf8');
      } catch {
        // Try next key
        continue;
      }
    }
    this.logger.error('Decryption failed with all known keys');
    throw new InternalServerErrorException('Decryption failed');
  }

  /**
   * Rotate encryption key: re-encrypts all KYC data with the new key.
   * Should be called after updating SECURITY_ENCRYPTION_KEYS (new key first).
   * Requires access to KYC repository and audit service.
   */
  async rotateKey(kycRepository: any, auditService: any, performedBy: string) {
    this.logger.warn('Starting encryption key rotation');
    const kycs = await kycRepository.find();
    for (const kyc of kycs) {
      try {
        const decrypted = this.decrypt(kyc.encryptedKycData);
        const reEncrypted = this.encrypt(decrypted);
        kyc.encryptedKycData = reEncrypted;
        kyc.encryptionVersion = (kyc.encryptionVersion || 1) + 1;
        await kycRepository.save(kyc);
        await auditService.log({
          action: 'KYC_KEY_ROTATED',
          entityType: 'Kyc',
          entityId: kyc.id,
          performedBy,
          status: 'SUCCESS',
          level: 'SECURITY',
          metadata: { encryptionVersion: kyc.encryptionVersion },
        });
      } catch (error) {
        this.logger.error(`Failed to rotate key for KYC ${kyc.id}`, error);
        await auditService.log({
          action: 'KYC_KEY_ROTATION_FAILED',
          entityType: 'Kyc',
          entityId: kyc.id,
          performedBy,
          status: 'FAILURE',
          level: 'SECURITY',
          errorMessage: error.message,
        });
      }
    }
    this.logger.warn('Encryption key rotation completed');
  }

  /**
   * Hash sensitive data deterministically for indexing (HMAC-SHA256).
   * Use this for lookups on encrypted fields (e.g., email search).
   */
  hash(value: string): string {
    // Use current key for hashing
    return crypto
      .createHmac('sha256', this.currentKey)
      .update(value.toLowerCase())
      .digest('hex');
  }

  /**
   * Generate a cryptographically secure random token.
   */
  generateSecureToken(bytes: number = 32): string {
    return crypto.randomBytes(bytes).toString('hex');
  }

  /**
   * Generate a time-based HMAC token for use in signed URLs / webhooks.
   */
  generateSignedToken(
    payload: string,
    expiresInSeconds: number = 3600,
  ): string {
    const expires = Math.floor(Date.now() / 1000) + expiresInSeconds;
    const data = `${payload}:${expires}`;
    const signature = crypto
      .createHmac('sha256', this.currentKey)
      .update(data)
      .digest('hex');
    return Buffer.from(`${data}:${signature}`).toString('base64url');
  }

  /**
   * Verify a signed token generated by generateSignedToken().
   */
  verifySignedToken(token: string, payload: string): boolean {
    try {
      const decoded = Buffer.from(token, 'base64url').toString('utf8');
      const parts = decoded.split(':');
      if (parts.length !== 3) return false;

      const [tokenPayload, expiresStr, signature] = parts;
      if (tokenPayload !== payload) return false;

      const expires = parseInt(expiresStr, 10);
      if (Date.now() / 1000 > expires) return false;

      const data = `${tokenPayload}:${expiresStr}`;
      const expectedSignature = crypto
        .createHmac('sha256', this.currentKey)
        .update(data)
        .digest('hex');

      return crypto.timingSafeEqual(
        Buffer.from(signature, 'hex'),
        Buffer.from(expectedSignature, 'hex'),
      );
    } catch {
      return false;
    }
  }

  /**
   * Derive a key from a master key and salt using PBKDF2.
   */
  private deriveKey(masterKey: Buffer, salt: Buffer): Buffer {
    return crypto.pbkdf2Sync(masterKey, salt, ITERATIONS, KEY_LENGTH, 'sha256');
  }
}
