/**
 * Startup environment validation for production readiness.
 * Wired into ConfigModule.forRoot({ validate }) so misconfiguration fails fast.
 */

const PLACEHOLDER_SECRETS = [
  'your-super-secret-key-minimum-32-characters-long',
  'your-super-refresh-secret-key-minimum-32-characters',
  'default-encryption-key-change-in-production',
  'change_me',
  'password',
];

const INSECURE_JWT_PREFIXES = ['test-jwt', 'e2e-jwt'];

export type NodeEnv = 'development' | 'staging' | 'production' | 'test';

function isNonEmpty(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isPlaceholderSecret(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return PLACEHOLDER_SECRETS.some(
    (p) =>
      normalized === p.toLowerCase() || normalized.includes(p.toLowerCase()),
  );
}

function validateJwtSecret(
  name: string,
  value: unknown,
  errors: string[],
): void {
  if (!isNonEmpty(value)) {
    errors.push(`${name} is required`);
    return;
  }
  if (value.length < 32) {
    errors.push(`${name} must be at least 32 characters`);
  }
}

function validateSecurityEncryptionKey(
  value: unknown,
  errors: string[],
  strict: boolean,
): void {
  if (!isNonEmpty(value)) {
    if (strict) {
      errors.push('SECURITY_ENCRYPTION_KEY is required in staging/production');
    }
    return;
  }
  if (!/^[0-9a-f]{64}$/i.test(value)) {
    errors.push('SECURITY_ENCRYPTION_KEY must be 64 hexadecimal characters');
  }
  if (strict && isPlaceholderSecret(value)) {
    errors.push('SECURITY_ENCRYPTION_KEY must not use a placeholder value');
  }
}

function validateDatabase(
  config: Record<string, unknown>,
  errors: string[],
): void {
  const hasUrl = isNonEmpty(config.DATABASE_URL);
  const hasParts =
    isNonEmpty(config.DB_HOST) &&
    isNonEmpty(config.DB_USERNAME) &&
    isNonEmpty(config.DB_PASSWORD) &&
    isNonEmpty(config.DB_NAME);

  if (!hasUrl && !hasParts) {
    errors.push(
      'Database config required: set DATABASE_URL or DB_HOST, DB_USERNAME, DB_PASSWORD, and DB_NAME',
    );
  }

  if (hasUrl && !String(config.DATABASE_URL).includes('sslmode=')) {
    errors.push(
      'DATABASE_URL should include sslmode=require for managed PostgreSQL',
    );
  }
}

function validateRedis(
  config: Record<string, unknown>,
  errors: string[],
): void {
  const hasUpstash =
    isNonEmpty(config.REDIS_URL) && isNonEmpty(config.REDIS_TOKEN);
  const hasClassic =
    isNonEmpty(config.REDIS_HOST) && isNonEmpty(config.REDIS_PORT);

  if (!hasUpstash && !hasClassic) {
    errors.push(
      'Redis config required: set REDIS_URL + REDIS_TOKEN (Upstash) or REDIS_HOST + REDIS_PORT',
    );
  }
}

function validateEncryptionKeys(
  config: Record<string, unknown>,
  errors: string[],
): void {
  const keysJson = config.ENCRYPTION_KEYS;
  const keyB64 = config.ENCRYPTION_KEY_BASE64;

  if (isNonEmpty(keysJson)) {
    try {
      const parsed = JSON.parse(keysJson) as unknown;
      if (!Array.isArray(parsed) || parsed.length === 0) {
        errors.push(
          'ENCRYPTION_KEYS must be a non-empty JSON array of base64 keys',
        );
      }
    } catch {
      errors.push('ENCRYPTION_KEYS must be valid JSON');
    }
    return;
  }

  if (!isNonEmpty(keyB64)) {
    errors.push('ENCRYPTION_KEY_BASE64 or ENCRYPTION_KEYS is required');
    return;
  }

  try {
    const buf = Buffer.from(keyB64, 'base64');
    if (buf.length !== 32) {
      errors.push('ENCRYPTION_KEY_BASE64 must decode to exactly 32 bytes');
    }
  } catch {
    errors.push('ENCRYPTION_KEY_BASE64 must be valid base64');
  }
}

function validateProductionSecrets(
  config: Record<string, unknown>,
  errors: string[],
): void {
  if (
    isNonEmpty(config.JWT_SECRET) &&
    isNonEmpty(config.JWT_REFRESH_SECRET) &&
    config.JWT_SECRET === config.JWT_REFRESH_SECRET
  ) {
    errors.push('JWT_REFRESH_SECRET must differ from JWT_SECRET');
  }

  for (const key of ['JWT_SECRET', 'JWT_REFRESH_SECRET'] as const) {
    const value = config[key];
    if (!isNonEmpty(value)) {
      continue;
    }
    if (isPlaceholderSecret(value)) {
      errors.push(`${key} must not use a placeholder or example value`);
    }
    const lower = value.toLowerCase();
    if (INSECURE_JWT_PREFIXES.some((p) => lower.startsWith(p))) {
      errors.push(`${key} must not use test-only values in staging/production`);
    }
  }

  const paymentMeta = config.PAYMENT_METADATA_SECRET;
  if (isNonEmpty(paymentMeta) && isPlaceholderSecret(paymentMeta)) {
    errors.push('PAYMENT_METADATA_SECRET must not use a placeholder value');
  }
}

/**
 * Validates environment variables before the NestJS application boots.
 * @throws Error when validation fails
 */
export function validateEnvironment(
  config: Record<string, unknown>,
): Record<string, unknown> {
  const nodeEnv = (config.NODE_ENV ??
    process.env.NODE_ENV ??
    'development') as NodeEnv;
  const errors: string[] = [];

  const rateLimitKeys = [
    'RATE_LIMIT_TTL',
    'RATE_LIMIT_MAX',
    'RATE_LIMIT_AUTH_TTL',
    'RATE_LIMIT_AUTH_MAX',
    'RATE_LIMIT_STRICT_TTL',
    'RATE_LIMIT_STRICT_MAX',
  ];

  for (const key of rateLimitKeys) {
    if (!isNonEmpty(config[key])) {
      errors.push(`${key} is required`);
    }
  }

  if (nodeEnv === 'test') {
    if (errors.length > 0) {
      throw new Error(`Config validation failed:\n${errors.join('\n')}`);
    }
    return config;
  }

  validateJwtSecret('JWT_SECRET', config.JWT_SECRET, errors);
  validateJwtSecret('JWT_REFRESH_SECRET', config.JWT_REFRESH_SECRET, errors);

  const isDeployed = nodeEnv === 'production' || nodeEnv === 'staging';

  if (isDeployed) {
    validateProductionSecrets(config, errors);
    validateDatabase(config, errors);
    validateRedis(config, errors);
    validateEncryptionKeys(config, errors);
    validateSecurityEncryptionKey(config.SECURITY_ENCRYPTION_KEY, errors, true);

    if (
      nodeEnv === 'production' &&
      config.DB_SSL !== 'true' &&
      !isNonEmpty(config.DATABASE_URL)
    ) {
      errors.push(
        'DB_SSL=true is required in production when not using DATABASE_URL',
      );
    }
  } else {
    validateSecurityEncryptionKey(
      config.SECURITY_ENCRYPTION_KEY,
      errors,
      false,
    );
  }

  if (errors.length > 0) {
    throw new Error(`Config validation failed:\n${errors.join('\n')}`);
  }

  return config;
}
