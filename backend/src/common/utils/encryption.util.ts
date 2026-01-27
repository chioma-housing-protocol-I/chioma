import * as crypto from 'crypto';

/**
 * Encryption Utility
 * Provides AES-256-GCM encryption for sensitive data at rest
 */

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 128 bits
const SALT_LENGTH = 32; // 256 bits

/**
 * Derive encryption key from a password/secret using PBKDF2
 */
export function deriveKey(
  secret: string,
  salt?: Buffer,
): { key: Buffer; salt: Buffer } {
  const useSalt = salt || crypto.randomBytes(SALT_LENGTH);
  const key = crypto.pbkdf2Sync(secret, useSalt, 100000, 32, 'sha256');
  return { key, salt: useSalt };
}

/**
 * Encrypt data using AES-256-GCM
 * Returns base64-encoded string: salt:iv:authTag:ciphertext
 */
export function encrypt(plaintext: string, secret?: string): string {
  const encryptionSecret =
    secret ||
    process.env.ENCRYPTION_KEY ||
    process.env.JWT_SECRET ||
    'default-encryption-key';

  const { key, salt } = deriveKey(encryptionSecret);
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  // Combine all parts: salt:iv:authTag:ciphertext
  return [
    salt.toString('base64'),
    iv.toString('base64'),
    authTag.toString('base64'),
    encrypted,
  ].join(':');
}

/**
 * Decrypt data encrypted with AES-256-GCM
 */
export function decrypt(encryptedData: string, secret?: string): string {
  const encryptionSecret =
    secret ||
    process.env.ENCRYPTION_KEY ||
    process.env.JWT_SECRET ||
    'default-encryption-key';

  const [saltB64, ivB64, authTagB64, ciphertext] = encryptedData.split(':');

  if (!saltB64 || !ivB64 || !authTagB64 || !ciphertext) {
    throw new Error('Invalid encrypted data format');
  }

  const salt = Buffer.from(saltB64, 'base64');
  const iv = Buffer.from(ivB64, 'base64');
  const authTag = Buffer.from(authTagB64, 'base64');

  const { key } = deriveKey(encryptionSecret, salt);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Hash data using SHA-256
 */
export function hash(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Hash data using SHA-512
 */
export function hashSha512(data: string): string {
  return crypto.createHash('sha512').update(data).digest('hex');
}

/**
 * Generate a secure random token
 */
export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Generate a URL-safe token
 */
export function generateUrlSafeToken(length: number = 32): string {
  return crypto
    .randomBytes(length)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Compare two strings in constant time (timing-safe)
 */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

/**
 * Mask sensitive data for display/logging
 */
export function maskSensitiveData(data: string, showChars: number = 4): string {
  if (data.length <= showChars * 2) {
    return '*'.repeat(data.length);
  }
  return `${data.substring(0, showChars)}${'*'.repeat(data.length - showChars * 2)}${data.substring(data.length - showChars)}`;
}

/**
 * Encrypt an object's specific fields
 */
export function encryptFields<T extends Record<string, any>>(
  obj: T,
  fieldsToEncrypt: (keyof T)[],
  secret?: string,
): T {
  const result = { ...obj };

  for (const field of fieldsToEncrypt) {
    if (result[field] && typeof result[field] === 'string') {
      result[field] = encrypt(result[field] as string, secret) as T[keyof T];
    }
  }

  return result;
}

/**
 * Decrypt an object's specific fields
 */
export function decryptFields<T extends Record<string, any>>(
  obj: T,
  fieldsToDecrypt: (keyof T)[],
  secret?: string,
): T {
  const result = { ...obj };

  for (const field of fieldsToDecrypt) {
    if (result[field] && typeof result[field] === 'string') {
      try {
        result[field] = decrypt(result[field] as string, secret) as T[keyof T];
      } catch {
        // Field might not be encrypted, leave as-is
      }
    }
  }

  return result;
}

/**
 * TypeORM column transformer for automatic encryption/decryption
 */
export const EncryptedColumnTransformer = {
  to: (value: string | null): string | null => {
    if (!value) return null;
    return encrypt(value);
  },
  from: (value: string | null): string | null => {
    if (!value) return null;
    try {
      return decrypt(value);
    } catch {
      return value; // Return as-is if decryption fails
    }
  },
};

/**
 * Deterministic encryption (same input = same output)
 * Use only when you need to search encrypted values
 * Less secure than standard encryption
 */
export function encryptDeterministic(
  plaintext: string,
  secret?: string,
): string {
  const encryptionSecret =
    secret ||
    process.env.ENCRYPTION_KEY ||
    process.env.JWT_SECRET ||
    'default-encryption-key';

  // Use HMAC of plaintext as IV for deterministic output
  const iv = crypto
    .createHmac('sha256', encryptionSecret)
    .update(plaintext)
    .digest()
    .subarray(0, IV_LENGTH);

  const key = crypto.pbkdf2Sync(
    encryptionSecret,
    'deterministic-salt',
    100000,
    32,
    'sha256',
  );

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
}

/**
 * Decrypt deterministically encrypted data
 */
export function decryptDeterministic(
  encryptedData: string,
  secret?: string,
): string {
  const encryptionSecret =
    secret ||
    process.env.ENCRYPTION_KEY ||
    process.env.JWT_SECRET ||
    'default-encryption-key';

  const [ivB64, authTagB64, ciphertext] = encryptedData.split(':');

  const iv = Buffer.from(ivB64, 'base64');
  const authTag = Buffer.from(authTagB64, 'base64');

  const key = crypto.pbkdf2Sync(
    encryptionSecret,
    'deterministic-salt',
    100000,
    32,
    'sha256',
  );

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}
