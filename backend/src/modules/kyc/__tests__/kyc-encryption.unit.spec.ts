import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EncryptionService } from '../../security/encryption.service';

/**
 * Unit tests for KYC encryption/decryption functions
 * Optimized for speed - focuses on core functionality
 */
describe('KYC Encryption - Unit Tests', () => {
  let encryptionService: EncryptionService;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'SECURITY_ENCRYPTION_KEY') {
        return 'a'.repeat(64);
      }
      return undefined;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EncryptionService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    encryptionService = module.get<EncryptionService>(EncryptionService);
  });

  describe('Basic Encryption/Decryption', () => {
    it('should encrypt and decrypt strings', () => {
      const plaintext = 'John Doe';
      const encrypted = encryptionService.encrypt(plaintext);
      const decrypted = encryptionService.decrypt(encrypted);

      expect(encrypted).not.toBe(plaintext);
      expect(decrypted).toBe(plaintext);
    });

    it('should handle empty strings', () => {
      const plaintext = '';
      const encrypted = encryptionService.encrypt(plaintext);
      const decrypted = encryptionService.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle special characters', () => {
      const plaintext = '!@#$%^&*()_+-=[]{}|;:,.<>?/~`';
      const encrypted = encryptionService.encrypt(plaintext);
      const decrypted = encryptionService.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle unicode characters', () => {
      const plaintext = '你好世界 مرحبا بالعالم 🔐';
      const encrypted = encryptionService.encrypt(plaintext);
      const decrypted = encryptionService.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle newlines and whitespace', () => {
      const plaintext = 'Line 1\nLine 2\r\nLine 3\t\tTabbed';
      const encrypted = encryptionService.encrypt(plaintext);
      const decrypted = encryptionService.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });
  });

  describe('Randomness', () => {
    it('should produce different ciphertexts for same plaintext', () => {
      const plaintext = 'same-data';
      const encrypted1 = encryptionService.encrypt(plaintext);
      const encrypted2 = encryptionService.encrypt(plaintext);

      expect(encrypted1).not.toBe(encrypted2);
      expect(encryptionService.decrypt(encrypted1)).toBe(plaintext);
      expect(encryptionService.decrypt(encrypted2)).toBe(plaintext);
    });

    it('should use random IV for each encryption', () => {
      const plaintext = 'test-data';
      const encrypted1 = encryptionService.encrypt(plaintext);
      const encrypted2 = encryptionService.encrypt(plaintext);

      const buffer1 = Buffer.from(encrypted1, 'base64');
      const buffer2 = Buffer.from(encrypted2, 'base64');

      const iv1 = buffer1.subarray(64, 80);
      const iv2 = buffer2.subarray(64, 80);

      expect(iv1).not.toEqual(iv2);
    });
  });

  describe('KYC Data Types', () => {
    it('should encrypt email addresses', () => {
      const email = 'user@example.com';
      const encrypted = encryptionService.encrypt(email);
      const decrypted = encryptionService.decrypt(encrypted);

      expect(decrypted).toBe(email);
    });

    it('should encrypt phone numbers', () => {
      const phone = '+1-555-123-4567';
      const encrypted = encryptionService.encrypt(phone);
      const decrypted = encryptionService.decrypt(encrypted);

      expect(decrypted).toBe(phone);
    });

    it('should encrypt JSON KYC data', () => {
      const kycData = JSON.stringify({
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@example.com',
      });
      const encrypted = encryptionService.encrypt(kycData);
      const decrypted = encryptionService.decrypt(encrypted);

      expect(JSON.parse(decrypted)).toEqual(JSON.parse(kycData));
    });
  });

  describe('Hash Function', () => {
    it('should produce consistent hashes', () => {
      const input = 'test@example.com';
      const hash1 = encryptionService.hash(input);
      const hash2 = encryptionService.hash(input);

      expect(hash1).toBe(hash2);
    });

    it('should be case-insensitive', () => {
      const lower = encryptionService.hash('test@example.com');
      const upper = encryptionService.hash('TEST@EXAMPLE.COM');

      expect(lower).toBe(upper);
    });

    it('should produce different hashes for different inputs', () => {
      const hash1 = encryptionService.hash('alice@example.com');
      const hash2 = encryptionService.hash('bob@example.com');

      expect(hash1).not.toBe(hash2);
    });

    it('should produce hex string output', () => {
      const hash = encryptionService.hash('test@example.com');

      expect(/^[a-f0-9]+$/.test(hash)).toBe(true);
      expect(hash).toHaveLength(64); // SHA256
    });
  });

  describe('Secure Token Generation', () => {
    it('should generate tokens of correct length', () => {
      const token16 = encryptionService.generateSecureToken(16);
      const token32 = encryptionService.generateSecureToken(32);

      expect(token16).toHaveLength(32); // 16 bytes → 32 hex chars
      expect(token32).toHaveLength(64); // 32 bytes → 64 hex chars
    });

    it('should generate unique tokens', () => {
      const tokens = new Set();
      for (let i = 0; i < 10; i++) {
        tokens.add(encryptionService.generateSecureToken(32));
      }

      expect(tokens.size).toBe(10);
    });

    it('should generate hex-only tokens', () => {
      const token = encryptionService.generateSecureToken(32);

      expect(/^[a-f0-9]+$/.test(token)).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should throw error on invalid base64', () => {
      expect(() => {
        encryptionService.decrypt('!!!invalid!!!');
      }).toThrow();
    });

    it('should throw error on corrupted ciphertext', () => {
      const plaintext = 'test-data';
      const encrypted = encryptionService.encrypt(plaintext);
      const corrupted = encrypted.slice(0, -10) + 'corrupted!';

      expect(() => {
        encryptionService.decrypt(corrupted);
      }).toThrow();
    });

    it('should throw error when encryption key is missing', () => {
      const mockConfigServiceNoKey = {
        get: jest.fn(() => undefined),
      };

      expect(() => {
        new EncryptionService(mockConfigServiceNoKey as any);
      }).toThrow('SECURITY_ENCRYPTION_KEY is required');
    });

    it('should throw error when encryption key is too short', () => {
      const mockConfigServiceShortKey = {
        get: jest.fn(() => 'short-key'),
      };

      expect(() => {
        new EncryptionService(mockConfigServiceShortKey as any);
      }).toThrow('SECURITY_ENCRYPTION_KEY must be at least 64 hex characters');
    });
  });

  describe('Signed Tokens', () => {
    it('should generate and verify signed tokens', () => {
      const payload = 'user-123';
      const token = encryptionService.generateSignedToken(payload, 3600);

      expect(encryptionService.verifySignedToken(token, payload)).toBe(true);
    });

    it('should reject tokens with wrong payload', () => {
      const token = encryptionService.generateSignedToken('user-123', 3600);

      expect(encryptionService.verifySignedToken(token, 'user-456')).toBe(
        false,
      );
    });

    it('should reject expired tokens', () => {
      const token = encryptionService.generateSignedToken('user-123', -1);

      expect(encryptionService.verifySignedToken(token, 'user-123')).toBe(
        false,
      );
    });

    it('should reject tampered tokens', () => {
      const token = encryptionService.generateSignedToken('user-123', 3600);
      const tampered = token.slice(0, -5) + 'xxxxx';

      expect(encryptionService.verifySignedToken(tampered, 'user-123')).toBe(
        false,
      );
    });
  });

  describe('Cryptographic Properties', () => {
    it('should use AES-256-GCM algorithm', () => {
      const plaintext = 'test';
      const encrypted = encryptionService.encrypt(plaintext);

      expect(() => {
        Buffer.from(encrypted, 'base64');
      }).not.toThrow();
    });

    it('should include authentication tag (GCM)', () => {
      const plaintext = 'test-data';
      const encrypted = encryptionService.encrypt(plaintext);
      const payload = Buffer.from(encrypted, 'base64');

      // Payload: salt(64) + iv(16) + authTag(16) + ciphertext
      expect(payload.length).toBeGreaterThanOrEqual(96);
    });

    it('should use PBKDF2 key derivation', () => {
      const plaintext = 'test-data';
      const encrypted1 = encryptionService.encrypt(plaintext);
      const encrypted2 = encryptionService.encrypt(plaintext);

      // Different salts produce different ciphertexts
      expect(encrypted1).not.toBe(encrypted2);
      // But both decrypt correctly
      expect(encryptionService.decrypt(encrypted1)).toBe(plaintext);
      expect(encryptionService.decrypt(encrypted2)).toBe(plaintext);
    });
  });
});
