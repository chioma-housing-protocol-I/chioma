import { Injectable, Logger, OnModuleInit, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpStatus } from '@nestjs/common';
import * as nacl from 'tweetnacl';
import { StellarConfig } from '../config/stellar.config';
import { ConfigurationError } from '../../../common/errors';
import { BaseAppError } from '../../../common/errors/base.error';
import { ErrorCode } from '../../../common/errors/error-codes';
import { HttpStatus } from '@nestjs/common';
import { DecryptionError, DecryptionErrorType } from './decryption.error';

export { DecryptionError, DecryptionErrorType } from './decryption.error';
import { ConfigurationError, BaseAppError, ErrorCode } from '../../../common/errors';
import { MetricsService } from '../../monitoring/metrics.service';

// ── Structured decryption error ──────────────────────────────────────────────

/** Discriminator for the root cause of a decryption failure. */
export type DecryptionFailureReason =
  | 'INVALID_FORMAT'   // base64 parse failed or payload too short to contain nonce
  | 'INVALID_KEY'      // key material is confirmed wrong (startup self-test path)
  | 'CORRUPTED_DATA'   // payload is well-formed but MAC verification failed
  | 'TAMPERING';       // structurally valid, full-length payload, MAC failed → likely tamper

export class DecryptionError extends BaseAppError {
  public readonly reason: DecryptionFailureReason;

  constructor(reason: DecryptionFailureReason, context?: Record<string, unknown>) {
    const messages: Record<DecryptionFailureReason, string> = {
      INVALID_FORMAT:  'Decryption failed: malformed or truncated ciphertext',
      INVALID_KEY:     'Decryption failed: incorrect encryption key',
      CORRUPTED_DATA:  'Decryption failed: ciphertext is corrupted',
      TAMPERING:       'Decryption failed: authentication tag mismatch — possible tampering',
    };
    super(
      ErrorCode.DECRYPTION_ERROR,
      HttpStatus.BAD_REQUEST,
      messages[reason],
      true,
      { reason, ...context },
    );
    this.reason = reason;
  }
}

/** Minimum length (chars) accepted for a raw encryption key string. */
const MIN_KEY_LENGTH = 32;

/** Sentinel value shipped in `stellar.config.ts` as the default. */
const DEFAULT_PLACEHOLDER = 'default-encryption-key-change-in-production';

/**
 * Discriminator for why decryption failed. Allows callers to distinguish
 * between fixable configuration issues and data-layer corruption/tampering.
 *
 * - INVALID_KEY   — `nacl.secretbox.open` returned null and the ciphertext
 *                   structure is valid; the most likely cause is a wrong or
 *                   rotated encryption key (e.g. wrong env var).
 * - CORRUPTED_DATA — the base64-decoded blob is too short to contain a nonce
 *                    plus any ciphertext, or is otherwise structurally invalid.
 * - TAMPERING      — the MAC (Poly1305 auth tag embedded in NaCl secretbox)
 *                    failed, indicating the ciphertext was modified after
 *                    encryption.
 */
export enum DecryptionFailureReason {
  INVALID_KEY = 'INVALID_KEY',
  CORRUPTED_DATA = 'CORRUPTED_DATA',
  TAMPERING = 'TAMPERING',
}

/**
 * Structured error thrown by `EncryptionService.decrypt` when decryption fails.
 * Carries a `reason` discriminator so callers can route each failure mode
 * appropriately (alerting, self-healing, audit log, etc.).
 */
export class DecryptionError extends BaseAppError {
  readonly reason: DecryptionFailureReason;

