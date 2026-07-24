/**
 * Startup environment validation for production readiness.
 * Wired into ConfigModule.forRoot({ validate }) so misconfiguration fails fast.
 *
 * Structure:
 * - Cross-field checks (secret placeholders, "URL or parts" style requirements,
 *   key-differs-from-key) stay as targeted functions below — they don't map
 *   cleanly onto a single-field schema and are already covered by tests.
 * - Everything else (the majority of env vars) is validated declaratively via
 *   the Joi schema in `additionalVarsSchema`, split into per-domain fragments
 *   and merged with `.concat()`.
 */

import * as Joi from 'joi';

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

// ---------------------------------------------------------------------------
// Declarative schema for the remaining env vars, grouped by domain.
// `requiredWhenDeployed` / `requiredInProduction` express tier-A requiredness
// via NODE_ENV; feature-conditional (tier B) vars use `.when()` on their
// selector var; everything else is format-checked only when present (tier C)
// or purely optional with the default the code already falls back to.
// ---------------------------------------------------------------------------

const boolString = Joi.string().valid('true', 'false');
const stellarSecretKey = Joi.string().pattern(/^S[A-Z2-7]{55}$/);
const stellarPublicKey = Joi.string().pattern(/^G[A-Z2-7]{55}$/);
const contractId = Joi.string().pattern(/^C[A-Z2-7]{55}$/);

function requiredWhenDeployed(base: Joi.StringSchema = Joi.string()) {
  return base.when('NODE_ENV', {
    is: Joi.valid('staging', 'production'),
    then: Joi.required(),
    otherwise: Joi.optional().allow(''),
  });
}

function requiredInProduction(base: Joi.StringSchema = Joi.string()) {
  return base.when('NODE_ENV', {
    is: 'production',
    then: Joi.required(),
    otherwise: Joi.optional().allow(''),
  });
}

const appSchema = Joi.object({
  PORT: Joi.number().port().default(3000),
});

const databaseExtraSchema = Joi.object({
  DB_PORT: Joi.number().port(),
  DB_TYPE: Joi.string().valid('postgres'),
  DB_SSL_REJECT_UNAUTHORIZED: boolString,
  TYPEORM_LOGGING: boolString,
  DB_POOL_MIN: Joi.number().min(0),
  DB_POOL_MAX: Joi.number().min(1),
  DB_POOL_CONNECTION_TIMEOUT: Joi.number().min(0),
  DB_POOL_IDLE_TIMEOUT: Joi.number().min(0),
  DB_POOL_SIZE: Joi.number().min(1),
  DB_LOGGING: boolString,
  DB_REPLICA_HOST: Joi.string(),
  DB_REPLICA_PORT: Joi.number().port(),
  DB_REPLICA_USERNAME: Joi.string(),
  DB_REPLICA_PASSWORD: Joi.string(),
  DB_REPLICA_NAME: Joi.string(),
  DB_REPLICATION_MAX_LAG_SECONDS: Joi.number().min(0),
  DB_ENCRYPTION_KEY: Joi.string(),
  DB_ENCRYPTION_KEY_VERSION: Joi.number().min(1),
  DB_ENCRYPTION_ROTATION_DAYS: Joi.number().min(1),
  DB_MONITORING_ENABLED: boolString,
  DB_POOL_WARNING_PERCENT: Joi.number().min(0).max(100),
  DB_POOL_CRITICAL_PERCENT: Joi.number().min(0).max(100),
  DB_QUERY_TIME_WARNING_MS: Joi.number().min(0),
  DB_QUERY_TIME_CRITICAL_MS: Joi.number().min(0),
  DB_INDEX_UNUSED_MIN_SCANS: Joi.number().min(0),
  DB_INDEX_UNUSED_MIN_SIZE_MB: Joi.number().min(0),
});

const authExtraSchema = Joi.object({
  JWT_EXPIRATION: Joi.string().pattern(/^\d+[smhd]$/),
  JWT_REFRESH_EXPIRATION: Joi.string().pattern(/^\d+[smhd]$/),
  AUTH_RATE_LIMIT_WINDOW_MS: Joi.number().min(1),
  AUTH_RATE_LIMIT_MAX_REQUESTS: Joi.number().min(1),
  MFA_REQUIRED: boolString,
});

