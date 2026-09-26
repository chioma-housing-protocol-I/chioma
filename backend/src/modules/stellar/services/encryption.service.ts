import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nacl from 'tweetnacl';
import { StellarConfig } from '../config/stellar.config';
import { ConfigurationError } from '../../../common/errors';

/** Minimum length (chars) accepted for a raw encryption key string. */
const MIN_KEY_LENGTH = 32;

/** Sentinel value shipped in `stellar.config.ts` as the default. */
const DEFAULT_PLACEHOLDER = 'default-encryption-key-change-in-production';

@Injectable()
export class EncryptionService implements OnModuleInit {
  private readonly logger = new Logger(EncryptionService.name);
  private readonly encryptionKey: Uint8Array;

  /**
   * True when the key passed all validation checks at construction time.
   * Stored so that `isKeyValid()` and the health indicator can read it cheaply.
   */
  private readonly keyValid: boolean;

  /**
   * Human-readable reason the key failed validation, or `null` when valid.
   * Surfaced in health-check details without exposing key material.
   */
  private readonly keyInvalidReason: string | null;

  constructor(private readonly configService: ConfigService) {
    const keyString =
      this.configService.get<StellarConfig>('stellar')?.encryptionKey ?? '';

    const { valid, reason } = EncryptionService.validateKeyString(keyString);
    this.keyValid = valid;
    this.keyInvalidReason = reason;

    // Always derive the key so the rest of the class stays consistent; runtime
    // operations throw immediately if keyValid is false.
    this.encryptionKey = this.deriveKey(keyString);

    if (!valid) {
      this.logger.error(
        `EncryptionService key validation failed: ${reason}. ` +
          'Encryption and decryption operations will throw until a valid key is configured.',
      );
    }
  }

  /**
   * NestJS lifecycle hook — runs after DI wiring is complete.
   * Throws `ConfigurationError` so the application refuses to start when the
   * key is absent or using the shipped placeholder.
   */
  onModuleInit(): void {
    if (!this.keyValid) {
      throw new ConfigurationError(
        `EncryptionService cannot start: ${this.keyInvalidReason}. ` +
          'Set STELLAR_ENCRYPTION_KEY to a random string of at least ' +
          `${MIN_KEY_LENGTH} characters before starting the application.`,
      );
    }

    // Perform a live round-trip to confirm the derived key material actually
    // works — catches encoding edge-cases that static checks miss.
    try {
      this.performRoundTrip();
    } catch (err) {
      throw new ConfigurationError(
        'EncryptionService round-trip self-test failed at startup. ' +
          'The configured key cannot encrypt/decrypt correctly. ' +
          `Underlying error: ${(err as Error).message}`,
      );
    }

    this.logger.log('EncryptionService key validation passed.');
  }

  // ── Public helpers for the health indicator ────────────────────────────────

  /**
   * Returns whether the key passed static validation at construction time.
   * Does NOT re-read from config — this is intentionally cheap.
   */
  isKeyValid(): boolean {
    return this.keyValid;
  }

  /**
   * Returns the validation failure reason, or `null` when the key is valid.
   * Safe to include in health-check payloads (contains no key material).
   */
  getKeyInvalidReason(): string | null {
    return this.keyInvalidReason;
  }

  /**
   * Performs a live encrypt → decrypt round-trip with a fixed test string.
   * Returns `true` on success; throws on any failure so callers can decide
   * whether to surface a hard error or a degraded warning.
   *
   * Used by `EncryptionHealthIndicator` and `onModuleInit`.
   */
  testRoundTrip(): true {
    this.assertKeyValid();
    return this.performRoundTrip();
  }

  // ── Core encrypt / decrypt ────────────────────────────────────────────────

  /**
   * Encrypts a secret key using NaCl secretbox.
   * @param secretKey - The secret key to encrypt
   * @returns Encrypted data as base64 string (nonce + ciphertext)
   */
  encrypt(secretKey: string): string {
    this.assertKeyValid();

    try {
      const encoder = new TextEncoder();
      const messageUint8 = encoder.encode(secretKey);

      // Generate a random nonce
      const nonce = nacl.randomBytes(nacl.secretbox.nonceLength);

      // Encrypt the message
      const ciphertext = nacl.secretbox(
        messageUint8,
        nonce,
        this.encryptionKey,
      );

      if (!ciphertext) {
        throw new Error('Encryption failed');
      }

      // Combine nonce and ciphertext
      const combined = new Uint8Array(nonce.length + ciphertext.length);
      combined.set(nonce);
      combined.set(ciphertext, nonce.length);

      // Return as base64
      return Buffer.from(combined).toString('base64');
    } catch (error) {
      this.logger.error('Encryption failed', error);
      throw new Error('Failed to encrypt secret key');
    }
  }

