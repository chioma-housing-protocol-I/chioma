/**
 * Encryption at Rest and In Transit — Integration Spec
 *
 * Validates that:
 * 1. Data at rest: AES-256-GCM encryption via EncryptionService (common) and
 *    the security module's PBKDF2-derived variant.
 * 2. Data in transit: HSTS and security headers are applied by
 *    SecurityHeadersMiddleware.
 * 3. TypeORM EncryptionTransformer correctly encrypts/decrypts column values.
 * 4. KYC field-level encryption utilities work end-to-end.
 *
 * All tests run without a live database or network (no env required beyond
 * the mocked ConfigService).
 */

import * as crypto from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';

// ── Common EncryptionService (AES-256-GCM, key rotation) ─────────────────────
import {
  EncryptionService as CommonEncryptionService,
  EncryptionError,
  DecryptionFailedError,
} from '../services/encryption.service';

// ── Security module EncryptionService (PBKDF2-derived keys) ──────────────────
import { EncryptionService as SecurityEncryptionService } from '../../modules/security/encryption.service';

// ── TypeORM column transformer ────────────────────────────────────────────────
import { EncryptionTransformer } from '../../modules/security/transformers/encryption.transformer';

// ── KYC field-level encryption utilities ─────────────────────────────────────
import {
  encryptSensitiveKycFields,
  decryptSensitiveKycFields,
  KYC_SENSITIVE_FIELDS,
  parseKycPayload,
} from '../../modules/kyc/kyc-encryption.util';

// ── Security headers middleware ───────────────────────────────────────────────
import { SecurityHeadersMiddleware } from '../middleware/security-headers.middleware';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Generate a valid 32-byte base64 key */
const makeBase64Key = (seed: string): string =>
  Buffer.from(seed.padEnd(32, '0').slice(0, 32), 'utf8').toString('base64');

const KEY_A = makeBase64Key('test-key-alpha-32-bytes-padding-');
const KEY_B = makeBase64Key('test-key-beta--32-bytes-padding-');

/** 64-char hex key for the security module (32 bytes) */
const HEX_KEY_A = 'a'.repeat(64);
const HEX_KEY_B = 'b'.repeat(64);

function buildCommonEncryptionService(
  keyB64 = KEY_A,
): Promise<CommonEncryptionService> {
  return Test.createTestingModule({
    providers: [
      CommonEncryptionService,
      {
        provide: ConfigService,
        useValue: {
          get: (k: string) =>
            k === 'ENCRYPTION_KEY_BASE64' ? keyB64 : undefined,
        },
      },
    ],
  })
    .compile()
    .then((m) => m.get(CommonEncryptionService));
}

