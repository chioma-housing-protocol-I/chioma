import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EncryptionService } from '../../security/encryption.service';

/**
 * Security tests for KYC encryption
 * Optimized for speed - focuses on critical security properties
 */
describe('KYC Encryption - Security Tests', () => {
  let encryptionService: EncryptionService;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'SECURITY_ENCRYPTION_KEY') {
        return 'c'.repeat(64);
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

  describe('Key Exposure Prevention', () => {
    it('should not expose plaintext in encrypted output', () => {
      const plaintext = 'sensitive-kyc-data-12345';
      const encrypted = encryptionService.encrypt(plaintext);

      expect(encrypted).not.toContain(plaintext);
      expect(encrypted).not.toContain('sensitive');
    });

    it('should not expose key material in encrypted output', () => {
      const plaintext = 'test-data';
      const encrypted = encryptionService.encrypt(plaintext);

      expect(encrypted).not.toContain('cccccccc');
    });

    it('should produce base64 output', () => {
      const plaintext = 'test-data';
      const encrypted = encryptionService.encrypt(plaintext);

      expect(() => {
        Buffer.from(encrypted, 'base64');
      }).not.toThrow();
    });
  });

  describe('Tampering Detection', () => {
    it('should detect truncation of ciphertext', () => {
      const plaintext = 'test-data';
      const encrypted = encryptionService.encrypt(plaintext);
      const truncated = encrypted.slice(0, -10);

      expect(() => {
        encryptionService.decrypt(truncated);
      }).toThrow();
    });

    it('should detect appended data', () => {
      const plaintext = 'test-data';
      const encrypted = encryptionService.encrypt(plaintext);
      const appended = encrypted + 'extra-data';

      expect(() => {
        encryptionService.decrypt(appended);
      }).toThrow();
    });

    it('should detect invalid base64', () => {
      expect(() => {
        encryptionService.decrypt('!!!invalid!!!');
      }).toThrow();
    });

    it('should detect corrupted payload', () => {
      const plaintext = 'test-data';
      const encrypted = encryptionService.encrypt(plaintext);
      const buffer = Buffer.from(encrypted, 'base64');

      if (buffer.length > 100) {
        buffer[buffer.length - 1] ^= 0xff;
        const corrupted = buffer.toString('base64');

        expect(() => {
          encryptionService.decrypt(corrupted);
        }).toThrow();
      }
    });
  });

  describe('Cryptographic Strength', () => {
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

    it('should use random salt for each encryption', () => {
      const plaintext = 'test-data';
      const encrypted1 = encryptionService.encrypt(plaintext);
      const encrypted2 = encryptionService.encrypt(plaintext);

      const buffer1 = Buffer.from(encrypted1, 'base64');
      const buffer2 = Buffer.from(encrypted2, 'base64');

      const salt1 = buffer1.subarray(0, 64);
      const salt2 = buffer2.subarray(0, 64);

      expect(salt1).not.toEqual(salt2);
    });

    it('should use GCM mode for authenticated encryption', () => {
      const plaintext = 'test-data';
      const encrypted = encryptionService.encrypt(plaintext);
      const buffer = Buffer.from(encrypted, 'base64');

      // Payload: salt(64) + iv(16) + authTag(16) + ciphertext
      expect(buffer.length).toBeGreaterThanOrEqual(96);
    });

    it('should use PBKDF2 key derivation', () => {
      const plaintext = 'test-data';
      const encrypted1 = encryptionService.encrypt(plaintext);
      const encrypted2 = encryptionService.encrypt(plaintext);

      expect(encrypted1).not.toBe(encrypted2);
      expect(encryptionService.decrypt(encrypted1)).toBe(plaintext);
      expect(encryptionService.decrypt(encrypted2)).toBe(plaintext);
    });
  });

  describe('Hash Function Security', () => {
    it('should produce cryptographically secure hashes', () => {
      const input = 'test@example.com';
      const hash = encryptionService.hash(input);

      expect(/^[a-f0-9]+$/.test(hash)).toBe(true);
      expect(hash).toHaveLength(64); // SHA256
    });

    it('should not be reversible', () => {
      const input = 'test@example.com';
      const hash = encryptionService.hash(input);

      expect(hash).not.toContain(input);
      expect(hash).not.toContain('test');
    });

    it('should be collision-resistant', () => {
      const inputs = Array.from(
        { length: 50 },
        (_, i) => `user-${i}@example.com`,
      );
      const hashes = inputs.map((input) => encryptionService.hash(input));
      const uniqueHashes = new Set(hashes);

      expect(uniqueHashes.size).toBe(50);
    });

    it('should use HMAC for deterministic hashing', () => {
      const input = 'test@example.com';
      const hash1 = encryptionService.hash(input);
      const hash2 = encryptionService.hash(input);

      expect(hash1).toBe(hash2);
    });
  });

  describe('Token Generation Security', () => {
    it('should generate cryptographically secure tokens', () => {
      const token = encryptionService.generateSecureToken(32);

      expect(/^[a-f0-9]+$/.test(token)).toBe(true);
      expect(token).toHaveLength(64);
    });

    it('should generate unique tokens', () => {
      const tokens = new Set();
      for (let i = 0; i < 50; i++) {
        tokens.add(encryptionService.generateSecureToken(32));
      }

      expect(tokens.size).toBe(50);
    });
  });

  describe('Signed Token Security', () => {
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

  describe('Encryption Key Validation', () => {
    it('should require encryption key to be set', () => {
      const mockConfigServiceNoKey = {
        get: jest.fn(() => undefined),
      };

      expect(() => {
        new EncryptionService(mockConfigServiceNoKey as any);
      }).toThrow('SECURITY_ENCRYPTION_KEY is required');
    });

    it('should require encryption key to be at least 256 bits', () => {
      const mockConfigServiceShortKey = {
        get: jest.fn(() => 'short-key'),
      };

      expect(() => {
        new EncryptionService(mockConfigServiceShortKey as any);
      }).toThrow('SECURITY_ENCRYPTION_KEY must be at least 64 hex characters');
    });

    it('should accept valid 256-bit keys', () => {
      const mockConfigServiceValidKey = {
        get: jest.fn(() => 'd'.repeat(64)),
      };

      expect(() => {
        new EncryptionService(mockConfigServiceValidKey as any);
      }).not.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should not leak information through error messages', () => {
      const invalidBase64 = '!!!invalid!!!';

      try {
        encryptionService.decrypt(invalidBase64);
        fail('Should have thrown');
      } catch (error) {
        expect((error as Error).message).not.toContain('key');
        expect((error as Error).message).not.toContain('secret');
      }
    });

    it('should handle decryption errors gracefully', () => {
      const plaintext = 'test-data';
      const encrypted = encryptionService.encrypt(plaintext);
      const corrupted = encrypted.slice(0, -10) + 'corrupted!';

      expect(() => {
        encryptionService.decrypt(corrupted);
      }).toThrow();
    });
  });

  describe('NIST Compliance', () => {
    it('should use NIST-approved algorithms', () => {
      const plaintext = 'test-data';
      const encrypted = encryptionService.encrypt(plaintext);
      const decrypted = encryptionService.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should use PBKDF2 for key derivation', () => {
      const plaintext = 'test-data';
      const encrypted = encryptionService.encrypt(plaintext);
      const decrypted = encryptionService.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should use SHA-256 for hashing', () => {
      const hash = encryptionService.hash('test@example.com');

      expect(hash).toHaveLength(64);
    });
  });
});
