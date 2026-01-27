/**
 * Security Test Suite
 * Tests for all security-related features implemented in #34
 *
 * Run with: npm run test -- --testPathPattern=security.spec
 */

import { SanitizationPipe, LightSanitizationPipe } from './pipes/sanitization.pipe';
import { containsSqlInjection } from './guards/sql-injection.guard';
import { sanitizeBody } from './middleware/logger.middleware';
import {
  encrypt,
  decrypt,
  hash,
  generateSecureToken,
  maskSensitiveData,
  timingSafeEqual,
} from './utils/encryption.util';
import {
  SQL_INJECTION_PATTERNS,
  XSS_PATTERNS,
  PASSWORD_POLICY,
  ALLOWED_FILE_EXTENSIONS,
} from './constants/security.constants';

describe('Security Features Test Suite', () => {
  describe('Input Sanitization', () => {
    let pipe: SanitizationPipe;

    beforeEach(() => {
      pipe = new SanitizationPipe();
    });

    describe('XSS Prevention', () => {
      it('should reject script tags', () => {
        expect(() =>
          pipe.transform('<script>alert("xss")</script>', {
            type: 'body',
            metatype: String,
          }),
        ).toThrow();
      });

      it('should reject javascript: URLs', () => {
        expect(() =>
          pipe.transform('javascript:alert("xss")', {
            type: 'body',
            metatype: String,
          }),
        ).toThrow();
      });

      it('should reject event handlers', () => {
        expect(() =>
          pipe.transform('onclick=alert("xss")', {
            type: 'body',
            metatype: String,
          }),
        ).toThrow();
      });

      it('should reject iframe tags', () => {
        expect(() =>
          pipe.transform('<iframe src="evil.com"></iframe>', {
            type: 'body',
            metatype: String,
          }),
        ).toThrow();
      });

      it('should allow safe strings', () => {
        const result = pipe.transform('Hello World', {
          type: 'body',
          metatype: String,
        });
        expect(result).toBe('Hello World');
      });
    });

    describe('String Sanitization', () => {
      it('should trim whitespace', () => {
        const result = pipe.transform('  hello  ', {
          type: 'body',
          metatype: String,
        });
        expect(result).toBe('hello');
      });

      it('should strip HTML tags', () => {
        const result = pipe.transform('<b>bold</b> text', {
          type: 'body',
          metatype: String,
        });
        expect(result).not.toContain('<');
        expect(result).not.toContain('>');
      });

      it('should reject strings exceeding max length', () => {
        const longString = 'a'.repeat(20000);
        expect(() =>
          pipe.transform(longString, { type: 'body', metatype: String }),
        ).toThrow();
      });
    });

    describe('Object Sanitization', () => {
      it('should sanitize nested objects', () => {
        const input = {
          name: '  John  ',
          address: { city: '  New York  ' },
        };
        const result = pipe.transform(input, { type: 'body', metatype: Object });
        expect(result.name).toBe('John');
        expect(result.address.city).toBe('New York');
      });

      it('should sanitize arrays', () => {
        const input = ['  item1  ', '  item2  '];
        const result = pipe.transform(input, { type: 'body', metatype: Array });
        expect(result[0]).toBe('item1');
        expect(result[1]).toBe('item2');
      });
    });
  });

  describe('SQL Injection Prevention', () => {
    it('should detect SELECT injection', () => {
      expect(containsSqlInjection('SELECT * FROM users')).toBe(true);
    });

    it('should detect DROP injection', () => {
      expect(containsSqlInjection("'; DROP TABLE users; --")).toBe(true);
    });

    it('should detect UNION injection', () => {
      expect(containsSqlInjection("1 UNION SELECT password FROM users")).toBe(true);
    });

    it('should detect OR 1=1 pattern', () => {
      expect(containsSqlInjection("' OR 1=1 --")).toBe(true);
    });

    it('should detect SQL comments', () => {
      expect(containsSqlInjection('admin--')).toBe(true);
    });

    it('should allow safe strings', () => {
      expect(containsSqlInjection('John Doe')).toBe(false);
      expect(containsSqlInjection('test@example.com')).toBe(false);
    });
  });

  describe('Log Sanitization', () => {
    it('should redact passwords', () => {
      const result = sanitizeBody({ password: 'secret123' });
      expect(result.password).toBe('[REDACTED]');
    });

    it('should redact tokens', () => {
      const result = sanitizeBody({ token: 'abc123', accessToken: 'xyz789' });
      expect(result.token).toBe('[REDACTED]');
      expect(result.accessToken).toBe('[REDACTED]');
    });

    it('should mask email addresses', () => {
      const result = sanitizeBody({ email: 'test@example.com' });
      expect(result.email).toBe('***@example.com');
    });

    it('should mask wallet addresses', () => {
      const result = sanitizeBody({
        walletAddress: 'GBXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
      });
      expect(result.walletAddress).toMatch(/^GBXX\.\.\.XXXX$/);
    });

    it('should handle nested objects', () => {
      const result = sanitizeBody({
        user: {
          password: 'secret',
          email: 'test@example.com',
        },
      });
      expect(result.user.password).toBe('[REDACTED]');
      expect(result.user.email).toBe('***@example.com');
    });
  });

  describe('Encryption Utilities', () => {
    const testData = 'sensitive data to encrypt';
    const testSecret = 'test-secret-key-32-chars-long!!!';

    it('should encrypt and decrypt data correctly', () => {
      const encrypted = encrypt(testData, testSecret);
      const decrypted = decrypt(encrypted, testSecret);
      expect(decrypted).toBe(testData);
    });

    it('should produce different ciphertext for same plaintext', () => {
      const encrypted1 = encrypt(testData, testSecret);
      const encrypted2 = encrypt(testData, testSecret);
      expect(encrypted1).not.toBe(encrypted2); // Due to random IV
    });

    it('should fail to decrypt with wrong key', () => {
      const encrypted = encrypt(testData, testSecret);
      expect(() => decrypt(encrypted, 'wrong-key')).toThrow();
    });

    it('should generate secure tokens', () => {
      const token1 = generateSecureToken(32);
      const token2 = generateSecureToken(32);
      expect(token1.length).toBe(64); // 32 bytes = 64 hex chars
      expect(token1).not.toBe(token2);
    });

    it('should hash data consistently', () => {
      const hash1 = hash('test');
      const hash2 = hash('test');
      expect(hash1).toBe(hash2);
    });

    it('should mask sensitive data', () => {
      const masked = maskSensitiveData('1234567890', 2);
      expect(masked).toBe('12******90');
    });

    it('should perform timing-safe comparison', () => {
      expect(timingSafeEqual('abc', 'abc')).toBe(true);
      expect(timingSafeEqual('abc', 'abd')).toBe(false);
      expect(timingSafeEqual('abc', 'abcd')).toBe(false);
    });
  });

  describe('Security Constants', () => {
    it('should have SQL injection patterns defined', () => {
      expect(SQL_INJECTION_PATTERNS.length).toBeGreaterThan(0);
    });

    it('should have XSS patterns defined', () => {
      expect(XSS_PATTERNS.length).toBeGreaterThan(0);
    });

    it('should have password policy defined', () => {
      expect(PASSWORD_POLICY.MIN_LENGTH).toBeGreaterThanOrEqual(8);
      expect(PASSWORD_POLICY.REQUIRE_UPPERCASE).toBe(true);
      expect(PASSWORD_POLICY.REQUIRE_LOWERCASE).toBe(true);
      expect(PASSWORD_POLICY.REQUIRE_NUMBER).toBe(true);
      expect(PASSWORD_POLICY.REQUIRE_SPECIAL).toBe(true);
    });

    it('should have allowed file extensions defined', () => {
      expect(ALLOWED_FILE_EXTENSIONS).toContain('.jpg');
      expect(ALLOWED_FILE_EXTENSIONS).toContain('.pdf');
      expect(ALLOWED_FILE_EXTENSIONS).not.toContain('.exe');
      expect(ALLOWED_FILE_EXTENSIONS).not.toContain('.php');
    });
  });

  describe('XSS Pattern Detection', () => {
    const testXss = (pattern: RegExp, input: string) => pattern.test(input);

    it('should detect script tags', () => {
      const pattern = XSS_PATTERNS.find((p) => p.source.includes('script'));
      expect(pattern).toBeDefined();
      expect(testXss(pattern!, '<script>alert(1)</script>')).toBe(true);
    });

    it('should detect event handlers', () => {
      const pattern = XSS_PATTERNS.find((p) => p.source.includes('on\\w+'));
      expect(pattern).toBeDefined();
      expect(testXss(pattern!, 'onclick=alert(1)')).toBe(true);
      expect(testXss(pattern!, 'onerror=alert(1)')).toBe(true);
    });
  });

  describe('Light Sanitization Pipe', () => {
    let pipe: LightSanitizationPipe;

    beforeEach(() => {
      pipe = new LightSanitizationPipe();
    });

    it('should trim strings without XSS checks', () => {
      const result = pipe.transform('  <b>hello</b>  ', {
        type: 'body',
        metatype: String,
      });
      expect(result).toBe('<b>hello</b>');
    });

    it('should allow HTML content', () => {
      const html = '<script>console.log("test")</script>';
      const result = pipe.transform(html, { type: 'body', metatype: String });
      expect(result).toBe(html);
    });
  });
});
