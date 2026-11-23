import {
  getCorsConfig,
  parseCorsOrigins,
  validateCorsConfig,
} from './cors.config';

describe('CORS configuration validation (#2181)', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.NODE_ENV = 'test';
    delete process.env.CORS_ORIGINS;
    delete process.env.FRONTEND_URL;
  });

  afterAll(() => {
    process.env = { ...originalEnv };
  });

  it('parses valid origins and wildcard subdomains once', () => {
    process.env.CORS_ORIGINS = 'https://app.example.com, *.example.com';

    expect(parseCorsOrigins()).toEqual([
      'https://app.example.com',
      '*.example.com',
    ]);
    expect(() => validateCorsConfig()).not.toThrow();
  });

  it('fails startup validation for invalid URL formats', () => {
    for (const invalid of [
      'not-a-url',
      'ftp://example.com',
      'https://',
      'https://exa mple.com',
      'https://example.com/path',
    ]) {
      process.env.CORS_ORIGINS = invalid;
      expect(() => validateCorsConfig()).toThrow(/Invalid CORS origin/);
    }
  });

  it('fails startup validation for empty whitelist entries', () => {
    process.env.CORS_ORIGINS = 'https://a.example.com,,https://b.example.com';

    expect(() => validateCorsConfig()).toThrow(/Invalid CORS origin/);
  });

  it('allows only whitelisted origins through the CORS callback', () => {
    process.env.CORS_ORIGINS = 'https://app.example.com,*.example.com';
    const config = getCorsConfig();
    const origin = config.origin as (
      origin: string,
      callback: (error: Error | null, allow?: boolean) => void,
    ) => void;
    const callback = jest.fn();

    origin('https://app.example.com', callback);
    origin('https://api.example.com', callback);
    origin('https://evil.test', callback);

    expect(callback).toHaveBeenNthCalledWith(1, null, true);
    expect(callback).toHaveBeenNthCalledWith(2, null, true);
    expect(callback).toHaveBeenNthCalledWith(3, expect.any(Error));
  });
});