  constructor(
    reason: DecryptionFailureReason,
    message?: string,
    context?: Record<string, unknown>,
  ) {
    const codeMap: Record<DecryptionFailureReason, ErrorCode> = {
      [DecryptionFailureReason.INVALID_KEY]: ErrorCode.DECRYPTION_INVALID_KEY,
      [DecryptionFailureReason.CORRUPTED_DATA]: ErrorCode.DECRYPTION_CORRUPTED_DATA,
      [DecryptionFailureReason.TAMPERING]: ErrorCode.DECRYPTION_TAMPERED,
    };

    super(
      codeMap[reason],
      HttpStatus.UNPROCESSABLE_ENTITY,
      message ?? `Decryption failed: ${reason}`,
      true,
      { reason, ...context },
    );

    this.reason = reason;
  }
}
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
   * Throws `DecryptionError` with a specific `reason` discriminator:
   * - `CORRUPTED_DATA` — the blob is too short to hold a nonce + ciphertext
   * - `TAMPERING`      — the auth tag failed (data modified after encryption)
   * - `INVALID_KEY`    — `secretbox.open` returned null with a valid structure
   *                      (most likely wrong key / env var misconfiguration)
   *
   * @param encryptedData - Base64 encoded encrypted data (nonce + ciphertext)
   * @param encryptedData - `v1.<fingerprint>.<base64>` envelope or legacy base64
   * @returns Decrypted secret key
   * @throws DecryptionError with type INVALID_KEY, CORRUPTED_DATA or TAMPERING
   * @throws {DecryptionError} with a discriminated `reason` field
   */
  decrypt(encryptedData: string): string {
    this.assertKeyValid();

    // Validate that the blob is large enough to contain a nonce + at least 1
    // byte of ciphertext (NaCl secretbox adds a 16-byte MAC overhead, so the
    // minimum valid ciphertext length is nonceLength + 16 + 1).
    let combined: Buffer;
    try {
      combined = Buffer.from(encryptedData, 'base64');
    } catch {
      const err = new DecryptionError(
        DecryptionFailureReason.CORRUPTED_DATA,
        'Failed to base64-decode encrypted data',
        { encryptedDataLength: encryptedData?.length },
      );
      this.logger.error(
        `[DECRYPTION_FAILURE] reason=${err.reason} code=${err.errorCode}`,
        err.message,
      );
      throw err;
    }

    const minLength = nacl.secretbox.nonceLength + nacl.secretbox.overheadLength + 1;
    if (combined.length < minLength) {
      const err = new DecryptionError(
        DecryptionFailureReason.CORRUPTED_DATA,
        `Encrypted blob too short: expected ≥${minLength} bytes, got ${combined.length}`,
        { blobLength: combined.length, minLength },
      );
      this.logger.error(
        `[DECRYPTION_FAILURE] reason=${err.reason} code=${err.errorCode} ` +
          `blobLength=${combined.length} minLength=${minLength}`,
      );
      throw err;
    }

    const nonce = combined.slice(0, nacl.secretbox.nonceLength);
    const ciphertext = combined.slice(nacl.secretbox.nonceLength);

    let decrypted: Uint8Array | null;
    try {
      decrypted = nacl.secretbox.open(
        new Uint8Array(ciphertext),
        new Uint8Array(nonce),
        this.encryptionKey,
      );
    } catch (openErr) {
      // nacl.secretbox.open should not throw, but guard defensively
      const err = new DecryptionError(
        DecryptionFailureReason.CORRUPTED_DATA,
        'nacl.secretbox.open threw unexpectedly',
        { cause: openErr instanceof Error ? openErr.message : String(openErr) },
      );
      this.logger.error(
        `[DECRYPTION_FAILURE] reason=${err.reason} code=${err.errorCode}`,
        err.message,
      );
      throw err;
    }

    if (decrypted === null) {
      // NaCl returns null for both wrong-key and tamper scenarios. We
      // distinguish them by re-checking the ciphertext length: if the
      // ciphertext is >= overheadLength (16 bytes for Poly1305 MAC), a null
      // result almost certainly means the MAC check failed (tampering or
      // key mismatch). A ciphertext shorter than overheadLength is structurally
      // corrupt. We classify null as TAMPERING when the MAC had a chance to run
      // and as INVALID_KEY when additional heuristics indicate a key problem.
      //
      // Since we cannot distinguish INVALID_KEY from TAMPERING purely from the
      // null return, we classify as TAMPERING (the more security-critical of
      // the two) and log separately so operators can correlate with key rotation
      // events to determine the true root cause.
      const reason =
        ciphertext.length < nacl.secretbox.overheadLength
          ? DecryptionFailureReason.CORRUPTED_DATA
          : DecryptionFailureReason.TAMPERING;

      const err = new DecryptionError(
        reason,
        reason === DecryptionFailureReason.CORRUPTED_DATA
          ? 'Ciphertext is shorter than the NaCl MAC overhead — data is truncated or corrupt'
          : 'NaCl MAC verification failed — data may have been tampered with, or the encryption key is wrong',
        { ciphertextLength: ciphertext.length, reason },
      );

      this.logger.error(
        `[DECRYPTION_FAILURE] reason=${err.reason} code=${err.errorCode} ` +
          `ciphertextLength=${ciphertext.length} — ` +
          (reason === DecryptionFailureReason.TAMPERING
            ? 'If this is unexpected, verify STELLAR_ENCRYPTION_KEY has not been rotated.'
            : 'Data may be truncated; check the storage layer for corruption.'),
      );
      throw err;
    }

    try {
      const decoder = new TextDecoder();
      return decoder.decode(decrypted);
    } catch (decodeErr) {
      const err = new DecryptionError(
        DecryptionFailureReason.CORRUPTED_DATA,
        'Decrypted bytes are not valid UTF-8',
        { cause: decodeErr instanceof Error ? decodeErr.message : String(decodeErr) },
      );
      this.logger.error(
        `[DECRYPTION_FAILURE] reason=${err.reason} code=${err.errorCode}`,
        err.message,
      );
      throw err;
    // ── 1. Parse & structural validation ──────────────────────────────────
    let combined: Buffer;
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
      combined = Buffer.from(encryptedData, 'base64');
    } catch {
      this.recordDecryptionFailure('INVALID_FORMAT');
      throw new DecryptionError('INVALID_FORMAT', { hint: 'base64 decode failed' });
    }

    if (combined.length <= nacl.secretbox.nonceLength) {
      this.recordDecryptionFailure('INVALID_FORMAT');
      throw new DecryptionError('INVALID_FORMAT', {
        hint: `payload length ${combined.length} ≤ nonce length ${nacl.secretbox.nonceLength}`,
      });
    }

    // ── 2. Extract nonce + ciphertext ──────────────────────────────────────
    const nonce = new Uint8Array(combined.buffer, combined.byteOffset, nacl.secretbox.nonceLength);
    const ciphertext = new Uint8Array(
      combined.buffer,
      combined.byteOffset + nacl.secretbox.nonceLength,
      combined.length - nacl.secretbox.nonceLength,
    );

    // ── 3. Attempt authenticated decryption ────────────────────────────────
    let decrypted: Uint8Array | null;
    try {
      decrypted = nacl.secretbox.open(ciphertext, nonce, this.encryptionKey);
    } catch (err) {
      // nacl itself threw — treat as corrupted
      this.recordDecryptionFailure('CORRUPTED_DATA');
      this.logger.error('nacl.secretbox.open threw unexpectedly', err);
      throw new DecryptionError('CORRUPTED_DATA', { hint: 'nacl threw during open' });
    }

    if (decrypted === null) {
      // NaCl Poly1305 MAC failure. Structurally valid payloads (correct length,
      // proper nonce) that fail MAC are most likely tampered; undersized or
      // truncated ciphertext sections indicate corruption.
      const minCiphertextLen = nacl.secretbox.overheadLength; // 16-byte tag minimum
      const reason: DecryptionFailureReason =
        ciphertext.length >= minCiphertextLen ? 'TAMPERING' : 'CORRUPTED_DATA';

      this.recordDecryptionFailure(reason);
      this.logger.warn(
        `Decryption MAC failure — classified as ${reason}. ` +
          `ciphertextLen=${ciphertext.length}, minExpected=${minCiphertextLen}`,
      );
      throw new DecryptionError(reason);
    }

    return new TextDecoder().decode(decrypted);
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

  /** Records a decryption failure metric and logs a warning. */
  private recordDecryptionFailure(reason: DecryptionFailureReason): void {
    this.metricsService?.recordDecryptionFailure(reason);
    this.logger.warn(`Decryption failure: ${reason}`);
  }
}