const redisExtraSchema = Joi.object({
  REDIS_PASSWORD: Joi.string().allow(''),
  REDIS_USERNAME: Joi.string(),
  REDIS_TLS: boolString,
});

const stellarSchema = Joi.object({
  STELLAR_NETWORK: requiredWhenDeployed(Joi.string().valid('testnet', 'mainnet')),
  SOROBAN_RPC_URL: requiredWhenDeployed(Joi.string().uri()),
  STELLAR_HORIZON_URL: Joi.string().uri(),
  HORIZON_URL: Joi.string().uri(),
  STELLAR_FRIENDBOT_URL: Joi.string().uri(),
  STELLAR_BASE_FEE: Joi.number().min(0),
  STELLAR_ADMIN_SECRET_KEY: stellarSecretKey,
  SERVER_STELLAR_SECRET: stellarSecretKey,
  STELLAR_SERVER_SECRET_KEY: stellarSecretKey,
  STELLAR_ANCHOR_SECRET_KEY: stellarSecretKey,
  STELLAR_ENCRYPTION_KEY: Joi.string(),
  DEFAULT_ARBITER_ADDRESS: stellarPublicKey,
  PROTOCOL_WALLET_ADDRESS: stellarPublicKey,
  CHIOMA_CONTRACT_ID: contractId,
  ESCROW_CONTRACT_ID: contractId,
  DISPUTE_CONTRACT_ID: contractId,
  RENT_OBLIGATION_CONTRACT_ID: contractId,
  PAYMENT_PROCESSING_CONTRACT_ID: contractId,
  AGENT_REGISTRY_CONTRACT_ID: contractId,
  MIN_VOTES_REQUIRED: Joi.number().min(1),
});

const anchorSchema = Joi.object({
  ANCHOR_API_URL: Joi.string().uri(),
  ANCHOR_API_KEY: Joi.string(),
  ANCHOR_USDC_ASSET: Joi.string(),
  SUPPORTED_FIAT_CURRENCIES: Joi.string(),
});

const storageSchema = Joi.object({
  AWS_ACCESS_KEY_ID: requiredWhenDeployed(),
  AWS_SECRET_ACCESS_KEY: requiredWhenDeployed(),
  AWS_REGION: requiredWhenDeployed(),
  AWS_S3_BUCKET: requiredWhenDeployed(),
  CDN_BASE_URL: Joi.string().uri(),
  PINATA_JWT: Joi.string(),
  PINATA_GATEWAY: Joi.string(),
});

const paymentSchema = Joi.object({
  PAYMENT_GATEWAY: Joi.string().valid('mock', 'paystack', 'flutterwave').default('mock'),
  PAYSTACK_SECRET_KEY: Joi.string().when('PAYMENT_GATEWAY', {
    is: 'paystack',
    then: Joi.required(),
    otherwise: Joi.optional().allow(''),
  }),
  FLUTTERWAVE_SECRET_KEY: Joi.string().when('PAYMENT_GATEWAY', {
    is: 'flutterwave',
    then: Joi.required(),
    otherwise: Joi.optional().allow(''),
  }),
  PAYMENT_GATEWAY_TIMEOUT_MS: Joi.number().min(1),
  PAYMENT_WEBHOOK_SECRET: requiredWhenDeployed(),
});

const emailSchema = Joi.object({
  EMAIL_SERVICE: Joi.string().valid('gmail', 'smtp').default('gmail'),
  EMAIL_USER: requiredWhenDeployed(),
  EMAIL_PASSWORD: requiredWhenDeployed(),
  EMAIL_FROM: requiredWhenDeployed(),
});

const frontendSchema = Joi.object({
  FRONTEND_URL: requiredWhenDeployed(Joi.string().uri()),
  PASSWORD_RESET_URL: Joi.string().uri(),
  API_BASE_URL: requiredInProduction(Joi.string().uri()),
  CORS_ORIGINS: requiredWhenDeployed(),
  CORS_CREDENTIALS: boolString,
});