  /**
   * Decrypts an encrypted secret key.
   * @param encryptedData - Base64 encoded encrypted data (nonce + ciphertext)
   * @returns Decrypted secret key
   */
  decrypt(encryptedData: string): string {
    this.assertKeyValid();

    try {
      // Decode from base64
      const combined = Buffer.from(encryptedData, 'base64');

      // Extract nonce and ciphertext
      const nonce = combined.slice(0, nacl.secretbox.nonceLength);
      const ciphertext = combined.slice(nacl.secretbox.nonceLength);

      // Decrypt the message
      const decrypted = nacl.secretbox.open(
        new Uint8Array(ciphertext),
        new Uint8Array(nonce),
        this.encryptionKey,
      );

      if (!decrypted) {
        throw new Error('Decryption failed - invalid key or corrupted data');
      }

      const decoder = new TextDecoder();
      return decoder.decode(decrypted);
    } catch (error) {
      this.logger.error('Decryption failed', error);
      throw new Error('Failed to decrypt secret key');
    }
  }

  /**
   * Securely wipes a string from memory by overwriting it.
   * Note: JavaScript doesn't guarantee immediate garbage collection,
   * but this helps minimize exposure time.
   */
  secureWipe(_data: string): void {
    // In JavaScript, we can't truly wipe memory, but we can minimize exposure
    // by letting the variable go out of scope and be garbage collected.
    // This method is here for API completeness and to encourage good practices.
  }

  /**
   * Validates that the encryption service is properly configured.
   * @deprecated Prefer `isKeyValid()` which is evaluated once at construction
   *   time rather than re-reading config on every call.
   */
  isConfigured(): boolean {
    const keyString =
      this.configService.get<StellarConfig>('stellar')?.encryptionKey;
    return (
      !!keyString && keyString !== DEFAULT_PLACEHOLDER
    );
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  /**
   * Validates a raw key string before derivation.
   * Returns a `{ valid, reason }` tuple so both constructor and tests can
   * inspect the outcome without throwing.
   */
  static validateKeyString(keyString: string): {
    valid: boolean;
    reason: string | null;
  } {
    if (!keyString) {
      return { valid: false, reason: 'STELLAR_ENCRYPTION_KEY is not set' };
    }
    if (keyString === DEFAULT_PLACEHOLDER) {
      return {
        valid: false,
        reason:
          'STELLAR_ENCRYPTION_KEY is using the default placeholder value — ' +
          'replace it with a secret random string before deploying',
      };
    }
    if (keyString.length < MIN_KEY_LENGTH) {
      return {
        valid: false,
        reason:
          `STELLAR_ENCRYPTION_KEY is too short (${keyString.length} chars); ` +
          `minimum is ${MIN_KEY_LENGTH} characters`,
      };
    }
    return { valid: true, reason: null };
  }

  /**
   * Throws `ConfigurationError` when the key failed validation.
   * Called at the top of every operation that needs a working key.
   */
  private assertKeyValid(): void {
    if (!this.keyValid) {
      throw new ConfigurationError(
        `EncryptionService operation rejected: ${this.keyInvalidReason}`,
      );
    }
  }

  /**
   * Encrypts and immediately decrypts a known test string to confirm that the
   * derived key material is self-consistent.  Throws if the result does not
   * match the original.
   */
  private performRoundTrip(): true {
    const testPlaintext = 'encryption-self-test-chioma';
    const encrypted = this.encrypt(testPlaintext);
    const decrypted = this.decrypt(encrypted);

    if (decrypted !== testPlaintext) {
      throw new Error(
        `Round-trip produced "${decrypted}" instead of "${testPlaintext}"`,
      );
    }
    return true;
  }

  /**
   * Derives a 32-byte key from a string using SHA-512 (via NaCl) and
   * truncating to the secretbox key length.
   */
  private deriveKey(keyString: string): Uint8Array {
    const encoder = new TextEncoder();
    const hash = nacl.hash(encoder.encode(keyString));
    return hash.slice(0, nacl.secretbox.keyLength);
  }
}
