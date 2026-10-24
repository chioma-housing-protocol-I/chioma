import { Injectable, Logger, OnModuleInit, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nacl from 'tweetnacl';
import { StellarConfig } from '../config/stellar.config';
import { ConfigurationError } from '../../../common/errors';
import { BaseAppError } from '../../../common/errors/base.error';
import { ErrorCode } from '../../../common/errors/error-codes';
import { HttpStatus } from '@nestjs/common';
import { MetricsService } from '../../monitoring/metrics.service';

/**
 * Discriminator for why decryption failed. Allows callers to distinguish
 * between fixable configuration issues and data-layer corruption/tampering.
 *
 * - INVALID_KEY    — ciphertext was produced with a different key (key
 *                     fingerprint mismatch, or legacy unfingerprinted
 *                     payload that fails to authenticate).
 * - CORRUPTED_DATA — the base64-decoded blob is too short to contain a
 *                     nonce plus any ciphertext, is not valid base64, or
 *                     the decrypted bytes are not valid UTF-8.
 * - TAMPERING      — the MAC (Poly1305 auth tag embedded in NaCl secretbox)
 *                     failed on a fingerprint-matched payload, indicating
 *                     the ciphertext was modified after encryption.
 */
export enum DecryptionErrorType {
  INVALID_KEY = 'INVALID_KEY',
  CORRUPTED_DATA = 'CORRUPTED_DATA',
  TAMPERING = 'TAMPERING',
}

/**
 * Structured error thrown by `EncryptionService.decrypt` when decryption
 * fails. Carries a `type` discriminator so callers can route each failure
 * mode appropriately (alerting, self-healing, audit log, etc.).
 */
export class DecryptionError extends BaseAppError {
  readonly type: DecryptionErrorType;

  constructor(
    type: DecryptionErrorType,
    message?: string,
    context?: Record<string, unknown>,
  ) {
    const codeMap: Record<DecryptionErrorType, ErrorCode> = {
      [DecryptionErrorType.INVALID_KEY]: ErrorCode.DECRYPTION_INVALID_KEY,
      [DecryptionErrorType.CORRUPTED_DATA]: ErrorCode.DECRYPTION_CORRUPTED_DATA,
      [DecryptionErrorType.TAMPERING]: ErrorCode.DECRYPTION_TAMPERED,
    };

    super(
      codeMap[type],
      HttpStatus.UNPROCESSABLE_ENTITY,
      message ?? `Decryption failed: ${type}`,
      true,
      { type, ...context },
    );

    this.type = type;
  }
}

/** Minimum length (chars) accepted for a raw encryption key string. */
const MIN_KEY_LENGTH = 32;

/** Sentinel value shipped in `stellar.config.ts` as the default. */
const DEFAULT_PLACEHOLDER = 'default-encryption-key-change-in-production';

/**
 * Versioned envelope: `v1.<keyFingerprint>.<base64(nonce + ciphertext)>`.
 * The fingerprint (first 4 bytes of SHA-512 of the derived key, hex) lets
 * decryption tell a wrong key apart from tampered data. Unprefixed legacy
 * payloads (plain base64) are still accepted.
 */
const ENVELOPE_VERSION = 'v1';
const FINGERPRINT_BYTES = 4;
const BASE64_PATTERN = /^[A-Za-z0-9+/]*={0,2}$/;

@Injectable()
export class EncryptionService implements OnModuleInit {
  private readonly logger = new Logger(EncryptionService.name);
  private readonly encryptionKey: Uint8Array;
  private readonly keyFingerprint: string;

  /** Decryption failure counters by type, for metrics/health reporting. */
  private readonly decryptionFailures: Record<DecryptionErrorType, number> = {
    [DecryptionErrorType.INVALID_KEY]: 0,
    [DecryptionErrorType.CORRUPTED_DATA]: 0,
    [DecryptionErrorType.TAMPERING]: 0,
  };

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

  constructor(
    private readonly configService: ConfigService,
    @Optional() private readonly metricsService?: MetricsService,
  ) {
    const keyString =
      this.configService.get<StellarConfig>('stellar')?.encryptionKey ?? '';

    const { valid, reason } = EncryptionService.validateKeyString(keyString);
    this.keyValid = valid;
    this.keyInvalidReason = reason;

    // Always derive the key so the rest of the class stays consistent; runtime
    // operations throw immediately if keyValid is false.
    this.encryptionKey = this.deriveKey(keyString);
    this.keyFingerprint = Buffer.from(
      nacl.hash(this.encryptionKey).slice(0, FINGERPRINT_BYTES),
    ).toString('hex');

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
   * @returns Encrypted data as a `v1.<fingerprint>.<base64>` envelope
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

      return `${ENVELOPE_VERSION}.${this.keyFingerprint}.${Buffer.from(
        combined,
      ).toString('base64')}`;
    } catch (error) {
      this.logger.error('Encryption failed', error);
      throw new Error('Failed to encrypt secret key');
    }
  }

  /**
   * Decrypts an encrypted secret key.
   *
   * Throws `DecryptionError` with a specific `type` discriminator:
   * - `CORRUPTED_DATA` — the blob is malformed, too short, or decodes to
   *                       non-UTF-8 bytes
   * - `INVALID_KEY`    — fingerprint mismatch, or a legacy (unfingerprinted)
   *                       payload fails to authenticate
   * - `TAMPERING`      — a fingerprint-matched payload fails to authenticate
   *
   * @param encryptedData - `v1.<fingerprint>.<base64>` envelope, or legacy
   *   plain base64 (nonce + ciphertext, no envelope/fingerprint)
   * @returns Decrypted secret key
   */
  decrypt(encryptedData: string): string {
    this.assertKeyValid();

    try {
      return this.decryptOrThrow(encryptedData);
    } catch (error) {
      const failure =
        error instanceof DecryptionError
          ? error
          : new DecryptionError(
              DecryptionErrorType.CORRUPTED_DATA,
              `Unexpected decryption failure: ${(error as Error)?.message}`,
            );
      this.decryptionFailures[failure.type]++;
      this.metricsService?.recordDecryptionFailure(failure.type);
      this.logger.error(
        `Decryption failed [${failure.type}]: ${failure.message}`,
      );
      throw failure;
    }
  }

  /** Snapshot of decryption failure counts by type (no key material). */
  getDecryptionFailureMetrics(): Record<DecryptionErrorType, number> {
    return { ...this.decryptionFailures };
  }

  private decryptOrThrow(encryptedData: string): string {
    if (typeof encryptedData !== 'string' || encryptedData.length === 0) {
      throw new DecryptionError(
        DecryptionErrorType.CORRUPTED_DATA,
        'Encrypted payload is empty',
      );
    }

    let payload = encryptedData;
    let fingerprint: string | null = null;
    if (encryptedData.startsWith(`${ENVELOPE_VERSION}.`)) {
      const parts = encryptedData.split('.');
      if (parts.length !== 3) {
        throw new DecryptionError(
          DecryptionErrorType.CORRUPTED_DATA,
          'Malformed encryption envelope',
        );
      }
      [, fingerprint, payload] = parts;
    }

    if (fingerprint !== null && fingerprint !== this.keyFingerprint) {
      throw new DecryptionError(
        DecryptionErrorType.INVALID_KEY,
        'Payload was encrypted with a different key (fingerprint mismatch)',
      );
    }

    if (!BASE64_PATTERN.test(payload)) {
      throw new DecryptionError(
        DecryptionErrorType.CORRUPTED_DATA,
        'Payload is not valid base64',
      );
    }

    const combined = Buffer.from(payload, 'base64');
    const minLength =
      nacl.secretbox.nonceLength + nacl.secretbox.overheadLength;
    if (combined.length < minLength) {
      throw new DecryptionError(
        DecryptionErrorType.CORRUPTED_DATA,
        `Payload too short (${combined.length} < ${minLength} bytes)`,
      );
    }

    const nonce = combined.subarray(0, nacl.secretbox.nonceLength);
    const ciphertext = combined.subarray(nacl.secretbox.nonceLength);
    const decrypted = nacl.secretbox.open(
      new Uint8Array(ciphertext),
      new Uint8Array(nonce),
      this.encryptionKey,
    );

    if (!decrypted) {
      // With a matching fingerprint the key is right, so a MAC failure means
      // the data was modified. Legacy payloads carry no fingerprint, so a
      // wrong key is indistinguishable from tampering — report INVALID_KEY,
      // the more common and fixable cause.
      throw fingerprint !== null
        ? new DecryptionError(
            DecryptionErrorType.TAMPERING,
            'Authentication tag mismatch — ciphertext was modified',
          )
        : new DecryptionError(
            DecryptionErrorType.INVALID_KEY,
            'Authentication failed for legacy payload (wrong key or modified data)',
          );
    }

    try {
      return new TextDecoder('utf-8', { fatal: true }).decode(decrypted);
    } catch {
      throw new DecryptionError(
        DecryptionErrorType.CORRUPTED_DATA,
        'Decrypted payload is not valid UTF-8',
      );
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
    return !!keyString && keyString !== DEFAULT_PLACEHOLDER;
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