const securitySchema = Joi.object({
  SECURITY_CSRF_ENABLED: boolString,
  SECURITY_SESSION_SECRET: requiredWhenDeployed(Joi.string().min(32)),
  SECURITY_HSTS_MAX_AGE: Joi.number().min(0),
  SECURITY_CSP_ENABLED: boolString,
  SECURITY_CONTACT: Joi.string(),
  SECURITY_POLICY_URL: Joi.string().uri(),
  SECURITY_ACKNOWLEDGMENTS_URL: Joi.string().uri(),
  SECURITY_CANONICAL_URL: Joi.string().uri(),
  SECURITY_PREFERRED_LANGUAGES: Joi.string(),
  SECURITY_EXPIRES: Joi.string(),
  SECURITY_ENCRYPTION_KEYS: Joi.string(),
});

const loggingSchema = Joi.object({
  LOG_LEVEL: Joi.string().valid('debug', 'info', 'warn', 'error'),
  LOG_FORMAT: Joi.string().valid('simple', 'json'),
  LOG_SLOW_REQUEST_THRESHOLD: Joi.number().min(0),
  LOG_SKIP_PATHS: Joi.string(),
  LOG_MAX_FILES: Joi.string(),
  LOG_MAX_SIZE: Joi.string(),
  LOG_DIR: Joi.string(),
  LOG_ERROR_MAX_FILES: Joi.string(),
  LOG_REDACT_KEYS: Joi.string(),
  LOG_REDACT_MAX_DEPTH: Joi.number().min(0),
  LOG_REDACT_PLACEHOLDER: Joi.string(),
});

const monitoringSchema = Joi.object({
  SENTRY_DSN: requiredInProduction(Joi.string().uri()),
  SENTRY_ENVIRONMENT: Joi.string(),
  OTEL_ENABLED: boolString,
  OTEL_EXPORTER_OTLP_TRACES_ENDPOINT: Joi.string().uri(),
  OTEL_LOG_LEVEL: Joi.string(),
});

const healthSchema = Joi.object({
  HEALTH_CHECK_TIMEOUT: Joi.number().min(0),
  MEMORY_WARNING_THRESHOLD: Joi.number().min(0),
  MEMORY_ERROR_THRESHOLD: Joi.number().min(0),
  GRACEFUL_SHUTDOWN_TIMEOUT: Joi.number().min(0),
});

const bullQueueSchema = Joi.object({
  BULL_QUEUE_EMAIL_ATTEMPTS: Joi.number().min(0),
  BULL_QUEUE_EMAIL_BACKOFF_DELAY: Joi.number().min(0),
  BULL_QUEUE_DOCUMENTS_ATTEMPTS: Joi.number().min(0),
  BULL_QUEUE_DOCUMENTS_BACKOFF_DELAY: Joi.number().min(0),
  BULL_QUEUE_BLOCKCHAIN_ATTEMPTS: Joi.number().min(0),
  BULL_QUEUE_BLOCKCHAIN_BACKOFF_DELAY: Joi.number().min(0),
  BULL_QUEUE_DATA_SYNC_ATTEMPTS: Joi.number().min(0),
  BULL_QUEUE_DATA_SYNC_BACKOFF_DELAY: Joi.number().min(0),
  DEAD_LETTER_QUEUE_ENABLED: boolString,
  DEAD_LETTER_RETENTION_DAYS: Joi.number().min(0),
  ENABLE_CACHE_WARMING: boolString,
});

const seedSchema = Joi.object({
  ADMIN_DEFAULT_EMAIL: Joi.string().email(),
  ADMIN_DEFAULT_FIRST_NAME: Joi.string(),
  ADMIN_DEFAULT_LAST_NAME: Joi.string(),
  ADMIN_AUTO_GENERATE_PASSWORD: boolString,
  AGENT_DEFAULT_EMAIL: Joi.string().email(),
  AGENT_DEFAULT_FIRST_NAME: Joi.string(),
  AGENT_DEFAULT_LAST_NAME: Joi.string(),
  AGENT_AUTO_GENERATE_PASSWORD: boolString,
  USER_DEFAULT_EMAIL: Joi.string().email(),
  USER_DEFAULT_FIRST_NAME: Joi.string(),
  USER_DEFAULT_LAST_NAME: Joi.string(),
  USER_AUTO_GENERATE_PASSWORD: boolString,
  TENANT_DEFAULT_EMAIL: Joi.string().email(),
  TENANT_DEFAULT_FIRST_NAME: Joi.string(),
  TENANT_DEFAULT_LAST_NAME: Joi.string(),
  TENANT_AUTO_GENERATE_PASSWORD: boolString,
  LANDLORD_DEFAULT_EMAIL: Joi.string().email(),
  LANDLORD_DEFAULT_FIRST_NAME: Joi.string(),
  LANDLORD_DEFAULT_LAST_NAME: Joi.string(),
  LANDLORD_AUTO_GENERATE_PASSWORD: boolString,
});

