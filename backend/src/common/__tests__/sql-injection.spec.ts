import { ArgumentMetadata } from '@nestjs/common';
import { SanitizePipe, SanitizeValidationPipe } from '../pipes/sanitize.pipe';

const META: ArgumentMetadata = { type: 'body', metatype: String, data: '' };

// Known SQL injection payloads
const SQL_PAYLOADS = [
  "' OR '1'='1",
  "'; DROP TABLE users; --",
  '1; SELECT * FROM properties',
  '1 UNION SELECT username, password FROM users',
  "admin'--",
  "1' AND 1=1--",
  '1 OR 1=1',
  "'; INSERT INTO users VALUES ('hacker','hacked'); --",
  "' OR 'x'='x",
  "1; UPDATE users SET password='hacked' WHERE '1'='1",
  '" OR ""="',
  '`; DROP TABLE webhook_endpoints; --`',
  "EXEC xp_cmdshell('dir')",
  'ALTER TABLE users ADD admin BOOLEAN',
  '1; DELETE FROM properties --',
];

// Known XSS payloads
const XSS_PAYLOADS = [
  '<script>alert("xss")</script>',
  'javascript:alert(1)',
  '<img onerror="alert(1)" src="x">',
  '<iframe src="evil.com">',
  '<object data="evil.swf">',
  '<embed src="evil.swf">',
  'onload=alert(1)',
  "onclick=window.location='http://evil.com'",
];

// Inputs that must pass through unchanged (benign)
const BENIGN_INPUTS = [
  'normal property description',
  '42 Lagos Street, Victoria Island',
  'john.doe@example.com',
  'Password123',
  '2 bedroom apartment',
  'Looking for a 3-bedroom house in Lekki',
  'Budget: ₦500,000/month',
];

describe('SanitizePipe — SQL injection prevention', () => {
  let pipe: SanitizePipe;

  beforeEach(() => {
    pipe = new SanitizePipe();
  });

  it('returns null and undefined unchanged', () => {
    expect(pipe.transform(null, META)).toBeNull();
    expect(pipe.transform(undefined, META)).toBeUndefined();
  });

  it('passes benign inputs through without modification of meaningful content', () => {
    for (const input of BENIGN_INPUTS) {
      const result = pipe.transform(input, META) as string;
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    }
  });

  it('strips null bytes from string inputs', () => {
    const result = pipe.transform('hello\0world', META) as string;
    expect(result).not.toContain('\0');
  });

  it('sanitizes XSS payloads by escaping or removing dangerous content', () => {
    for (const payload of XSS_PAYLOADS) {
      const result = pipe.transform(payload, META) as string;
      expect(result).not.toMatch(/<script/i);
      expect(result).not.toMatch(/javascript:/i);
      expect(result).not.toMatch(/<iframe/i);
      expect(result).not.toMatch(/<object/i);
      expect(result).not.toMatch(/<embed/i);
    }
  });

  it('sanitizes all string values in a nested object', () => {
    const input = {
      name: 'Alice',
      bio: '<script>alert("xss")</script>',
      address: { street: '1 Main St\0' },
    };
    const result = pipe.transform(input, META) as any;
    expect(result.bio).not.toContain('<script');
    expect(result.address.street).not.toContain('\0');
    expect(result.name).toBe('Alice');
  });

  it('sanitizes each element in an array', () => {
    const input = ['safe text', '<script>alert(1)</script>', 'also safe'];
    const result = pipe.transform(input, META) as string[];
    expect(result[1]).not.toContain('<script');
    expect(result[0]).toBe('safe text');
  });

  it('passes numbers and booleans through unchanged', () => {
    expect(pipe.transform(42, META)).toBe(42);
    expect(pipe.transform(true, META)).toBe(true);
  });
});

describe('SanitizeValidationPipe — SQL injection prevention', () => {
  let pipe: SanitizeValidationPipe;

  beforeEach(() => {
    pipe = new SanitizeValidationPipe();
  });

  describe('blocks SQL injection patterns', () => {
    const sqlKeywordPayloads = [
      'SELECT * FROM users',
      "INSERT INTO properties VALUES (1, 'x')",
      "UPDATE users SET role='admin'",
      'DELETE FROM properties',
      'DROP TABLE users',
      'CREATE TABLE evil (id INT)',
      'ALTER TABLE users ADD COLUMN evil TEXT',
      "EXEC sp_executesql('DROP TABLE users')",
      "EXECUTE IMMEDIATE 'SELECT 1'",
    ];

    for (const payload of sqlKeywordPayloads) {
      it(`rejects payload containing SQL keyword: "${payload.slice(0, 30)}..."`, () => {
        expect(() => pipe.transform(payload, META)).toThrow();
      });
    }
  });

  describe('blocks SQL punctuation injection', () => {
    const punctuationPayloads = [
      "' OR 1=1--",
      "'; --",
      '"; DROP TABLE users; --',
      '1`; --',
    ];

    for (const payload of punctuationPayloads) {
      it(`rejects payload: "${payload.slice(0, 30)}"`, () => {
        expect(() => pipe.transform(payload, META)).toThrow();
      });
    }
  });

  describe('blocks boolean-based injection', () => {
    const boolPayloads = ['1 OR 1=1', '1 AND 1=1', "x' OR 3=3--"];

    for (const payload of boolPayloads) {
      it(`rejects boolean injection: "${payload}"`, () => {
        expect(() => pipe.transform(payload, META)).toThrow();
      });
    }
  });

  describe('blocks XSS patterns', () => {
    for (const payload of XSS_PAYLOADS) {
      it(`rejects XSS payload: "${payload.slice(0, 30)}"`, () => {
        expect(() => pipe.transform(payload, META)).toThrow();
      });
    }
  });

  describe('allows safe inputs', () => {
    const safeInputs = [
      'My name is Alice',
      'Looking for a flat in Ikeja',
      'Budget is 500000',
      'Available from 2027-01-01',
      'contact@example.com',
      '3 bedroom duplex',
    ];

    for (const input of safeInputs) {
      it(`allows safe input: "${input}"`, () => {
        expect(() => pipe.transform(input, META)).not.toThrow();
      });
    }
  });

  it('rejects SQL injection within a nested object field', () => {
    const input = {
      name: 'Alice',
      address: "'; DROP TABLE properties; --",
    };
    expect(() => pipe.transform(input, META)).toThrow();
  });

  it('rejects SQL injection within an array element', () => {
    const input = ['safe', 'SELECT * FROM users', 'also safe'];
    expect(() => pipe.transform(input, META)).toThrow();
  });

  it('returns null and undefined unchanged', () => {
    expect(pipe.transform(null, META)).toBeNull();
    expect(pipe.transform(undefined, META)).toBeUndefined();
  });
});
