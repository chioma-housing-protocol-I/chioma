/**
 * Compile-time type map for every environment variable read via `ConfigService`.
 *
 * `@nestjs/config`'s `ConfigService` returns `string | undefined` for any key
 * it doesn't know about, so unguarded `configService.get<T>('KEY')` calls let
 * a typo or a wrong generic type param slip past the compiler. Injecting
 * `ConfigService<EnvironmentVariables, true>` (see `AppConfigService` below)
 * gives autocomplete on valid keys and rejects unknown ones, while `get()`
 * returns the type declared here instead of whatever generic the call site
 * happened to guess.
 *
 * Every value is `string` (required) or `string | undefined` (optional)
 * because `validateEnvironment` (./env.validation.ts) returns the raw
 * `process.env`-sourced strings unchanged — it validates format/presence but
 * does not coerce numbers or booleans. Call sites are still responsible for
 * `Number(...)`/`=== 'true'` conversions, exactly as before.
 */

export type NodeEnv = 'development' | 'staging' | 'production' | 'test';

export interface EnvironmentVariables {
  // Core / app
  NODE_ENV: NodeEnv;
  PORT?: string;
  API_BASE_URL?: string;
  API_LATEST_VERSION?: string;
  API_DEPRECATION_ENABLED?: string;
  OPENAPI_GENERATE?: string;
  OPENAI_API_KEY?: string;

  // Auth / JWT
  JWT_SECRET: string;
  JWT_REFRESH_SECRET: string;
  JWT_EXPIRATION?: string;
  JWT_REFRESH_EXPIRATION?: string;
  AUTH_RATE_LIMIT_WINDOW_MS?: string;
  AUTH_RATE_LIMIT_MAX_REQUESTS?: string;
  PASSWORD_RESET_EMAIL_LIMIT?: string;
  PASSWORD_RESET_EMAIL_WINDOW_SECONDS?: string;
  PASSWORD_RESET_TOKEN_EXPIRY_HOURS?: string;
  PASSWORD_RESET_URL?: string;
  MFA_REQUIRED?: string;
  MFA_BACKUP_CODES_COUNT?: string;
  MFA_BACKUP_CODE_SALT_ROUNDS?: string;
  OAUTH_STATE_EXPIRY_MINUTES?: string;
  OAUTH2_CLIENT_ID?: string;
  OAUTH2_CLIENT_SECRET?: string;
  OAUTH2_PROVIDER_URL?: string;
  OAUTH2_REDIRECT_URI?: string;
  MAX_FAILED_LOGIN_ATTEMPTS?: string;
  LOCKOUT_DURATION_MINUTES?: string;
  BCRYPT_SALT_ROUNDS?: string;

  // Database
  DATABASE_URL?: string;
  DB_HOST?: string;
  DB_PORT?: string;
  DB_USERNAME?: string;
  DB_PASSWORD?: string;
  DB_NAME?: string;
  DB_TYPE?: string;
  DB_SSL?: string;
  DB_SSL_REJECT_UNAUTHORIZED?: string;
  DB_LOGGING?: string;
  TYPEORM_LOGGING?: string;
  DB_POOL_MIN?: string;
  DB_POOL_MAX?: string;
  DB_POOL_SIZE?: string;
  DB_POOL_CONNECTION_TIMEOUT?: string;
  DB_POOL_IDLE_TIMEOUT?: string;
  DB_POOL_WARNING_PERCENT?: string;
  DB_POOL_CRITICAL_PERCENT?: string;
  DB_QUERY_TIME_WARNING_MS?: string;
  DB_QUERY_TIME_CRITICAL_MS?: string;
  DB_INDEX_UNUSED_MIN_SCANS?: string;
  DB_INDEX_UNUSED_MIN_SIZE_MB?: string;
  DB_MONITORING_ENABLED?: string;
  DB_REPLICA_HOST?: string;
  DB_REPLICA_PORT?: string;
  DB_REPLICA_USERNAME?: string;
  DB_REPLICA_PASSWORD?: string;
  DB_REPLICA_NAME?: string;
  DB_REPLICATION_MAX_LAG_SECONDS?: string;
  DB_ENCRYPTION_KEY?: string;
  DB_ENCRYPTION_KEY_VERSION?: string;
  DB_ENCRYPTION_ROTATION_DAYS?: string;

  // Redis
  REDIS_URL?: string;
  REDIS_TOKEN?: string;
  REDIS_HOST?: string;
  REDIS_PORT?: string;
  REDIS_PASSWORD?: string;
  REDIS_USERNAME?: string;
  REDIS_TLS?: string;

