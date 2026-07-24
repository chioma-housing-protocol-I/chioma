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
  JWT_SECRET: 'a'.repeat(32),
  JWT_REFRESH_SECRET: 'b'.repeat(32),
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
