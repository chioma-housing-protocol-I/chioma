import { validateEnvironment } from './env.validation';

const baseRateLimits = {
  RATE_LIMIT_TTL: '60000',
  RATE_LIMIT_MAX: '100',
  RATE_LIMIT_AUTH_TTL: '60000',
  RATE_LIMIT_AUTH_MAX: '5',
  RATE_LIMIT_STRICT_TTL: '60000',
  RATE_LIMIT_STRICT_MAX: '10',
};

const validJwt = {
  JWT_SECRET: 'c+/BvbdsahHWA/BN3Uc783i2n/aGwpidvqpOLEmwgbaDnAp/',
  JWT_REFRESH_SECRET: 'OXufQVF2B2HgRSy1iRR2Jrm77LA8UbTbeEDr1jgJzsJZASza',
};

const validProduction = {
  NODE_ENV: 'production',
  ...baseRateLimits,
  ...validJwt,
  DATABASE_URL: 'postgresql://user:pass@host/db?sslmode=require',
  REDIS_URL: 'https://example.upstash.io',
  REDIS_TOKEN: 'token',
  ENCRYPTION_KEY_BASE64: Buffer.alloc(32, 1).toString('base64'),
  SECURITY_ENCRYPTION_KEY: 'a'.repeat(64),
  PAYMENT_METADATA_SECRET: 'prod-payment-metadata-secret-value',
};

describe('validateEnvironment', () => {
  it('passes for test environment with rate limits only', () => {
    expect(() =>
      validateEnvironment({
        NODE_ENV: 'test',
        ...baseRateLimits,
      }),
    ).not.toThrow();
  });

  it('rejects missing rate limit variables', () => {
    expect(() =>
      validateEnvironment({
        NODE_ENV: 'test',
        RATE_LIMIT_TTL: '60000',
      }),
    ).toThrow(/RATE_LIMIT_MAX/);
  });

  it('rejects production config with placeholder JWT secrets', () => {
    expect(() =>
      validateEnvironment({
        ...validProduction,
        JWT_SECRET: 'your-super-secret-key-minimum-32-characters-long',
      }),
    ).toThrow(/placeholder/i);
  });

  it('rejects production config without database settings', () => {
    expect(() =>
      validateEnvironment({
        ...validProduction,
        DATABASE_URL: undefined,
        DB_HOST: undefined,
      }),
    ).toThrow(/Database config required/);
  });

  it('rejects production config without redis settings', () => {
    expect(() =>
      validateEnvironment({
        ...validProduction,
        REDIS_URL: undefined,
        REDIS_TOKEN: undefined,
        REDIS_HOST: undefined,
      }),
    ).toThrow(/Redis config required/);
  });

  it('accepts valid production configuration', () => {
    expect(() => validateEnvironment(validProduction)).not.toThrow();
  });

  it('rejects a JWT secret shorter than 32 bytes', () => {
    expect(() =>
      validateEnvironment({
        ...validProduction,
        JWT_SECRET: 'short-secret-value-only-20b',
      }),
    ).toThrow(/JWT_SECRET must be at least 32 bytes/);
  });

  it('rejects a JWT secret that is long enough but low-entropy (repeated character)', () => {
    expect(() =>
      validateEnvironment({
        ...validProduction,
        JWT_SECRET: 'a'.repeat(40),
      }),
    ).toThrow(/JWT_SECRET does not have enough entropy/);
  });

  it('rejects a JWT secret padded with a short repeating pattern', () => {
    expect(() =>
      validateEnvironment({
        ...validProduction,
        JWT_REFRESH_SECRET: 'ab'.repeat(20),
      }),
    ).toThrow(/JWT_REFRESH_SECRET does not have enough entropy/);
  });

  it('rejects a missing JWT secret with operator guidance in the message', () => {
    expect(() =>
      validateEnvironment({
        ...validProduction,
        JWT_SECRET: undefined,
      }),
    ).toThrow(/openssl rand -base64 48/);
  });

  it('accepts a high-entropy secret using multi-byte characters once its byte length clears the minimum', () => {
    // Multi-byte characters inflate byte length relative to character count;
    // this secret is well past 32 bytes despite being a short character run.
    expect(() =>
      validateEnvironment({
        ...validProduction,
        JWT_SECRET: 'Kx7!密语véryRandØm#92pQ&fz—unicode✓salt',
      }),
    ).not.toThrow();
  });

  it('accepts staging with classic redis host', () => {
    expect(() =>
      validateEnvironment({
        NODE_ENV: 'staging',
        ...baseRateLimits,
        ...validJwt,
        DB_HOST: 'localhost',
        DB_USERNAME: 'postgres',
        DB_PASSWORD: 'secret',
        DB_NAME: 'chioma',
        REDIS_HOST: 'localhost',
        REDIS_PORT: '6379',
        ENCRYPTION_KEY_BASE64: Buffer.alloc(32, 2).toString('base64'),
        SECURITY_ENCRYPTION_KEY: 'c'.repeat(64),
      }),
    ).not.toThrow();
  });
});
