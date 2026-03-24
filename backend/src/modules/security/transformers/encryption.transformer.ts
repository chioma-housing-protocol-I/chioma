import { ValueTransformer } from 'typeorm';
import * as crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const TAG_LENGTH = 16;
const SALT_LENGTH = 64;
const KEY_LENGTH = 32;
const ITERATIONS = 310_000;

class EncryptionTransformerImpl implements ValueTransformer {
  private get masterKey(): Buffer | undefined {
    // ConfigService relies on DI, but Transformers execute synchronously within TypeORM.
    // We must rely on process.env matching the app configurations.
    const keyHex = process.env.SECURITY_ENCRYPTION_KEY;
    if (!keyHex || keyHex.length < 64) {
      return undefined;
    }
    return Buffer.from(keyHex.slice(0, 64), 'hex');
  }

  private deriveKey(masterKey: Buffer, salt: Buffer): Buffer {
    return crypto.pbkdf2Sync(masterKey, salt, ITERATIONS, KEY_LENGTH, 'sha256');
  }

  to(value: any): string | null {
    if (value === null || value === undefined) return null;

    const key = this.masterKey;
    if (!key) {
      // Depending on the environment, we might just pass through if no key is found,
      // but blowing up prevents insecure data writes in production.
      throw new Error('SECURITY_ENCRYPTION_KEY is required for encryption');
    }

    const plaintext = typeof value === 'string' ? value : JSON.stringify(value);

    const salt = crypto.randomBytes(SALT_LENGTH);
    const iv = crypto.randomBytes(IV_LENGTH);
    const derivedKey = this.deriveKey(key, salt);

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
  }

  from(value: string | null): any {
    if (!value) return null;

    const key = this.masterKey;
    if (!key) {
      throw new Error('SECURITY_ENCRYPTION_KEY is required for decryption');
    }

    try {
      const payload = Buffer.from(value, 'base64');

      const salt = payload.subarray(0, SALT_LENGTH);
      const iv = payload.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
      const authTag = payload.subarray(
        SALT_LENGTH + IV_LENGTH,
        SALT_LENGTH + IV_LENGTH + TAG_LENGTH,
      );
      const ciphertext = payload.subarray(SALT_LENGTH + IV_LENGTH + TAG_LENGTH);

      const derivedKey = this.deriveKey(key, salt);

      const decipher = crypto.createDecipheriv(ALGORITHM, derivedKey, iv, {
        authTagLength: TAG_LENGTH,
      });
      decipher.setAuthTag(authTag);

      const decrypted = Buffer.concat([
        decipher.update(ciphertext),
        decipher.final(),
      ]);
      const decryptedString = decrypted.toString('utf8');

      try {
        return JSON.parse(decryptedString);
      } catch {
        return decryptedString;
      }
    } catch {
      throw new Error('Decryption failed for encrypted field');
    }
  }
}

export const EncryptionTransformer = new EncryptionTransformerImpl();
