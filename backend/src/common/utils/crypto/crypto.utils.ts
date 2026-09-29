import * as crypto from 'crypto';
import * as bcrypt from 'bcryptjs';

export class CryptoUtils {
  private static readonly ALGORITHM = 'aes-256-ctr';

  /**
   * Encrypts data using AES-256-CTR
   */
  static encrypt(data: string, key: string): string {
    // Ensure key is 32 bytes
    const hashKey = crypto.createHash('sha256').update(key).digest();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.ALGORITHM, hashKey, iv);
    const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
    return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
  }

  /**
   * Decrypts AES-256-CTR encrypted data
   */
  static decrypt(encryptedData: string, key: string): string {
    const hashKey = crypto.createHash('sha256').update(key).digest();
    const [ivHex, contentHex] = encryptedData.split(':');
    if (!ivHex || !contentHex) return '';

    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv(this.ALGORITHM, hashKey, iv);
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(contentHex, 'hex')),
      decipher.final(),
    ]);
    return decrypted.toString();
  }

  /**
   * Hashes data using bcrypt
   */
  static async hash(data: string, saltRounds: number = 12): Promise<string> {
    return bcrypt.hash(data, saltRounds);
  }

  /**
   * Generates a random hexadecimal string
   */
  static generateRandomString(length: number = 32): string {
    return crypto
      .randomBytes(Math.ceil(length / 2))
      .toString('hex')
      .slice(0, length);
  }
}
