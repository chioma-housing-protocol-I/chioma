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

// Tier A vars that are now hard-required in staging/production.
const requiredDeployedExtras = {
  STELLAR_NETWORK: 'mainnet',
  SOROBAN_RPC_URL: 'https://soroban-mainnet.stellar.org',
  AWS_ACCESS_KEY_ID: 'aws-key',
  AWS_SECRET_ACCESS_KEY: 'aws-secret',
  AWS_REGION: 'us-east-1',
  AWS_S3_BUCKET: 'chioma-bucket',
  PAYMENT_WEBHOOK_SECRET: 'payment-webhook-secret-value',
  WEBHOOK_SIGNATURE_SECRET: 'webhook-signature-secret-value',
  EMAIL_USER: 'noreply@chioma.app',
  EMAIL_PASSWORD: 'email-password-value',
  EMAIL_FROM: 'noreply@chioma.app',
  FRONTEND_URL: 'https://app.chioma.app',
  API_BASE_URL: 'https://api.chioma.app',
  CORS_ORIGINS: 'https://app.chioma.app',
  SECURITY_SESSION_SECRET: 'c'.repeat(32),
};

const validProduction = {
  NODE_ENV: 'production',
  ...baseRateLimits,
  ...validJwt,
  ...requiredDeployedExtras,
  DATABASE_URL: 'postgresql://user:pass@host/db?sslmode=require',
  REDIS_URL: 'https://example.upstash.io',
  REDIS_TOKEN: 'token',
  ENCRYPTION_KEY_BASE64: Buffer.alloc(32, 1).toString('base64'),
  SECURITY_ENCRYPTION_KEY: 'a'.repeat(64),
  PAYMENT_METADATA_SECRET: 'prod-payment-metadata-secret-value',
  SENTRY_DSN: 'https://examplePublicKey@o0.ingest.sentry.io/0',
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
        ...requiredDeployedExtras,
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

  describe('newly-covered tier A vars', () => {
    it('rejects production missing AWS storage config', () => {
      expect(() =>
        validateEnvironment({
          ...validProduction,
          AWS_ACCESS_KEY_ID: undefined,
        }),
      ).toThrow(/AWS_ACCESS_KEY_ID/);
    });

    it('rejects production missing SENTRY_DSN', () => {
      expect(() =>
        validateEnvironment({
          ...validProduction,
          SENTRY_DSN: undefined,
        }),
      ).toThrow(/SENTRY_DSN/);
    });

    it('does not require SENTRY_DSN in staging', () => {
      expect(() =>
        validateEnvironment({
          NODE_ENV: 'staging',
          ...baseRateLimits,
          ...validJwt,
          ...requiredDeployedExtras,
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

    it('does not require deployed-tier vars in development', () => {
      expect(() =>
        validateEnvironment({
          NODE_ENV: 'development',
          ...baseRateLimits,
          ...validJwt,
        }),
      ).not.toThrow();
    });
  });

  describe('tier B: feature-conditional vars', () => {
    it('requires PAYSTACK_SECRET_KEY when PAYMENT_GATEWAY=paystack', () => {
      expect(() =>
        validateEnvironment({
          ...validProduction,
          PAYMENT_GATEWAY: 'paystack',
        }),
      ).toThrow(/PAYSTACK_SECRET_KEY/);
    });

    it('passes with PAYMENT_GATEWAY=paystack and PAYSTACK_SECRET_KEY set', () => {
      expect(() =>
        validateEnvironment({
          ...validProduction,
          PAYMENT_GATEWAY: 'paystack',
          PAYSTACK_SECRET_KEY: 'sk_live_example',
        }),
      ).not.toThrow();
    });

    it('does not require PAYSTACK_SECRET_KEY on the default mock gateway', () => {
      expect(() => validateEnvironment(validProduction)).not.toThrow();
    });

    it('requires TransUnion vars when screening provider is transunion_smartmove', () => {
      expect(() =>
        validateEnvironment({
          ...validProduction,
          USER_SCREENING_DEFAULT_PROVIDER: 'transunion_smartmove',
        }),
      ).toThrow(/TRANSUNION_SMARTMOVE/);
    });

    it('does not require TransUnion vars when no screening provider is set', () => {
      expect(() => validateEnvironment(validProduction)).not.toThrow();
    });
  });

  describe('tier C: format-validated when present, optional otherwise', () => {
    it('accepts production without any Stellar contract IDs set', () => {
      expect(() => validateEnvironment(validProduction)).not.toThrow();
    });

    it('rejects a malformed CHIOMA_CONTRACT_ID', () => {
      expect(() =>
        validateEnvironment({
          ...validProduction,
          CHIOMA_CONTRACT_ID: 'not-a-real-contract-id',
        }),
      ).toThrow(/CHIOMA_CONTRACT_ID/);
    });

    it('accepts a well-formed CHIOMA_CONTRACT_ID', () => {
      expect(() =>
        validateEnvironment({
          ...validProduction,
          CHIOMA_CONTRACT_ID: `C${'A'.repeat(55)}`,
        }),
      ).not.toThrow();
    });

    it('rejects a malformed STELLAR_ADMIN_SECRET_KEY', () => {
      expect(() =>
        validateEnvironment({
          ...validProduction,
          STELLAR_ADMIN_SECRET_KEY: 'not-a-real-secret-key',
        }),
      ).toThrow(/STELLAR_ADMIN_SECRET_KEY/);
    });
  });
});
