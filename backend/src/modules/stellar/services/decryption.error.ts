/**
 * Discriminator for why a decryption failed, so operators can tell a fixable
 * configuration issue (wrong key) from data corruption or tampering.
 */
export enum DecryptionErrorType {
  /** Ciphertext was produced with a different key (key fingerprint mismatch). */
  INVALID_KEY = 'INVALID_KEY',
  /** Payload is malformed: bad encoding, truncated, or not valid UTF-8. */
  CORRUPTED_DATA = 'CORRUPTED_DATA',
  /** Key matches but the authentication tag failed — data was modified. */
  TAMPERING = 'TAMPERING',
}

export class DecryptionError extends Error {
  readonly name = 'DecryptionError';

  constructor(
    readonly type: DecryptionErrorType,
    message: string,
  ) {
    super(message);
  }

  static isDecryptionError(error: unknown): error is DecryptionError {
    return error instanceof DecryptionError;
  }
}