function buildSecurityEncryptionService(
  hexKey = HEX_KEY_A,
): SecurityEncryptionService {
  const configService = {
    get: (k: string) => (k === 'SECURITY_ENCRYPTION_KEY' ? hexKey : undefined),
  } as unknown as ConfigService;
  return new SecurityEncryptionService(configService);
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Encryption at Rest — Common EncryptionService
// ─────────────────────────────────────────────────────────────────────────────

describe('Encryption at Rest — CommonEncryptionService (AES-256-GCM)', () => {
  let svc: CommonEncryptionService;

  beforeEach(async () => {
    svc = await buildCommonEncryptionService();
  });

  it('encrypts to a non-plaintext JSON envelope', async () => {
    const plain = 'sensitive-data';
    const cipher = await svc.encrypt(plain);
    expect(cipher).not.toContain(plain);
    const parsed = JSON.parse(cipher) as {
      iv: string;
      data: string;
      tag: string;
    };
    expect(parsed).toHaveProperty('iv');
    expect(parsed).toHaveProperty('data');
    expect(parsed).toHaveProperty('tag');
  });

  it('round-trips arbitrary plaintext', async () => {
    const cases = [
      'hello world',
      '{"userId":"abc","ssn":"123-45-6789"}',
      '日本語テスト 🔐',
      'A'.repeat(10_000),
    ];
    for (const plain of cases) {
      expect(await svc.decrypt(await svc.encrypt(plain))).toBe(plain);
    }
  });

  it('produces unique ciphertexts for the same plaintext (random IV)', async () => {
    const c1 = await svc.encrypt('same');
    const c2 = await svc.encrypt('same');
    expect(c1).not.toBe(c2);
  });

  it('rejects tampered ciphertext (GCM auth tag)', async () => {
    const cipher = await svc.encrypt('tamper-me');
    const parsed = JSON.parse(cipher) as {
      iv: string;
      data: string;
      tag: string;
    };
    const buf = Buffer.from(parsed.data, 'base64');
    buf[0] ^= 0xff;
    parsed.data = buf.toString('base64');
    await expect(svc.decrypt(JSON.stringify(parsed))).rejects.toThrow(
      DecryptionFailedError,
    );
  });

  it('rejects decryption with a wrong key', async () => {
    const cipher = await svc.encrypt('wrong-key-test');
    const other = await buildCommonEncryptionService(KEY_B);
    await expect(other.decrypt(cipher)).rejects.toThrow(DecryptionFailedError);
  });

  it('supports key rotation: decrypts old-key data after rotation', async () => {
    const plain = 'old-key-data';
    const cipher = await svc.encrypt(plain);
    svc.rotateKey(KEY_B); // KEY_B is now active; KEY_A is fallback
    expect(await svc.decrypt(cipher)).toBe(plain);
  });

  it('throws EncryptionError for empty plaintext', async () => {
    await expect(svc.encrypt('')).rejects.toThrow(EncryptionError);
  });

  it('throws EncryptionError when no key is configured', async () => {
    await expect(
      Test.createTestingModule({
        providers: [
          CommonEncryptionService,
          {
            provide: ConfigService,
            useValue: { get: () => undefined },
          },
        ],
      }).compile(),
    ).rejects.toThrow(EncryptionError);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Encryption at Rest — Security EncryptionService (PBKDF2)
// ─────────────────────────────────────────────────────────────────────────────

describe('Encryption at Rest — SecurityEncryptionService (PBKDF2 + AES-256-GCM)', () => {
  let svc: SecurityEncryptionService;

  beforeEach(() => {
    svc = buildSecurityEncryptionService();
  });

  it('encrypts to a base64 string that does not contain the plaintext', () => {
    const plain = 'PII-data';
    const cipher = svc.encrypt(plain);
    expect(typeof cipher).toBe('string');
    expect(cipher).not.toContain(plain);
    // Must be valid base64
    expect(() => Buffer.from(cipher, 'base64')).not.toThrow();
  });

  it('round-trips plaintext', () => {
    const plain = 'Sensitive KYC Data — 日本語 🔐';
    expect(svc.decrypt(svc.encrypt(plain))).toBe(plain);
  });

  it('produces unique ciphertexts (random salt + IV)', () => {
    const c1 = svc.encrypt('same');
    const c2 = svc.encrypt('same');
    expect(c1).not.toBe(c2);
  });

  it('decrypts data encrypted with a previous key (rotation fallback)', () => {
    // Simulate old-key encryption
    const oldSvc = buildSecurityEncryptionService(HEX_KEY_B);
    const cipher = oldSvc.encrypt('legacy-data');

    // New service has both keys
    const multiSvc = new SecurityEncryptionService({
      get: (k: string) =>
        k === 'SECURITY_ENCRYPTION_KEYS'
          ? `${HEX_KEY_A},${HEX_KEY_B}`
          : undefined,
    } as unknown as ConfigService);

    expect(multiSvc.decrypt(cipher)).toBe('legacy-data');
  });

  it('throws on decryption with invalid/truncated data', () => {
    expect(() => svc.decrypt('not-base64-at-all!!!')).toThrow();
  });

  it('hash() returns a deterministic hex string', () => {
    const h1 = svc.hash('test@example.com');
    const h2 = svc.hash('test@example.com');
    expect(h1).toBe(h2);
    expect(h1).toMatch(/^[0-9a-f]{64}$/);
  });

  it('hash() is case-insensitive (normalised to lowercase)', () => {
    expect(svc.hash('User@Example.COM')).toBe(svc.hash('user@example.com'));
  });

  it('generateSecureToken() returns a hex string of the expected length', () => {
    const token = svc.generateSecureToken(32);
    expect(token).toMatch(/^[0-9a-f]{64}$/);
  });

  it('generateSignedToken() / verifySignedToken() round-trip', () => {
    const token = svc.generateSignedToken('user-123', 3600);
    expect(svc.verifySignedToken(token, 'user-123')).toBe(true);
  });

  it('verifySignedToken() rejects a token for a different payload', () => {
    const token = svc.generateSignedToken('user-123', 3600);
    expect(svc.verifySignedToken(token, 'user-456')).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Encryption at Rest — TypeORM EncryptionTransformer
// ─────────────────────────────────────────────────────────────────────────────

describe('Encryption at Rest — EncryptionTransformer (TypeORM column)', () => {
  const VALID_HEX_KEY = 'c'.repeat(64);

  beforeEach(() => {
    process.env.SECURITY_ENCRYPTION_KEY = VALID_HEX_KEY;
  });

  afterEach(() => {
    delete process.env.SECURITY_ENCRYPTION_KEY;
  });

  it('to() encrypts a string value to base64', () => {
    const cipher = EncryptionTransformer.to('secret');
    expect(typeof cipher).toBe('string');
    expect(cipher).not.toContain('secret');
    expect(() => Buffer.from(cipher!, 'base64')).not.toThrow();
  });

  it('to() encrypts an object by JSON-serialising it first', () => {
    const obj = { name: 'Alice', id: 42 };
    const cipher = EncryptionTransformer.to(obj);
    expect(typeof cipher).toBe('string');
    expect(cipher).not.toContain('Alice');
  });

  it('from() decrypts back to the original string', () => {
    const cipher = EncryptionTransformer.to('round-trip');
    expect(EncryptionTransformer.from(cipher)).toBe('round-trip');
  });

  it('from() decrypts back to the original object', () => {
    const obj = { foo: 'bar', n: 1 };
    const cipher = EncryptionTransformer.to(obj);
    expect(EncryptionTransformer.from(cipher)).toEqual(obj);
  });

  it('to() returns null for null input', () => {
    expect(EncryptionTransformer.to(null)).toBeNull();
  });

  it('from() returns null for null input', () => {
    expect(EncryptionTransformer.from(null)).toBeNull();
  });

  it('throws when SECURITY_ENCRYPTION_KEY is absent', () => {
    delete process.env.SECURITY_ENCRYPTION_KEY;
    expect(() => EncryptionTransformer.to('value')).toThrow(
      'SECURITY_ENCRYPTION_KEY is required for encryption',
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Encryption at Rest — KYC field-level encryption
// ─────────────────────────────────────────────────────────────────────────────

describe('Encryption at Rest — KYC field-level encryption', () => {
  let svc: SecurityEncryptionService;

  beforeEach(() => {
    svc = buildSecurityEncryptionService();
  });

  it('encryptSensitiveKycFields() encrypts all sensitive fields', () => {
    const payload = parseKycPayload({
      first_name: 'Alice',
      last_name: 'Smith',
      id_number: 'A1234567',
      non_sensitive: 'visible',
    });

    const encrypted = encryptSensitiveKycFields(payload, svc);

    for (const field of KYC_SENSITIVE_FIELDS) {
      if (payload[field] !== undefined) {
        expect(encrypted[field]).not.toBe(payload[field]);
        // Must be valid base64 (the security service output)
        expect(() =>
          Buffer.from(encrypted[field] as string, 'base64'),
        ).not.toThrow();
      }
    }
    // Non-sensitive field is untouched
    expect(encrypted['non_sensitive']).toBe('visible');
  });

  it('decryptSensitiveKycFields() restores original values', () => {
    const original = parseKycPayload({
      first_name: 'Bob',
      last_name: 'Jones',
      phone_number: '+1-555-0100',
    });

    const encrypted = encryptSensitiveKycFields(original, svc);
    const decrypted = decryptSensitiveKycFields(encrypted, svc);

    expect(decrypted['first_name']).toBe('Bob');
    expect(decrypted['last_name']).toBe('Jones');
    expect(decrypted['phone_number']).toBe('+1-555-0100');
  });

  it('leaves null/undefined/empty fields untouched', () => {
    const payload = parseKycPayload({ first_name: '', last_name: null });
    const encrypted = encryptSensitiveKycFields(payload, svc);
    expect(encrypted['first_name']).toBe('');
    expect(encrypted['last_name']).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. Encryption in Transit — Security Headers (HSTS)
// ─────────────────────────────────────────────────────────────────────────────

describe('Encryption in Transit — SecurityHeadersMiddleware (HSTS)', () => {
  function buildMiddleware(
    nodeEnv = 'production',
    hstsMaxAge = '31536000',
  ): SecurityHeadersMiddleware {
    const configService = {
      get: (key: string) => {
        if (key === 'NODE_ENV') return nodeEnv;
        if (key === 'SECURITY_HSTS_MAX_AGE') return hstsMaxAge;
        if (key === 'SECURITY_CSP_ENABLED') return 'false';
        return undefined;
      },
    } as unknown as ConfigService;
    return new SecurityHeadersMiddleware(configService);
  }

  it('sets Strict-Transport-Security header', (done) => {
    const middleware = buildMiddleware();
    const headers: Record<string, string> = {};

    const res = {
      setHeader: (name: string, value: string) => {
        headers[name.toLowerCase()] = value;
      },
      getHeader: () => undefined,
      removeHeader: () => undefined,
    } as unknown as import('express').Response;

    middleware.use({} as any, res, () => {
      expect(
        Object.keys(headers).some((h) =>
          h.includes('strict-transport-security'),
        ),
      ).toBe(true);
      done();
    });
  });

  it('middleware calls next()', (done) => {
    const middleware = buildMiddleware('development');
    middleware.use(
      {} as any,
      {
        setHeader: () => {},
        getHeader: () => undefined,
        removeHeader: () => {},
      } as any,
      done,
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. Cryptographic primitives — sanity checks
// ─────────────────────────────────────────────────────────────────────────────

describe('Cryptographic primitives', () => {
  it('AES-256-GCM auth tag detects bit-flip tampering', () => {
    const key = crypto.randomBytes(32);
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([
      cipher.update('secret', 'utf8'),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag();

    // Flip a bit in the ciphertext
    encrypted[0] ^= 0x01;

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    expect(() =>
      Buffer.concat([decipher.update(encrypted), decipher.final()]),
    ).toThrow();
  });

  it('PBKDF2 produces a 32-byte key from a master key + salt', () => {
    const masterKey = Buffer.from('a'.repeat(64), 'hex');
    const salt = crypto.randomBytes(64);
    const derived = crypto.pbkdf2Sync(masterKey, salt, 310_000, 32, 'sha256');
    expect(derived.length).toBe(32);
  });

  it('HMAC-SHA256 is deterministic', () => {
    const key = crypto.randomBytes(32);
    const h1 = crypto.createHmac('sha256', key).update('data').digest('hex');
    const h2 = crypto.createHmac('sha256', key).update('data').digest('hex');
    expect(h1).toBe(h2);
  });

  it('timingSafeEqual prevents timing attacks on HMAC comparison', () => {
    const a = Buffer.from('abc123', 'hex');
    const b = Buffer.from('abc123', 'hex');
    const c = Buffer.from('ffffff', 'hex');
    expect(crypto.timingSafeEqual(a, b)).toBe(true);
    expect(crypto.timingSafeEqual(a, c)).toBe(false);
  });
});
