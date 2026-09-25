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
  SOROBAN_RPC_FALLBACK_URL: 'https://soroban-mainnet-fallback.stellar.org',
  STELLAR_HORIZON_URL: 'https://horizon.stellar.org',
  STELLAR_HORIZON_FALLBACK_URL: 'https://horizon-fallback.stellar.org',
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
  DEFAULT_ARBITER_ADDRESS: `G${'A'.repeat(55)}`,
};

const validProduction = {
  NODE_ENV: 'production',
  ...baseRateLimits,
  ...validJwt,
  ...requiredDeployedExtras,
  DATABASE_URL: 'postgresql://user:pass@host/db?sslmode=require',
  DB_ENCRYPTION_KEY: 'prod-db-encryption-key-value',
  DB_ENCRYPTION_KEY_VERSION: '1',
  DB_ENCRYPTION_ROTATION_DAYS: '90',
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

  it('rejects JWT secret with weak character set (only 2 unique characters)', () => {
    expect(() =>
      validateEnvironment({
        ...validProduction,
        JWT_SECRET: 'aAbBaAbBaAbBaAbBaAbBaAbBaAbBaAbBaAbBaAbBaAbB',
      }),
    ).toThrow(/weak character set diversity/);
  });

  it('rejects JWT secret with obvious repeating sequences (AAA...BBB...)', () => {
    expect(() =>
      validateEnvironment({
        ...validProduction,
        JWT_SECRET: 'A'.repeat(16) + 'B'.repeat(16) + 'C'.repeat(16),
      }),
    ).toThrow(/does not have enough entropy|weak character set diversity/);
  });

  it('accepts JWT secret with sufficient entropy and character diversity', () => {
    expect(() =>
      validateEnvironment({
        ...validProduction,
        JWT_SECRET: 'kX9#mP2$qL7&vR4!nF8@sD5%gH6^tB1*jW3(oI0)cE',
      }),
    ).not.toThrow();
  });

  it('accepts cryptographically strong base64 secrets', () => {
    // Generated with: openssl rand -base64 48
    const strongSecret = Buffer.from(
      new Uint8Array(48).map(() => Math.random() * 256),
    ).toString('base64');
    expect(() =>
      validateEnvironment({
        ...validProduction,
        JWT_SECRET: strongSecret,
      }),
    ).not.toThrow();
  });

  describe('entropy threshold enforcement (4.5 bits/char minimum)', () => {
    it('rejects secret with entropy below 4.5 bits/char', () => {
      // "AAABBBCCC..." has low entropy
      expect(() =>
        validateEnvironment({
          ...validProduction,
          JWT_SECRET: 'A'.repeat(12) + 'B'.repeat(12) + 'C'.repeat(12),
        }),
      ).toThrow(/does not have enough entropy/);
    });

    it('accepts secret with entropy at or above 4.5 bits/char', () => {
      // A good random 48-byte secret should pass
      const secretChars =
        'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
      let secret = '';
      for (let i = 0; i < 48; i++) {
        secret += secretChars.charAt(
          Math.floor(Math.random() * secretChars.length),
        );
      }
      expect(() =>
        validateEnvironment({
          ...validProduction,
          JWT_SECRET: secret,
        }),
      ).not.toThrow();
    });
  });

  describe('minimum length validation (32 bytes)', () => {
    it('rejects JWT secret less than 32 bytes', () => {
      expect(() =>
        validateEnvironment({
          ...validProduction,
          JWT_SECRET: 'short',
        }),
      ).toThrow(/JWT_SECRET must be at least 32 bytes/);
    });

    it('accepts JWT secret of exactly 32 bytes', () => {
      expect(() =>
        validateEnvironment({
          ...validProduction,
          JWT_SECRET: 'a'.repeat(32),
        }),
      ).toThrow(/does not have enough entropy/); // Still fails on entropy, but not length
    });

    it('accepts JWT secret greater than 32 bytes with sufficient entropy', () => {
      const secret = 'kX9#mP2$qL7&vR4!nF8@sD5%gH6^tB1*jW3(oI0)cE'.slice(0, 40);
      expect(() =>
        validateEnvironment({
          ...validProduction,
          JWT_SECRET: secret,
        }),
      ).not.toThrow();
    });
  });

  describe('character set diversity validation', () => {
    it('rejects secret with single unique character', () => {
      expect(() =>
        validateEnvironment({
          ...validProduction,
          JWT_SECRET: 'x'.repeat(48),
        }),
      ).toThrow(/weak character set diversity/);
    });

    it('rejects secret with only two unique characters', () => {
      expect(() =>
        validateEnvironment({
          ...validProduction,
          JWT_SECRET: 'xy'.repeat(24),
        }),
      ).toThrow(/weak character set diversity/);
    });

    it('accepts secret with diverse character set', () => {
      expect(() =>
        validateEnvironment({
          ...validProduction,
          JWT_SECRET: 'P@ssw0rd#Key$Secure&Random!Token123456789ABC',
        }),
      ).not.toThrow();
    });
  });

  describe('weak example secrets that should be rejected', () => {
    it('rejects "AAAA...AAAA" padding pattern', () => {
      expect(() =>
        validateEnvironment({
          ...validProduction,
          JWT_SECRET: Buffer.alloc(48, 'A').toString(),
        }),
      ).toThrow(/weak character set diversity|does not have enough entropy/);
    });

    it('rejects "123456789..." numeric sequences', () => {
      expect(() =>
        validateEnvironment({
          ...validProduction,
          JWT_SECRET: '12345678901234567890123456789012345678901234567890',
        }),
      ).toThrow(/does not have enough entropy/);
    });

    it('rejects "passwordpasswordpassword..." pattern', () => {
      expect(() =>
        validateEnvironment({
          ...validProduction,
          JWT_SECRET: 'password'.repeat(6),
        }),
      ).toThrow(/weak character set diversity|does not have enough entropy/);
    });
  });

  describe('strong example secrets that should be accepted', () => {
    it('accepts base64 output from openssl rand', () => {
      // Simulating: openssl rand -base64 48
      const base64Secret = 'rT9kL2pN5mQ8wE0dF3jG6hS1bV4cX7yZ+uI9oP/qR=';
      expect(() =>
        validateEnvironment({
          ...validProduction,
          JWT_SECRET: base64Secret.slice(0, 48).padEnd(48, 'A'),
        }),
      ).not.toThrow();
    });

    it('accepts base64url-encoded random bytes', () => {
      const base64UrlSecret = 'rT9kL2pN5mQ8wE0dF3jG6hS1bV4cX7yZ-uI9oP_qRaBCD';
      expect(() =>
        validateEnvironment({
          ...validProduction,
          JWT_SECRET: base64UrlSecret,
        }),
      ).not.toThrow();
    });

    it('accepts mixed alphanumeric with special characters', () => {
      expect(() =>
        validateEnvironment({
          ...validProduction,
          JWT_SECRET: 'eK$pL&mN@jQ!rS#tU%vW^xY*zA(bC)dE-fG+hI=jK',
        }),
      ).not.toThrow();
    });
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

    it('rejects production missing DB encryption key rotation config', () => {
      expect(() =>
        validateEnvironment({
          ...validProduction,
          DB_ENCRYPTION_ROTATION_DAYS: undefined,
        }),
      ).toThrow(/DB_ENCRYPTION_ROTATION_DAYS/);
    });

    it('rejects production missing blockchain failover config', () => {
      expect(() =>
        validateEnvironment({
          ...validProduction,
          SOROBAN_RPC_FALLBACK_URL: undefined,
        }),
      ).toThrow(/SOROBAN_RPC_FALLBACK_URL/);
    });

    it('rejects weak default values for tier A deployment config', () => {
      expect(() =>
        validateEnvironment({
          ...validProduction,
          DB_ENCRYPTION_KEY: 'changeme',
        }),
      ).toThrow(/DB_ENCRYPTION_KEY must not use a weak\/default value/);
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

    it('rejects production missing DEFAULT_ARBITER_ADDRESS', () => {
      expect(() =>
        validateEnvironment({
          ...validProduction,
          DEFAULT_ARBITER_ADDRESS: undefined,
        }),
      ).toThrow(/DEFAULT_ARBITER_ADDRESS/);
    });

    it('rejects a malformed DEFAULT_ARBITER_ADDRESS in production', () => {
      expect(() =>
        validateEnvironment({
          ...validProduction,
          DEFAULT_ARBITER_ADDRESS: 'not-a-real-arbiter-address',
        }),
      ).toThrow(/DEFAULT_ARBITER_ADDRESS/);
    });

    it('does not require DEFAULT_ARBITER_ADDRESS in development', () => {
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

    it('accepts a valid single LOG_TRANSPORT (#1547)', () => {
      expect(() =>
        validateEnvironment({ ...validProduction, LOG_TRANSPORT: 'sentry' }),
      ).not.toThrow();
    });

    it('accepts a valid comma-separated LOG_TRANSPORT list (#1547)', () => {
      expect(() =>
        validateEnvironment({
          ...validProduction,
          LOG_TRANSPORT: 'console, sentry',
        }),
      ).not.toThrow();
    });

    it('rejects an unknown LOG_TRANSPORT name, catching a typo at startup (#1547)', () => {
      expect(() =>
        validateEnvironment({ ...validProduction, LOG_TRANSPORT: 'sentr' }),
      ).toThrow(/LOG_TRANSPORT/);
    });
  });
});
