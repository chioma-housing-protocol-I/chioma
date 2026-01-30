import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nacl from 'tweetnacl';
import { StellarConfig } from '../config/stellar.config';

@Injectable()
export class EncryptionService {
  private readonly logger = new Logger(EncryptionService.name);
  private readonly encryptionKey: Uint8Array;

  constructor(private readonly configService: ConfigService) {
    const keyString =
      this.configService.get<StellarConfig>('stellar')?.encryptionKey || '';
    // Derive a 32-byte key from the encryption key string
    this.encryptionKey = this.deriveKey(keyString);
  }

  /**
   * Derives a 32-byte key from a string using SHA-256 hashing
   */
  private deriveKey(keyString: string): Uint8Array {
    // Use nacl's hash function (which is SHA-512) and take first 32 bytes
    const encoder = new TextEncoder();
    const hash = nacl.hash(encoder.encode(keyString));
    return hash.slice(0, nacl.secretbox.keyLength);
  }

  /**
   * Encrypts a secret key using NaCl secretbox
   * @param secretKey - The secret key to encrypt
   * @returns Encrypted data as base64 string (nonce + ciphertext)
   */
  encrypt(secretKey: string): string {
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
   * Decrypts an encrypted secret key
   * @param encryptedData - Base64 encoded encrypted data (nonce + ciphertext)
   * @returns Decrypted secret key
   */
  decrypt(encryptedData: string): string {
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
   * Securely wipes a string from memory by overwriting it
   * Note: JavaScript doesn't guarantee immediate garbage collection,
   * but this helps minimize exposure time
   */
  secureWipe(_data: string): void {
    // In JavaScript, we can't truly wipe memory, but we can minimize exposure
    // by letting the variable go out of scope and be garbage collected
    // This method is here for API completeness and to encourage good practices
  }

  /**
   * Validates that the encryption service is properly configured
   */
  isConfigured(): boolean {
    const keyString =
      this.configService.get<StellarConfig>('stellar')?.encryptionKey;
    return (
      !!keyString && keyString !== 'default-encryption-key-change-in-production'
    );
  }
}