const screeningSchema = Joi.object({
  USER_SCREENING_DEFAULT_PROVIDER: Joi.string().valid(
    'transunion_smartmove',
    'experian_connect',
  ),
  USER_SCREENING_SANDBOX_MODE: boolString,
  TENANT_SCREENING_CONSENT_TTL_DAYS: Joi.number().min(0),
  TENANT_SCREENING_REPORT_TTL_DAYS: Joi.number().min(0),
  TRANSUNION_SMARTMOVE_API_URL: Joi.string()
    .uri()
    .when('USER_SCREENING_DEFAULT_PROVIDER', {
      is: 'transunion_smartmove',
      then: Joi.required(),
      otherwise: Joi.optional(),
    }),
  TRANSUNION_SMARTMOVE_API_KEY: Joi.string().when(
    'USER_SCREENING_DEFAULT_PROVIDER',
    {
      is: 'transunion_smartmove',
      then: Joi.required(),
      otherwise: Joi.optional(),
    },
  ),
  EXPERIAN_CONNECT_API_URL: Joi.string()
    .uri()
    .when('USER_SCREENING_DEFAULT_PROVIDER', {
      is: 'experian_connect',
      then: Joi.required(),
      otherwise: Joi.optional(),
    }),
  EXPERIAN_CONNECT_API_KEY: Joi.string().when(
    'USER_SCREENING_DEFAULT_PROVIDER',
    {
      is: 'experian_connect',
      then: Joi.required(),
      otherwise: Joi.optional(),
    },
  ),
  FRAUD_HOOKS_ENABLED: boolString,
});

const oauth2Schema = Joi.object({
  OAUTH2_CLIENT_ID: Joi.string(),
  OAUTH2_CLIENT_SECRET: Joi.string(),
  OAUTH2_PROVIDER_URL: Joi.string().uri(),
  OAUTH2_REDIRECT_URI: Joi.string().uri(),
});

const openaiSchema = Joi.object({
  OPENAI_API_KEY: Joi.string(),
});

const webhookSchema = Joi.object({
  WEBHOOK_SIGNATURE_SECRET: requiredWhenDeployed(),
  ALERT_WEBHOOK_SECRET: Joi.string(),
  ALERT_ONCALL_EMAIL: Joi.string().email(),
  ALERT_ESCALATION_EMAIL: Joi.string().email(),
  ALERT_MANAGEMENT_EMAIL: Joi.string().email().allow(''),
  SLACK_ALERT_WEBHOOK_URL: Joi.string().uri().allow(''),
  ALERT_ESCALATION_MINUTES: Joi.number().min(0),
  ALERT_ESCALATION_TIER2_MINUTES: Joi.number().min(0),
  ERROR_NOTIFICATION_ENABLED: boolString,
});

const requestSizeSchema = Joi.object({
  REQUEST_SIZE_LIMIT_JSON: Joi.string(),
  REQUEST_SIZE_LIMIT_MULTIPART: Joi.string(),
  REQUEST_SIZE_LIMIT_URLENCODED: Joi.string(),
});

const responseTimeSchema = Joi.object({
  RESPONSE_TIME_ENABLED: boolString,
  RESPONSE_TIME_SLOW_THRESHOLD_MS: Joi.number().min(0),
  RESPONSE_TIME_WINDOW_SECONDS: Joi.number().min(0),
  RESPONSE_TIME_BUFFER_SIZE: Joi.number().min(0),
});

const apiVersionSchema = Joi.object({
  API_LATEST_VERSION: Joi.string(),
  API_DEPRECATION_ENABLED: boolString,
  OPENAPI_GENERATE: boolString,
});