  // Encryption / security
  ENCRYPTION_KEYS?: string;
  ENCRYPTION_KEY_BASE64?: string;
  SECURITY_ENCRYPTION_KEY?: string;
  SECURITY_ENCRYPTION_KEYS?: string;
  SECURITY_CSRF_ENABLED?: string;
  SECURITY_SESSION_SECRET?: string;
  SECURITY_HSTS_MAX_AGE?: string;
  SECURITY_CSP_ENABLED?: string;
  SECURITY_CONTACT?: string;
  SECURITY_POLICY_URL?: string;
  SECURITY_ACKNOWLEDGMENTS_URL?: string;
  SECURITY_CANONICAL_URL?: string;
  SECURITY_PREFERRED_LANGUAGES?: string;
  SECURITY_EXPIRES?: string;
  PAYMENT_METADATA_SECRET?: string;
  WEBHOOK_SIGNATURE_SECRET?: string;

  // Stellar / blockchain
  STELLAR_NETWORK?: string;
  SOROBAN_RPC_URL?: string;
  STELLAR_HORIZON_URL?: string;
  HORIZON_URL?: string;
  STELLAR_FRIENDBOT_URL?: string;
  STELLAR_BASE_FEE?: string;
  STELLAR_ADMIN_SECRET_KEY?: string;
  SERVER_STELLAR_SECRET?: string;
  STELLAR_SERVER_SECRET_KEY?: string;
  STELLAR_ANCHOR_SECRET_KEY?: string;
  STELLAR_ENCRYPTION_KEY?: string;
  DEFAULT_ARBITER_ADDRESS?: string;
  PROTOCOL_WALLET_ADDRESS?: string;
  CHIOMA_CONTRACT_ID?: string;
  ESCROW_CONTRACT_ID?: string;
  DISPUTE_CONTRACT_ID?: string;
  RENT_OBLIGATION_CONTRACT_ID?: string;
  PAYMENT_PROCESSING_CONTRACT_ID?: string;
  AGENT_REGISTRY_CONTRACT_ID?: string;
  MIN_VOTES_REQUIRED?: string;
  STELLAR_TX_TIMEOUT_SECONDS?: string;
  STELLAR_TX_EXTENDED_TIMEOUT_SECONDS?: string;
  STELLAR_AUTH_CHALLENGE_EXPIRY_MINUTES?: string;

  // Anchor / fiat
  ANCHOR_API_URL?: string;
  ANCHOR_API_KEY?: string;
  ANCHOR_USDC_ASSET?: string;
  SUPPORTED_FIAT_CURRENCIES?: string;

  // Storage
  AWS_ACCESS_KEY_ID?: string;
  AWS_SECRET_ACCESS_KEY?: string;
  AWS_REGION?: string;
  AWS_S3_BUCKET?: string;
  CDN_BASE_URL?: string;
  PINATA_JWT?: string;
  PINATA_GATEWAY?: string;
  STORAGE_MAX_FILE_SIZE_BYTES?: string;
  DISPUTE_EVIDENCE_MAX_FILE_SIZE_BYTES?: string;

  // Payments
  PAYMENT_GATEWAY?: string;
  PAYSTACK_SECRET_KEY?: string;
  FLUTTERWAVE_SECRET_KEY?: string;
  PAYMENT_GATEWAY_TIMEOUT_MS?: string;
  PAYMENT_WEBHOOK_SECRET?: string;

  // Email
  EMAIL_SERVICE?: string;
  EMAIL_USER?: string;
  EMAIL_PASSWORD?: string;
  EMAIL_FROM?: string;

  // Frontend / CORS
  FRONTEND_URL?: string;
  CORS_ORIGINS?: string;
  CORS_CREDENTIALS?: string;

  // Logging
  LOG_LEVEL?: string;
  LOG_FORMAT?: string;
  LOG_SLOW_REQUEST_THRESHOLD?: string;
  LOG_SKIP_PATHS?: string;
  LOG_MAX_FILES?: string;
  LOG_MAX_SIZE?: string;
  LOG_DIR?: string;
  LOG_ERROR_MAX_FILES?: string;
  LOG_REDACT_KEYS?: string;
  LOG_REDACT_MAX_DEPTH?: string;
  LOG_REDACT_PLACEHOLDER?: string;

  // Monitoring / tracing
  SENTRY_DSN?: string;
  SENTRY_ENVIRONMENT?: string;
  OTEL_ENABLED?: string;
  OTEL_EXPORTER_OTLP_TRACES_ENDPOINT?: string;
  OTEL_LOG_LEVEL?: string;

  // Health / shutdown
  HEALTH_CHECK_TIMEOUT?: string;
  MEMORY_WARNING_THRESHOLD?: string;
  MEMORY_ERROR_THRESHOLD?: string;
  GRACEFUL_SHUTDOWN_TIMEOUT?: string;

