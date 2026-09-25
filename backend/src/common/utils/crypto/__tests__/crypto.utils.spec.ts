import { CryptoUtils } from '../crypto.utils';

describe('CryptoUtils', () => {
  const testKey = '0123456789abcdef0123456789abcdef';
  const testData = 'secret messages 123';

  describe('encrypt/decrypt', () => {
    it('should encrypt and decrypt a string correctly', () => {
      const encrypted = CryptoUtils.encrypt(testData, testKey);
      expect(encrypted).toContain(':');
      const decrypted = CryptoUtils.decrypt(encrypted, testKey);
      expect(decrypted).toBe(testData);
    });

    it('should result in different ciphertexts for the same data', () => {
      const e1 = CryptoUtils.encrypt(testData, testKey);
      const e2 = CryptoUtils.encrypt(testData, testKey);
      expect(e1).not.toBe(e2);
    });
  });

  describe('hash', () => {
    it('should hash a string and verify it', async () => {
      const hash = await CryptoUtils.hash('password123');
      expect(hash).toBe('hashed-password'); // matched to backend/test/mocks/bcryptjs.ts
    });
  });

  describe('generateRandomString', () => {
    it('should generate string with correct length', () => {
      const r1 = CryptoUtils.generateRandomString(12);
      expect(r1).toHaveLength(12);
      const r2 = CryptoUtils.generateRandomString(32);
      expect(r2).toHaveLength(32);
    });

    it('should be reasonably random', () => {
      const r1 = CryptoUtils.generateRandomString(20);
      const r2 = CryptoUtils.generateRandomString(20);
      expect(r1).not.toBe(r2);
    });
  });
});
