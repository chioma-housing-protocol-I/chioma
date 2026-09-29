import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import {
  EncryptionService,
  DecryptionError,
  DecryptionFailureReason,
} from '../services/encryption.service';
import * as nacl from 'tweetnacl';

// ── Helpers ───────────────────────────────────────────────────────────────────

const VALID_KEY = 'test-encryption-key-for-testing-purposes-abcdef';

function buildModule(keyOverride?: string): Promise<TestingModule> {
  return Test.createTestingModule({
    providers: [
      EncryptionService,
      {
        provide: ConfigService,
        useValue: {
          get: jest.fn().mockReturnValue({
            encryptionKey: keyOverride ?? VALID_KEY,
          }),
        },
      },
    ],
  }).compile();
}

// ── Tests ─────────────────────────────────────────────────────────────────────
  DecryptionError,
  DecryptionErrorType,
  EncryptionService,
} from '../services/encryption.service';
import { EncryptionService, DecryptionError } from '../services/encryption.service';

const VALID_KEY = 'test-encryption-key-for-testing-purposes-long-enough';

const mockConfigService = {
  get: jest.fn().mockReturnValue({ encryptionKey: VALID_KEY }),
};

describe('EncryptionService', () => {
  let service: EncryptionService;

  beforeEach(async () => {
    const module = await buildModule();
    service = module.get<EncryptionService>(EncryptionService);
  });

  // ── round-trip ─────────────────────────────────────────────────────────────

  describe('encrypt / decrypt round-trip', () => {
    it('encrypts and decrypts a Stellar secret key', () => {
      const secret = 'SABCDEFGHIJKLMNOPQRSTUVWXYZ234567ABCDEFGHIJKLMNOPQRSTUV';
      expect(service.decrypt(service.encrypt(secret))).toBe(secret);
    });

    it('produces different ciphertext for the same plaintext (random nonce)', () => {
      const secret = 'same-secret';
      const c1 = service.encrypt(secret);
      const c2 = service.encrypt(secret);
      expect(c1).not.toBe(c2);
      expect(service.decrypt(c1)).toBe(secret);
      expect(service.decrypt(c2)).toBe(secret);
    });

    it('handles an empty string payload', () => {
      expect(service.decrypt(service.encrypt(''))).toBe('');
    });

    it('handles special characters', () => {
      const s = 'secret!@#$%^&*()_+-=[]{}|;:,.<>?';
      expect(service.decrypt(service.encrypt(s))).toBe(s);
    });

    it('handles unicode / emoji', () => {
      const s = '秘密🔐';
      expect(service.decrypt(service.encrypt(s))).toBe(s);
    });
  });

  // ── DecryptionError — CORRUPTED_DATA ───────────────────────────────────────

  describe('decrypt → DecryptionError(CORRUPTED_DATA)', () => {
    it('throws CORRUPTED_DATA for a plain non-base64 string', () => {
      // Buffer.from handles arbitrary strings without throwing, so the blob
      // will just be short — trigger the length guard instead.
      const err = (() => {
        try {
          service.decrypt('x');
        } catch (e) {
          return e;
        }
      })();
      expect(err).toBeInstanceOf(DecryptionError);
      expect((err as DecryptionError).reason).toBe(
        DecryptionFailureReason.CORRUPTED_DATA,
      );
    });

    it('throws CORRUPTED_DATA for a blob shorter than nonce + overhead + 1', () => {
      // A valid blob must be >= nonceLength (24) + overheadLength (16) + 1 = 41 bytes.
      // Encode 10 bytes — clearly too short.
      const tooShort = Buffer.alloc(10).toString('base64');
      expect(() => service.decrypt(tooShort)).toThrow(DecryptionError);
      try {
        service.decrypt(tooShort);
      } catch (e) {
        expect(e).toBeInstanceOf(DecryptionError);
        expect((e as DecryptionError).reason).toBe(
          DecryptionFailureReason.CORRUPTED_DATA,
        );
      }
    });

    it('throws CORRUPTED_DATA for an empty string input', () => {
      try {
        service.decrypt('');
      } catch (e) {
        expect(e).toBeInstanceOf(DecryptionError);
        expect((e as DecryptionError).reason).toBe(
          DecryptionFailureReason.CORRUPTED_DATA,
        );
      }
    });
  });

  // ── DecryptionError — TAMPERING ────────────────────────────────────────────

  describe('decrypt → DecryptionError(TAMPERING)', () => {
    it('throws TAMPERING when the ciphertext byte is flipped', () => {
      const encrypted = service.encrypt('tamper-me');
      const blob = Buffer.from(encrypted, 'base64');
      // Flip a byte in the ciphertext portion (after the 24-byte nonce)
      blob[nacl.secretbox.nonceLength] ^= 0xff;
      expect(() => service.decrypt(blob.toString('base64'))).toThrow(
        DecryptionError,
      );
      try {
        service.decrypt(blob.toString('base64'));
      } catch (e) {
        expect(e).toBeInstanceOf(DecryptionError);
        expect((e as DecryptionError).reason).toBe(
          DecryptionFailureReason.TAMPERING,
        );
      }
    });

    it('throws TAMPERING when the nonce byte is flipped', () => {
      const encrypted = service.encrypt('nonce-tamper');
      const blob = Buffer.from(encrypted, 'base64');
      // Flip a byte in the nonce portion
      blob[0] ^= 0xff;
      try {
        service.decrypt(blob.toString('base64'));
      } catch (e) {
        expect(e).toBeInstanceOf(DecryptionError);
        expect((e as DecryptionError).reason).toBe(
          DecryptionFailureReason.TAMPERING,
        );
      }
    });

    it('throws TAMPERING when decrypting with the wrong key', async () => {
      const encrypted = service.encrypt('wrong-key-test');
      const otherModule = await buildModule(
        'completely-different-key-for-testing-xyz',
      );
      const otherService = otherModule.get<EncryptionService>(EncryptionService);
      expect(() => otherService.decrypt(encrypted)).toThrow(DecryptionError);
      try {
        otherService.decrypt(encrypted);
      } catch (e) {
        expect(e).toBeInstanceOf(DecryptionError);
        // Wrong key causes MAC failure — classified as TAMPERING
        expect((e as DecryptionError).reason).toBe(
          DecryptionFailureReason.TAMPERING,
        );
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EncryptionService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<EncryptionService>(EncryptionService);
  });

  afterEach(() => jest.clearAllMocks());

  // ── encrypt / decrypt round-trip ─────────────────────────────────────────

  describe('encrypt and decrypt', () => {
    it('round-trips a Stellar secret key correctly', () => {
      const original = 'SABCDEFGHIJKLMNOPQRSTUVWXYZ234567ABCDEFGHIJKLMNOPQRSTUV';
      expect(service.decrypt(service.encrypt(original))).toBe(original);
    });

    it('produces different ciphertext each call due to random nonce', () => {
      const secret = 'SABCDEFGHIJKLMNOPQRSTUVWXYZ234567ABCDEFGHIJKLMNOPQRSTUV';
      const c1 = service.encrypt(secret);
      const c2 = service.encrypt(secret);
      expect(c1).not.toBe(c2);
      expect(service.decrypt(c1)).toBe(secret);
      expect(service.decrypt(c2)).toBe(secret);
    });

    it('handles empty strings', () => {
      expect(service.decrypt(service.encrypt(''))).toBe('');
    });

    it('handles special characters', () => {
      const s = 'secret!@#$%^&*()_+-=[]{}|;:,.<>?';
      expect(service.decrypt(service.encrypt(s))).toBe(s);
    });

    const decryptError = (data: string): DecryptionError => {
      try {
        service.decrypt(data);
      } catch (e) {
        return e as DecryptionError;
      }
      throw new Error('expected decrypt to throw');
    };

    it('reports CORRUPTED_DATA for malformed or truncated payloads', () => {
      expect(decryptError('not base64!').type).toBe(
        DecryptionErrorType.CORRUPTED_DATA,
      );
      expect(decryptError('AAAA').type).toBe(
        DecryptionErrorType.CORRUPTED_DATA,
      );
    });

    it('reports INVALID_KEY when the key fingerprint does not match', () => {
      const [v, , payload] = service.encrypt('secret').split('.');
      const err = decryptError(`${v}.deadbeef.${payload}`);
      expect(err).toBeInstanceOf(DecryptionError);
      expect(err.type).toBe(DecryptionErrorType.INVALID_KEY);
    });

    it('reports TAMPERING when ciphertext is modified', () => {
      const [v, fp, payload] = service.encrypt('secret').split('.');
      const bytes = Buffer.from(payload, 'base64');
      bytes[bytes.length - 1] ^= 0xff;
      const err = decryptError(`${v}.${fp}.${bytes.toString('base64')}`);
      expect(err.type).toBe(DecryptionErrorType.TAMPERING);
      expect(
        service.getDecryptionFailureMetrics()[DecryptionErrorType.TAMPERING],
      ).toBe(1);
    });

    it('should handle empty strings', () => {
      const encrypted = service.encrypt('');
      const decrypted = service.decrypt(encrypted);
      expect(decrypted).toBe('');
    it('handles unicode characters', () => {
      expect(service.decrypt(service.encrypt('秘密🔐'))).toBe('秘密🔐');
    });
  });

  // ── DecryptionError — structured failure modes ───────────────────────────

  describe('DecryptionError types', () => {
    it('throws DecryptionError(INVALID_FORMAT) for non-base64 garbage', () => {
      // '!!!' is not valid base64
      try {
        service.decrypt('!!!not-base64!!!');
        fail('expected to throw');
      } catch (err) {
        expect(err).toBeInstanceOf(DecryptionError);
        expect((err as DecryptionError).reason).toBe('INVALID_FORMAT');
      }
    });

    it('throws DecryptionError(INVALID_FORMAT) for a payload that is too short to contain a nonce', () => {
      // 10 bytes of valid base64 — shorter than the 24-byte NaCl nonce
      const tooShort = Buffer.alloc(10).toString('base64');
      try {
        service.decrypt(tooShort);
        fail('expected to throw');
      } catch (err) {
        expect(err).toBeInstanceOf(DecryptionError);
        expect((err as DecryptionError).reason).toBe('INVALID_FORMAT');
      }
    });

    it('throws DecryptionError(CORRUPTED_DATA) when ciphertext section is undersized', () => {
      // Nonce only (24 bytes), no ciphertext body — MAC section is missing
      const nonceOnly = Buffer.alloc(24).toString('base64');
      try {
        service.decrypt(nonceOnly);
        fail('expected to throw');
      } catch (err) {
        expect(err).toBeInstanceOf(DecryptionError);
        // nonceOnly payload has 0 ciphertext bytes < 16-byte overhead → CORRUPTED_DATA
        expect((err as DecryptionError).reason).toBe('CORRUPTED_DATA');
      }
    });
  });

  // ── error class identity ───────────────────────────────────────────────────

  describe('DecryptionError shape', () => {
    it('is an instance of Error', () => {
      try {
        service.decrypt(Buffer.alloc(10).toString('base64'));
      } catch (e) {
        expect(e).toBeInstanceOf(Error);
        expect(e).toBeInstanceOf(DecryptionError);
      }
    });

    it('carries the reason on the error instance', () => {
      try {
        service.decrypt(Buffer.alloc(10).toString('base64'));
      } catch (e) {
        expect((e as DecryptionError).reason).toBeDefined();
        expect(Object.values(DecryptionFailureReason)).toContain(
          (e as DecryptionError).reason,
        );
      }
    });

    it('carries a meaningful message', () => {
      try {
        service.decrypt(Buffer.alloc(10).toString('base64'));
      } catch (e) {
        expect((e as Error).message).toContain('Decryption failed');
      }
    });
  });

  // ── isConfigured ───────────────────────────────────────────────────────────
    it('throws DecryptionError(TAMPERING) when a full-length ciphertext has a flipped bit', () => {
      const ciphertext = service.encrypt('hello');
      const buf = Buffer.from(ciphertext, 'base64');
      // Flip a bit in the ciphertext body (after the 24-byte nonce)
      buf[buf.length - 1] ^= 0xff;
      const tampered = buf.toString('base64');

      try {
        service.decrypt(tampered);
        fail('expected to throw');
      } catch (err) {
        expect(err).toBeInstanceOf(DecryptionError);
        expect((err as DecryptionError).reason).toBe('TAMPERING');
      }
    });

    it('throws DecryptionError(TAMPERING) when decrypting with a different key', () => {
      const ciphertext = service.encrypt('secret-data');

      // Build a second service instance with a different key
      const otherConfig = {
        get: jest.fn().mockReturnValue({
          encryptionKey: 'a-completely-different-key-that-is-long-enough-32+',
        }),
      };
      let otherService: EncryptionService;
      return Test.createTestingModule({
        providers: [
          EncryptionService,
          { provide: ConfigService, useValue: otherConfig },
        ],
      })
        .compile()
        .then((m) => {
          otherService = m.get(EncryptionService);
          expect(() => otherService.decrypt(ciphertext)).toThrow(DecryptionError);
          try {
            otherService.decrypt(ciphertext);
          } catch (err) {
            // A valid-length payload decrypted with the wrong key → TAMPERING
            expect((err as DecryptionError).reason).toBe('TAMPERING');
          }
        });
    });

    it('DecryptionError exposes reason in the context field', () => {
      const tooShort = Buffer.alloc(10).toString('base64');
      try {
        service.decrypt(tooShort);
      } catch (err) {
        expect((err as DecryptionError).context).toMatchObject({ reason: 'INVALID_FORMAT' });
      }
    });
  });

  // ── metrics recording ─────────────────────────────────────────────────────

  describe('metrics', () => {
    it('calls metricsService.recordDecryptionFailure with the correct reason', async () => {
      const mockMetrics = { recordDecryptionFailure: jest.fn() };

      const module = await Test.createTestingModule({
        providers: [
          EncryptionService,
          { provide: ConfigService, useValue: mockConfigService },
          { provide: 'MetricsService', useValue: mockMetrics },
        ],
      })
        .overrideProvider('MetricsService')
        .useValue(mockMetrics)
        .compile();

      // Re-build with metrics injected via the optional parameter manually
      const svc = module.get<EncryptionService>(EncryptionService);
      // Patch private field for unit test
      (svc as any).metricsService = mockMetrics;

      const tooShort = Buffer.alloc(10).toString('base64');
      try { svc.decrypt(tooShort); } catch { /* expected */ }

      expect(mockMetrics.recordDecryptionFailure).toHaveBeenCalledWith('INVALID_FORMAT');
    });
  });

  // ── isConfigured ──────────────────────────────────────────────────────────

  describe('isConfigured', () => {
    it('returns true when properly configured', () => {
      expect(service.isConfigured()).toBe(true);
    });
  });
});
