import { BadRequestException } from '@nestjs/common';
import { SanitizationPipe, LightSanitizationPipe } from './sanitization.pipe';

describe('SanitizationPipe', () => {
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
      ).toThrow(BadRequestException);
    });

    it('should reject javascript: URLs', () => {
      expect(() =>
        pipe.transform('javascript:alert("xss")', {
          type: 'body',
          metatype: String,
        }),
      ).toThrow(BadRequestException);
    });

    it('should reject onclick handlers', () => {
      expect(() =>
        pipe.transform('onclick=alert("xss")', {
          type: 'body',
          metatype: String,
        }),
      ).toThrow(BadRequestException);
    });

    it('should reject iframe tags', () => {
      expect(() =>
        pipe.transform('<iframe src="evil.com"></iframe>', {
          type: 'body',
          metatype: String,
        }),
      ).toThrow(BadRequestException);
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

    it('should normalize unicode', () => {
      // NFD form: é = e + combining acute accent
      const nfdString = 'café';
      const result = pipe.transform(nfdString, {
        type: 'body',
        metatype: String,
      });
      // Should be normalized to NFC
      expect(result.normalize('NFC')).toBe(result);
    });

    it('should strip HTML tags', () => {
      const result = pipe.transform('<b>bold</b> text', {
        type: 'body',
        metatype: String,
      });
      expect(result).not.toContain('<');
      expect(result).not.toContain('>');
    });

    it('should encode special characters', () => {
      // Note: HTML tags are stripped first, then special chars are encoded
      // So < and > are removed by stripHtmlTags before encoding
      const result = pipe.transform('a & b', {
        type: 'body',
        metatype: String,
      });
      expect(result).toContain('&amp;');
    });

    it('should handle quotes properly', () => {
      const result = pipe.transform('say "hello" and \'world\'', {
        type: 'body',
        metatype: String,
      });
      expect(result).toContain('&quot;');
      expect(result).toContain('&#x27;');
    });
  });

  describe('Object Sanitization', () => {
    it('should sanitize nested objects', () => {
      const input = {
        name: '  John  ',
        address: {
          city: '  New York  ',
        },
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

  describe('Length Validation', () => {
    it('should reject strings exceeding max length', () => {
      const longString = 'a'.repeat(20000);

      expect(() =>
        pipe.transform(longString, { type: 'body', metatype: String }),
      ).toThrow(BadRequestException);
    });
  });

  describe('Passthrough', () => {
    it('should pass through null values', () => {
      const result = pipe.transform(null, { type: 'body', metatype: String });
      expect(result).toBeNull();
    });

    it('should pass through undefined values', () => {
      const result = pipe.transform(undefined, {
        type: 'body',
        metatype: String,
      });
      expect(result).toBeUndefined();
    });

    it('should pass through numbers', () => {
      const result = pipe.transform(42, { type: 'body', metatype: Number });
      expect(result).toBe(42);
    });

    it('should not transform params', () => {
      const result = pipe.transform('  test  ', {
        type: 'param',
        metatype: String,
      });
      expect(result).toBe('  test  ');
    });
  });
});

describe('LightSanitizationPipe', () => {
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