// Business-rule constants (see common/constants/business-rules.constants.ts)
// that read an optional env var override.
const businessRuleSchema = Joi.object({
  MAX_FAILED_LOGIN_ATTEMPTS: Joi.number().min(1),
  LOCKOUT_DURATION_MINUTES: Joi.number().min(1),
  PASSWORD_RESET_TOKEN_EXPIRY_HOURS: Joi.number().min(1),
  OAUTH_STATE_EXPIRY_MINUTES: Joi.number().min(1),
  STELLAR_AUTH_CHALLENGE_EXPIRY_MINUTES: Joi.number().min(1),
  MFA_BACKUP_CODES_COUNT: Joi.number().min(1),
  BCRYPT_SALT_ROUNDS: Joi.number().min(4).max(20),
  MFA_BACKUP_CODE_SALT_ROUNDS: Joi.number().min(4).max(20),
  IP_BLOCK_DURATION_MS: Joi.number().min(0),
  BRUTE_FORCE_WINDOW_MS: Joi.number().min(0),
  BRUTE_FORCE_THRESHOLD: Joi.number().min(1),
  PER_IP_RATE_THRESHOLD: Joi.number().min(1),
  DATA_EXFILTRATION_RECORD_THRESHOLD: Joi.number().min(1),
  PROPERTY_DRAFT_EXPIRY_DAYS: Joi.number().min(1),
  DEFAULT_PAGE_SIZE: Joi.number().min(1),
  MAX_PAGE_SIZE: Joi.number().min(1),
  DISPUTE_EVIDENCE_MAX_FILE_SIZE_BYTES: Joi.number().min(1),
  STORAGE_MAX_FILE_SIZE_BYTES: Joi.number().min(1),
  STELLAR_TX_TIMEOUT_SECONDS: Joi.number().min(1).max(300),
  STELLAR_TX_EXTENDED_TIMEOUT_SECONDS: Joi.number().min(1).max(600),
  WS_SESSION_ABSOLUTE_TTL_MS: Joi.number().min(1),
  WS_SESSION_IDLE_TTL_MS: Joi.number().min(1),
  WS_MAX_CONNECTIONS_PER_USER: Joi.number().min(1),
  RENT_LATE_FEE_GRACE_PERIOD_DAYS: Joi.number().min(0),
  RENT_LATE_FEE_FLAT_RATE: Joi.number().min(0).max(1),
  RENT_LATE_FEE_DAILY_PENALTY_RATE: Joi.number().min(0).max(1),
  LOCK_SERVICE_DEFAULT_RETRIES: Joi.number().min(0),
  QUEUE_DEFAULT_JOB_ATTEMPTS: Joi.number().min(0),
  QUEUE_BLOCKCHAIN_JOB_ATTEMPTS: Joi.number().min(0),
});

const additionalVarsSchema = appSchema
  .concat(databaseExtraSchema)
  .concat(authExtraSchema)
  .concat(redisExtraSchema)
  .concat(stellarSchema)
  .concat(anchorSchema)
  .concat(storageSchema)
  .concat(paymentSchema)
  .concat(emailSchema)
  .concat(frontendSchema)
  .concat(securitySchema)
  .concat(loggingSchema)
  .concat(monitoringSchema)
  .concat(healthSchema)
  .concat(bullQueueSchema)
  .concat(seedSchema)
  .concat(screeningSchema)
  .concat(oauth2Schema)
  .concat(openaiSchema)
  .concat(webhookSchema)
  .concat(requestSizeSchema)
  .concat(responseTimeSchema)
  .concat(apiVersionSchema)
  .concat(businessRuleSchema)
  .unknown(true);

function validateAdditionalVars(
  config: Record<string, unknown>,
  nodeEnv: NodeEnv,
  errors: string[],
): void {
  // Optional vars are conventionally left blank (`KEY=`) rather than unset
  // in this project's .env files. Treat blank the same as absent so format
  // checks (patterns, uri()) don't fire on "not configured yet" values.
  const withoutBlanks = Object.fromEntries(
    Object.entries(config).filter(([, value]) => value !== ''),
  );

  const { error } = additionalVarsSchema.validate(
    { ...withoutBlanks, NODE_ENV: nodeEnv },
    { abortEarly: false, allowUnknown: true },
  );
  if (error) {
    errors.push(...error.details.map((d) => d.message));
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

  validateAdditionalVars(config, nodeEnv, errors);

  if (errors.length > 0) {
    throw new Error(`Config validation failed:\n${errors.join('\n')}`);
  }

  return config;
}