  // Queues
  BULL_QUEUE_EMAIL_ATTEMPTS?: string;
  BULL_QUEUE_EMAIL_BACKOFF_DELAY?: string;
  BULL_QUEUE_DOCUMENTS_ATTEMPTS?: string;
  BULL_QUEUE_DOCUMENTS_BACKOFF_DELAY?: string;
  BULL_QUEUE_BLOCKCHAIN_ATTEMPTS?: string;
  BULL_QUEUE_BLOCKCHAIN_BACKOFF_DELAY?: string;
  BULL_QUEUE_DATA_SYNC_ATTEMPTS?: string;
  BULL_QUEUE_DATA_SYNC_BACKOFF_DELAY?: string;
  DEAD_LETTER_QUEUE_ENABLED?: string;
  DEAD_LETTER_RETENTION_DAYS?: string;
  ENABLE_CACHE_WARMING?: string;
  QUEUE_DEFAULT_JOB_ATTEMPTS?: string;
  QUEUE_BLOCKCHAIN_JOB_ATTEMPTS?: string;
  LOCK_SERVICE_DEFAULT_RETRIES?: string;

  // Rate limiting
  RATE_LIMIT_TTL?: string;
  RATE_LIMIT_MAX?: string;
  RATE_LIMIT_AUTH_TTL?: string;
  RATE_LIMIT_AUTH_MAX?: string;
  RATE_LIMIT_STRICT_TTL?: string;
  RATE_LIMIT_STRICT_MAX?: string;

  // Seed data
  ADMIN_DEFAULT_EMAIL?: string;
  ADMIN_DEFAULT_FIRST_NAME?: string;
  ADMIN_DEFAULT_LAST_NAME?: string;
  ADMIN_AUTO_GENERATE_PASSWORD?: string;
  AGENT_DEFAULT_EMAIL?: string;
  AGENT_DEFAULT_FIRST_NAME?: string;
  AGENT_DEFAULT_LAST_NAME?: string;
  AGENT_AUTO_GENERATE_PASSWORD?: string;
  USER_DEFAULT_EMAIL?: string;
  USER_DEFAULT_FIRST_NAME?: string;
  USER_DEFAULT_LAST_NAME?: string;
  USER_AUTO_GENERATE_PASSWORD?: string;
  TENANT_DEFAULT_EMAIL?: string;
  TENANT_DEFAULT_FIRST_NAME?: string;
  TENANT_DEFAULT_LAST_NAME?: string;
  TENANT_AUTO_GENERATE_PASSWORD?: string;
  LANDLORD_DEFAULT_EMAIL?: string;
  LANDLORD_DEFAULT_FIRST_NAME?: string;
  LANDLORD_DEFAULT_LAST_NAME?: string;
  LANDLORD_AUTO_GENERATE_PASSWORD?: string;

  // Screening
  USER_SCREENING_DEFAULT_PROVIDER?: string;
  USER_SCREENING_SANDBOX_MODE?: string;
  TENANT_SCREENING_CONSENT_TTL_DAYS?: string;
  TENANT_SCREENING_REPORT_TTL_DAYS?: string;
  TRANSUNION_SMARTMOVE_API_URL?: string;
  TRANSUNION_SMARTMOVE_API_KEY?: string;
  EXPERIAN_CONNECT_API_URL?: string;
  EXPERIAN_CONNECT_API_KEY?: string;
  FRAUD_HOOKS_ENABLED?: string;

  // Webhooks / alerts
  ALERT_WEBHOOK_SECRET?: string;
  ALERT_ONCALL_EMAIL?: string;
  ALERT_ESCALATION_EMAIL?: string;
  ALERT_MANAGEMENT_EMAIL?: string;
  SLACK_ALERT_WEBHOOK_URL?: string;
  ALERT_ESCALATION_MINUTES?: string;
  ALERT_ESCALATION_TIER2_MINUTES?: string;
  ERROR_NOTIFICATION_ENABLED?: string;

  // Request / response tuning
  REQUEST_SIZE_LIMIT_JSON?: string;
  REQUEST_SIZE_LIMIT_MULTIPART?: string;
  REQUEST_SIZE_LIMIT_URLENCODED?: string;
  QUERY_MAX_DEPTH?: string;
  RESPONSE_TIME_ENABLED?: string;
  RESPONSE_TIME_SLOW_THRESHOLD_MS?: string;
  RESPONSE_TIME_WINDOW_SECONDS?: string;
  RESPONSE_TIME_BUFFER_SIZE?: string;

  // Business rules
  IP_BLOCK_DURATION_MS?: string;
  BRUTE_FORCE_WINDOW_MS?: string;
  BRUTE_FORCE_THRESHOLD?: string;
  PER_IP_RATE_THRESHOLD?: string;
  DATA_EXFILTRATION_RECORD_THRESHOLD?: string;
  PROPERTY_DRAFT_EXPIRY_DAYS?: string;
  DEFAULT_PAGE_SIZE?: string;
  MAX_PAGE_SIZE?: string;
  RENT_LATE_FEE_GRACE_PERIOD_DAYS?: string;
  RENT_LATE_FEE_FLAT_RATE?: string;
  RENT_LATE_FEE_DAILY_PENALTY_RATE?: string;
  WS_SESSION_ABSOLUTE_TTL_MS?: string;
  WS_SESSION_IDLE_TTL_MS?: string;
  WS_MAX_CONNECTIONS_PER_USER?: string;
}
