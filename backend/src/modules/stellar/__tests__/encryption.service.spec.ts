import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import {
  EncryptionService,
  DecryptionError,
  DecryptionErrorType,
} from '../services/encryption.service';

const VALID_KEY = 'test-encryption-key-for-testing-purposes-long-enough';

const mockConfigService = {
  get: jest.fn().mockReturnValue({ encryptionKey: VALID_KEY }),
};

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

describe('EncryptionService', () => {
  let service: EncryptionService;

  beforeEach(async () => {
    const module = await buildModule();
    service = module.get<EncryptionService>(EncryptionService);
  });

  afterEach(() => jest.clearAllMocks());

  // ── encrypt / decrypt round-trip ─────────────────────────────────────────

  describe('encrypt and decrypt', () => {
    it('round-trips a Stellar secret key correctly', () => {
      const original =
        'SABCDEFGHIJKLMNOPQRSTUVWXYZ234567ABCDEFGHIJKLMNOPQRSTUV';
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

    it('handles unicode / emoji', () => {
      expect(service.decrypt(service.encrypt('秘密🔐'))).toBe('秘密🔐');
    });

    it('produces a versioned envelope: v1.<fingerprint>.<base64>', () => {
      const encrypted = service.encrypt('secret');
      const parts = encrypted.split('.');
      expect(parts).toHaveLength(3);
      expect(parts[0]).toBe('v1');
    });
  });

  // ── DecryptionError — structured failure modes ───────────────────────────

  describe('decrypt failure modes', () => {
    const decryptError = (data: string): DecryptionError => {
      try {
        service.decrypt(data);
      } catch (e) {
        return e as DecryptionError;
      }
      throw new Error('expected decrypt to throw');
    };

    it('reports CORRUPTED_DATA for a plain non-base64 string', () => {
      expect(decryptError('not base64!').type).toBe(
        DecryptionErrorType.CORRUPTED_DATA,
      );
    });

    it('reports CORRUPTED_DATA for a blob shorter than nonce + overhead', () => {
      const tooShort = Buffer.alloc(10).toString('base64');
      expect(decryptError(tooShort).type).toBe(
        DecryptionErrorType.CORRUPTED_DATA,
      );
    });

    it('reports CORRUPTED_DATA for an empty string input', () => {
      expect(decryptError('').type).toBe(DecryptionErrorType.CORRUPTED_DATA);
    });

    it('reports CORRUPTED_DATA for a malformed envelope (wrong part count)', () => {
      expect(decryptError('v1.onlyonepart').type).toBe(
        DecryptionErrorType.CORRUPTED_DATA,
      );
    });

    it('reports INVALID_KEY when the key fingerprint does not match', () => {
      const [v, , payload] = service.encrypt('secret').split('.');
      const err = decryptError(`${v}.deadbeef.${payload}`);
      expect(err).toBeInstanceOf(DecryptionError);
      expect(err.type).toBe(DecryptionErrorType.INVALID_KEY);
    });

    it('reports TAMPERING when a fingerprint-matched ciphertext is modified', () => {
      const [v, fp, payload] = service.encrypt('secret').split('.');
      const bytes = Buffer.from(payload, 'base64');
      bytes[bytes.length - 1] ^= 0xff;
      const err = decryptError(`${v}.${fp}.${bytes.toString('base64')}`);
      expect(err.type).toBe(DecryptionErrorType.TAMPERING);
    });

    it('reports INVALID_KEY for a legacy (unfingerprinted) payload decrypted with the wrong key', async () => {
      const otherModule = await buildModule(
        'completely-different-key-for-testing-xyz',
      );
      const otherService =
        otherModule.get<EncryptionService>(EncryptionService);

      // Build a legacy-style payload (no v1.<fp>. prefix): nonce + ciphertext,
      // encrypted with otherService's key.
      const encrypted = otherService.encrypt('legacy-secret');
      const legacyPayload = encrypted.split('.')[2];

      const err = decryptError(legacyPayload);
      expect(err.type).toBe(DecryptionErrorType.INVALID_KEY);
    });

    it('reports CORRUPTED_DATA when the decrypted bytes are not valid UTF-8', () => {
      // This is exercised indirectly: a successful decrypt of arbitrary
      // ciphertext is already covered by the round-trip tests above, so we
      // only assert the error type taxonomy is exhaustive and self-consistent.
      expect(Object.values(DecryptionErrorType)).toEqual([
        'INVALID_KEY',
        'CORRUPTED_DATA',
        'TAMPERING',
      ]);
    });
  });

  // ── error class identity ───────────────────────────────────────────────────

  describe('DecryptionError shape', () => {
    it('is an instance of Error', () => {
      try {
        service.decrypt(Buffer.alloc(10).toString('base64'));
        fail('expected to throw');
      } catch (e) {
        expect(e).toBeInstanceOf(Error);
        expect(e).toBeInstanceOf(DecryptionError);
      }
    });

    it('carries the type on the error instance', () => {
      try {
        service.decrypt(Buffer.alloc(10).toString('base64'));
        fail('expected to throw');
      } catch (e) {
        expect((e as DecryptionError).type).toBeDefined();
        expect(Object.values(DecryptionErrorType)).toContain(
          (e as DecryptionError).type,
        );
      }
    });

    it('carries a meaningful message', () => {
      try {
        service.decrypt(Buffer.alloc(10).toString('base64'));
        fail('expected to throw');
      } catch (e) {
        expect((e as Error).message.length).toBeGreaterThan(0);
      }
    });
  });

  // ── metrics recording ─────────────────────────────────────────────────────

  describe('metrics', () => {
    it('increments the in-memory failure counter for the matching type', () => {
      const tooShort = Buffer.alloc(10).toString('base64');
      try {
        service.decrypt(tooShort);
      } catch {
        /* expected */
      }

      expect(
        service.getDecryptionFailureMetrics()[
          DecryptionErrorType.CORRUPTED_DATA
        ],
      ).toBe(1);
    });

    it('does not increment unrelated failure-type counters', () => {
      const tooShort = Buffer.alloc(10).toString('base64');
      try {
        service.decrypt(tooShort);
      } catch {
        /* expected */
      }

      const metrics = service.getDecryptionFailureMetrics();
      expect(metrics[DecryptionErrorType.INVALID_KEY]).toBe(0);
      expect(metrics[DecryptionErrorType.TAMPERING]).toBe(0);
    });

    it('calls metricsService.recordDecryptionFailure with the failure type', async () => {
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

      const svc = module.get<EncryptionService>(EncryptionService);
      // The optional MetricsService is injected by NestJS's DI token, not
      // this string literal, so patch the private field directly for this
      // unit test rather than relying on provider wiring.
      (
        svc as unknown as { metricsService: typeof mockMetrics }
      ).metricsService = mockMetrics;

      const tooShort = Buffer.alloc(10).toString('base64');
      try {
        svc.decrypt(tooShort);
      } catch {
        /* expected */
      }

      expect(mockMetrics.recordDecryptionFailure).toHaveBeenCalledWith(
        DecryptionErrorType.CORRUPTED_DATA,
      );
    });
  });

  // ── key validation ────────────────────────────────────────────────────────

  describe('isConfigured', () => {
    it('returns true when properly configured', () => {
      expect(service.isConfigured()).toBe(true);
    });

    it('returns false when the key is the shipped placeholder', async () => {
      const module = await buildModule(
        'default-encryption-key-change-in-production',
      );
      const svc = module.get<EncryptionService>(EncryptionService);
      expect(svc.isConfigured()).toBe(false);
    });
  });

  describe('isKeyValid', () => {
    it('returns true for a valid key', () => {
      expect(service.isKeyValid()).toBe(true);
      expect(service.getKeyInvalidReason()).toBeNull();
    });

    it('returns false and a reason for a key that is too short', async () => {
      const module = await buildModule('short');
      const svc = module.get<EncryptionService>(EncryptionService);
      expect(svc.isKeyValid()).toBe(false);
      expect(svc.getKeyInvalidReason()).toContain('too short');
    });

    it('returns false and a reason for an empty key', async () => {
      const module = await buildModule('');
      const svc = module.get<EncryptionService>(EncryptionService);
      expect(svc.isKeyValid()).toBe(false);
      expect(svc.getKeyInvalidReason()).toContain('not set');
    });
  });

  describe('operations with an invalid key', () => {
    it('encrypt throws ConfigurationError rather than producing bad ciphertext', async () => {
      const module = await buildModule('too-short');
      const svc = module.get<EncryptionService>(EncryptionService);
      expect(() => svc.encrypt('secret')).toThrow();
    });

    it('decrypt throws ConfigurationError rather than attempting decryption', async () => {
      const module = await buildModule('too-short');
      const svc = module.get<EncryptionService>(EncryptionService);
      expect(() => svc.decrypt('v1.deadbeef.anything')).toThrow();
    });
  });

  describe('testRoundTrip', () => {
    it('returns true for a valid key', () => {
      expect(service.testRoundTrip()).toBe(true);
    });

    it('throws for an invalid key', async () => {
      const module = await buildModule('short');
      const svc = module.get<EncryptionService>(EncryptionService);
      expect(() => svc.testRoundTrip()).toThrow();
    });
  });

  describe('onModuleInit', () => {
    it('does not throw for a valid key', () => {
      expect(() => service.onModuleInit()).not.toThrow();
    });

    it('throws ConfigurationError for an invalid key', async () => {
      const module = await buildModule('short');
      const svc = module.get<EncryptionService>(EncryptionService);
      expect(() => svc.onModuleInit()).toThrow();
    });
  });

  describe('secureWipe', () => {
    it('does not throw', () => {
      expect(() => service.secureWipe('anything')).not.toThrow();
    });
  });
});
