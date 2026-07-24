import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import {
  EncryptionService,
  DecryptionFailedError,
  EncryptionError,
  EncryptedData,
} from './encryption.service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** 32-byte key encoded as base64 */
const makeKey = (fill: string): string =>
  Buffer.from(fill.padEnd(32, '0').slice(0, 32), 'utf8').toString('base64');

const KEY_A = makeKey('key-alpha-32-bytes-padding-00000');
const KEY_B = makeKey('key-beta--32-bytes-padding-00000');
const KEY_C = makeKey('key-gamma-32-bytes-padding-00000');

/** Build a ConfigService mock that returns KEY_A as the single key */
function buildModule(
  configOverride?: (key: string) => string | undefined,
): Promise<TestingModule> {
  const mockConfigService = {
    get: jest.fn().mockImplementation(
      configOverride ??
        ((key: string) => {
          if (key === 'ENCRYPTION_KEY_BASE64') return KEY_A;
          return undefined;
        }),
    ),
  };

  return Test.createTestingModule({
    providers: [
      EncryptionService,
      { provide: ConfigService, useValue: mockConfigService },
    ],
  }).compile();
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('EncryptionService', () => {
  let service: EncryptionService;

  beforeEach(async () => {
    const module = await buildModule();
    service = module.get<EncryptionService>(EncryptionService);
  });

  afterEach(() => jest.clearAllMocks());

  // ── Instantiation ──────────────────────────────────────────────────────────

  describe('instantiation', () => {
    it('is defined with a valid single key', () => {
      expect(service).toBeDefined();
    });

    it('loads multiple rotation keys from ENCRYPTION_KEYS JSON array', async () => {
      const keysJson = JSON.stringify([KEY_A, KEY_B]);
      const module = await buildModule((key) => {
        if (key === 'ENCRYPTION_KEYS') return keysJson;
        return undefined;
      });
      const svc = module.get<EncryptionService>(EncryptionService);
      expect(svc.getKeyCount()).toBe(2);
    });

    it('throws EncryptionError when no key env var is set', async () => {
      await expect(buildModule(() => undefined)).rejects.toThrow(
        EncryptionError,
      );
    });

    it('throws EncryptionError when key is shorter than 32 bytes', async () => {
      const shortKey = Buffer.from('tooshort', 'utf8').toString('base64');
      await expect(
        buildModule((key) => {
          if (key === 'ENCRYPTION_KEY_BASE64') return shortKey;
          return undefined;
        }),
      ).rejects.toThrow(EncryptionError);
    });

    it('throws EncryptionError when ENCRYPTION_KEYS contains a short key', async () => {
      const badKeysJson = JSON.stringify([
        Buffer.from('short', 'utf8').toString('base64'),
      ]);
      await expect(
        buildModule((key) => {
          if (key === 'ENCRYPTION_KEYS') return badKeysJson;
          return undefined;
        }),
      ).rejects.toThrow(EncryptionError);
    });
  });

  // ── encrypt ────────────────────────────────────────────────────────────────

  describe('encrypt', () => {
    it('returns a JSON string with iv, data, and tag fields', async () => {
      const result = await service.encrypt('hello world');
      const parsed = JSON.parse(result) as EncryptedData;
      expect(parsed).toHaveProperty('iv');
      expect(parsed).toHaveProperty('data');
      expect(parsed).toHaveProperty('tag');
    });

    it('iv, data, and tag are valid base64 strings', async () => {
      const result = await service.encrypt('test');
      const parsed = JSON.parse(result) as EncryptedData;
      const base64Re = /^[A-Za-z0-9+/]+=*$/;
      expect(parsed.iv).toMatch(base64Re);
      expect(parsed.data).toMatch(base64Re);
      expect(parsed.tag).toMatch(base64Re);
    });

    it('produces different ciphertexts for the same plaintext (random IV)', async () => {
      const c1 = await service.encrypt('same input');
      const c2 = await service.encrypt('same input');
      expect(c1).not.toBe(c2);
    });

    it('encrypts a long string without error', async () => {
      const longText = 'A'.repeat(10_000);
      const result = await service.encrypt(longText);
      expect(result).toBeTruthy();
    });

    it('encrypts unicode / special characters', async () => {
      const unicode = '日本語テスト 🔐 <script>alert(1)</script>';
      const result = await service.encrypt(unicode);
      expect(result).toBeTruthy();
    });

    it('encrypts a single character', async () => {
      const result = await service.encrypt('x');
      expect(result).toBeTruthy();
    });

    it('throws EncryptionError for empty string', async () => {
      await expect(service.encrypt('')).rejects.toThrow(EncryptionError);
    });

    it('throws EncryptionError for null input', async () => {
      await expect(service.encrypt(null as unknown as string)).rejects.toThrow(
        EncryptionError,
      );
    });

    it('throws EncryptionError for undefined input', async () => {
      await expect(
        service.encrypt(undefined as unknown as string),
      ).rejects.toThrow(EncryptionError);
    });

    it('throws EncryptionError for numeric input', async () => {
      await expect(service.encrypt(42 as unknown as string)).rejects.toThrow(
        EncryptionError,
      );
    });
  });

  // ── decrypt ────────────────────────────────────────────────────────────────

  describe('decrypt', () => {
    it('round-trips a simple string', async () => {
      const plain = 'round-trip test';
      expect(await service.decrypt(await service.encrypt(plain))).toBe(plain);
    });

    it('round-trips a long string', async () => {
      const plain = 'Z'.repeat(5_000);
      expect(await service.decrypt(await service.encrypt(plain))).toBe(plain);
    });

    it('round-trips unicode and special characters', async () => {
      const plain = '🔑 sensitive: <>&"\'';
      expect(await service.decrypt(await service.encrypt(plain))).toBe(plain);
    });

    it('round-trips a JSON payload string', async () => {
      const plain = JSON.stringify({ userId: 'abc', ssn: '123-45-6789' });
      expect(await service.decrypt(await service.encrypt(plain))).toBe(plain);
    });

    it('throws EncryptionError for empty ciphertext', async () => {
      await expect(service.decrypt('')).rejects.toThrow(EncryptionError);
    });

    it('throws EncryptionError for null ciphertext', async () => {
      await expect(service.decrypt(null as unknown as string)).rejects.toThrow(
        EncryptionError,
      );
    });

    it('throws DecryptionFailedError for a plain non-JSON string', async () => {
      await expect(service.decrypt('not-json-at-all')).rejects.toThrow(
        DecryptionFailedError,
      );
    });

    it('throws DecryptionFailedError for JSON missing required fields', async () => {
      await expect(
        service.decrypt(JSON.stringify({ iv: 'abc' })),
      ).rejects.toThrow(DecryptionFailedError);
    });

    it('throws DecryptionFailedError for tampered ciphertext (flipped bit)', async () => {
      const encrypted = await service.encrypt('tamper test');
      const parsed = JSON.parse(encrypted) as EncryptedData;
      // Flip the first byte of the data field
      const dataBuf = Buffer.from(parsed.data, 'base64');
      dataBuf[0] ^= 0xff;
      parsed.data = dataBuf.toString('base64');
      await expect(service.decrypt(JSON.stringify(parsed))).rejects.toThrow(
        DecryptionFailedError,
      );
    });

    it('throws DecryptionFailedError for tampered auth tag', async () => {
      const encrypted = await service.encrypt('tag tamper');
      const parsed = JSON.parse(encrypted) as EncryptedData;
      const tagBuf = Buffer.from(parsed.tag, 'base64');
      tagBuf[0] ^= 0xff;
      parsed.tag = tagBuf.toString('base64');
      await expect(service.decrypt(JSON.stringify(parsed))).rejects.toThrow(
        DecryptionFailedError,
      );
    });

    it('throws DecryptionFailedError when decrypting with the wrong key', async () => {
      const encrypted = await service.encrypt('wrong key test');

      // Build a service with a different key
      const otherModule = await buildModule((key) => {
        if (key === 'ENCRYPTION_KEY_BASE64') return KEY_B;
        return undefined;
      });
      const otherService =
        otherModule.get<EncryptionService>(EncryptionService);

      await expect(otherService.decrypt(encrypted)).rejects.toThrow(
        DecryptionFailedError,
      );
    });
  });

  // ── key rotation ───────────────────────────────────────────────────────────

  describe('key rotation', () => {
    it('rotateKey prepends the new key so getKeyCount increases by 1', () => {
      const before = service.getKeyCount();
      service.rotateKey(KEY_B);
      expect(service.getKeyCount()).toBe(before + 1);
    });

    it('new key becomes the active encryption key after rotation', async () => {
      service.rotateKey(KEY_B);
      // Encrypt with KEY_B now active; a service with only KEY_B should decrypt it
      const encrypted = await service.encrypt('rotation active key');
      const otherModule = await buildModule((key) => {
        if (key === 'ENCRYPTION_KEY_BASE64') return KEY_B;
        return undefined;
      });
      const otherService =
        otherModule.get<EncryptionService>(EncryptionService);
      expect(await otherService.decrypt(encrypted)).toBe('rotation active key');
    });

    it('can still decrypt data encrypted with the old key after rotation', async () => {
      const plain = 'old key data';
      const encryptedWithOld = await service.encrypt(plain);
      service.rotateKey(KEY_B); // KEY_B is now active, KEY_A is fallback
      expect(await service.decrypt(encryptedWithOld)).toBe(plain);
    });

    it('supports two rotations and decrypts data from any key in the chain', async () => {
      const plain = 'multi-rotation';
      const encWithA = await service.encrypt(plain);
      service.rotateKey(KEY_B);
      const encWithB = await service.encrypt(plain);
      service.rotateKey(KEY_C);
      // All three should decrypt
      expect(await service.decrypt(encWithA)).toBe(plain);
      expect(await service.decrypt(encWithB)).toBe(plain);
      expect(await service.decrypt(await service.encrypt(plain))).toBe(plain);
    });

    it('throws EncryptionError when rotating with a key shorter than 32 bytes', () => {
      const shortKey = Buffer.from('short', 'utf8').toString('base64');
      expect(() => service.rotateKey(shortKey)).toThrow(EncryptionError);
    });

    it('throws EncryptionError when rotating with an empty string', () => {
      expect(() => service.rotateKey('')).toThrow(EncryptionError);
    });

    it('rotateKey with a valid 32-byte hex key (base64 encoded) succeeds', () => {
      // 64 hex chars = 32 bytes
      const hexKey =
        'fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210';
      const b64Key = Buffer.from(hexKey, 'hex').toString('base64');
      expect(() => service.rotateKey(b64Key)).not.toThrow();
    });
  });

  // ── getKeyCount ────────────────────────────────────────────────────────────

  describe('getKeyCount', () => {
    it('returns 1 when initialised with a single key', () => {
      expect(service.getKeyCount()).toBe(1);
    });

    it('returns 2 after one rotation', () => {
      service.rotateKey(KEY_B);
      expect(service.getKeyCount()).toBe(2);
    });

    it('returns 3 after two rotations', () => {
      service.rotateKey(KEY_B);
      service.rotateKey(KEY_C);
      expect(service.getKeyCount()).toBe(3);
    });
  });

  // ── multi-key initialisation ───────────────────────────────────────────────

  describe('multi-key initialisation via ENCRYPTION_KEYS', () => {
    let multiService: EncryptionService;

    beforeEach(async () => {
      const keysJson = JSON.stringify([KEY_A, KEY_B]);
      const module = await buildModule((key) => {
        if (key === 'ENCRYPTION_KEYS') return keysJson;
        return undefined;
      });
      multiService = module.get<EncryptionService>(EncryptionService);
    });

    it('reports correct key count', () => {
      expect(multiService.getKeyCount()).toBe(2);
    });

    it('encrypts with the first (newest) key', async () => {
      const encrypted = await multiService.encrypt('multi-key test');
      // A service with only KEY_A should decrypt it
      const singleModule = await buildModule((key) => {
        if (key === 'ENCRYPTION_KEY_BASE64') return KEY_A;
        return undefined;
      });
      const singleService =
        singleModule.get<EncryptionService>(EncryptionService);
      expect(await singleService.decrypt(encrypted)).toBe('multi-key test');
    });

    it('decrypts data encrypted with the second (older) key', async () => {
      // Encrypt with KEY_B only
      const oldModule = await buildModule((key) => {
        if (key === 'ENCRYPTION_KEY_BASE64') return KEY_B;
        return undefined;
      });
      const oldService = oldModule.get<EncryptionService>(EncryptionService);
      const encrypted = await oldService.encrypt('legacy data');
      // Multi-key service should fall back to KEY_B
      expect(await multiService.decrypt(encrypted)).toBe('legacy data');
    });
  });

  // ── error class identity ───────────────────────────────────────────────────

  describe('error class identity', () => {
    it('EncryptionError is an instance of Error', async () => {
      try {
        await service.encrypt('');
      } catch (err) {
        expect(err).toBeInstanceOf(Error);
        expect(err).toBeInstanceOf(EncryptionError);
      }
    });

    it('DecryptionFailedError is an instance of Error', async () => {
      try {
        await service.decrypt('bad');
      } catch (err) {
        expect(err).toBeInstanceOf(Error);
        expect(err).toBeInstanceOf(DecryptionFailedError);
      }
    });
  });
});
